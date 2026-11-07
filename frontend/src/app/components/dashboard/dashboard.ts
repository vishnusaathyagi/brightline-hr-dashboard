import { Component, OnInit, OnDestroy, inject, DestroyRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, switchMap, takeUntil } from 'rxjs/operators';
import { interval, Subscription, Subject } from 'rxjs';
import { HealthService } from '../../services/health';
import { PdfExporterService } from '../../services/pdf-exporter.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class DashboardComponent implements OnInit, OnDestroy {
  // Service and utility injectors for API calls, PDF exports, and UI change detection
  private healthService = inject(HealthService);
  private pdfExporter = inject(PdfExporterService);
  private destroyRef = inject(DestroyRef);
  private cdRef = inject(ChangeDetectorRef);

  // Core dashboard state variables for telemetry and system health
  systemStatus: string = 'LOADING';
  integrations: any[] = [];
  aiInsights: string = '';
  aiModelUsed: string = 'gemini-3.5-flash-lite';
  isLoadingHealth: boolean = true;
  isLoadingAi: boolean = false;
  
  errorMessage: string | null = null;
  aiErrorMessage: string | null = null;
  successNotification: string | null = null;

  // Background polling configuration states for auto-refreshing metrics
  selectedInterval: number = 10; // default 10s
  private pollingSub?: Subscription;
  private destroy$ = new Subject<void>();

  // Email report modal states for sending executive summaries
  showEmailModal: boolean = false;
  recipientEmail: string = '';
  isSendingEmail: boolean = false;
  emailSuccessMsg: string | null = null;
  emailErrorMsg: string | null = null;

  // Filter and search query states for narrowing down endpoint records
  searchQuery: string = '';
  selectedStatus: string = 'ALL';
  minRequests: number | null = null;
  minErrorRate: number | null = null;
  maxLatency: number | null = null;

  // Sorting configurations for the main telemetry table
  mainSortColumn: string = 'integrationId';
  mainSortDirection: 'asc' | 'desc' = 'asc';

  // Inner table sorting, row expansion, and pagination state trackers
  innerSortColumns: { [key: string]: string } = {};
  innerSortDirections: { [key: string]: 'asc' | 'desc' } = {};
  expandedRows: { [key: string]: boolean } = {};
  logPages: { [key: string]: number } = {};
  pageSize: number = 5;

  // Component initialization hook to load health and start polling
  ngOnInit(): void {
    this.loadSystemHealth();
    this.setupPolling(this.selectedInterval);
  }

  // Fetch live system telemetry metrics from the backend API
  loadSystemHealth(showLoader: boolean = true): void {
    // Show loading spinner if requested
    if (showLoader) {
      this.isLoadingHealth = true;
    }
    this.errorMessage = null;

    this.healthService.getSystemHealth()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          // Hide loader and trigger UI update when request completes
          this.isLoadingHealth = false;
          this.cdRef.detectChanges();
        })
      )
      .subscribe({
        next: (response: any) => {
          // Extract data safely supporting nested or flat response formats
          const resData = response.data || response;
          if (response.success !== false) {
            let rawData = [];
            let fetchedStatus = 'HEALTHY';

            if (response) {
              if (response.data && Array.isArray(response.data.integrations)) {
                rawData = response.data.integrations;
                fetchedStatus = response.data.systemStatus || 'HEALTHY';
              } else if (Array.isArray(response.integrations)) {
                rawData = response.integrations;
                fetchedStatus = response.systemStatus || 'HEALTHY';
              } else if (Array.isArray(response)) {
                rawData = response;
              }
            }

            // Map raw backend data to standard dashboard integration objects
            this.integrations = rawData.map((item: any) => ({
              integrationId: item.integrationId || item.name || 'Unknown Service',
              totalRequests: item.totalRequests || (item.rawLogs ? item.rawLogs.length : 0),
              errorRate: item.errorRate || 0,
              p95LatencyMs: item.p95LatencyMs || 0,
              status: (item.status || 'HEALTHY').toUpperCase(),
              rawLogs: item.rawLogs || item.logs || []
            }));

            // Push custom Google Workspace Directory object during initial load
            const newObject = {
              integrationId: "Google Workspace Directory",
              name: "Google Workspace Directory",
              totalRequests: 84,
              errorRate: 0.0,
              p95LatencyMs: 142,
              status: "HEALTHY",
              rawLogs: [
                { id: 1, endpoint: "/api/workspace/sync", status_code: 200, response_time_ms: 142, error_message: null, timestamp: "2026-11-07T01:30:00Z" },
                { id: 2, endpoint: "/api/workspace/sync", status_code: 200, response_time_ms: 135, error_message: null, timestamp: "2026-11-07T01:31:00Z" }
              ]
            };
            this.integrations.push(newObject);

            this.systemStatus = fetchedStatus;

            // Initialize pagination and sorting defaults for each integration row
            this.integrations.forEach(item => {
              if (!this.logPages[item.integrationId]) {
                this.logPages[item.integrationId] = 1;
              }
              if (!this.innerSortColumns[item.integrationId]) {
                this.innerSortColumns[item.integrationId] = 'timestamp';
                this.innerSortDirections[item.integrationId] = 'desc';
              }
            });

            this.errorMessage = null;

            // Display success notification banner temporarily
            this.successNotification = 'Health telemetry data loaded successfully!';
            setTimeout(() => {
              this.successNotification = null;
              this.cdRef.detectChanges();
            }, 4000);

            this.cdRef.detectChanges();
          }
        },
        error: (err: any) => {
          // Handle connection failure and display error state
          this.errorMessage = 'Failed to load backend health metrics. Please check your connection.';
          this.systemStatus = 'ERROR';
          this.cdRef.detectChanges();
        }
      });
  }

  // Manual refresh alias button handler
  fetchTelemetryData(showLoader: boolean = true): void {
    this.loadSystemHealth(showLoader);
  }

  // Handle polling interval dropdown changes
  onIntervalChange(seconds: number): void {
    this.selectedInterval = Number(seconds);
    this.setupPolling(this.selectedInterval);
  }

  // Setup background polling timer to refresh metrics periodically
  setupPolling(seconds: number): void {
    // Clear any existing timer subscription
    if (this.pollingSub) {
      this.pollingSub.unsubscribe();
    }

    // Start a new interval timer if seconds is greater than zero
    if (seconds > 0) {
      this.pollingSub = interval(seconds * 1000)
        .pipe(
          takeUntil(this.destroy$),
          switchMap(() => this.healthService.getSystemHealth())
        )
        .subscribe({
          next: (response: any) => {
            const resData = response.data || response;
            if (response.success !== false) {
              let rawData = resData.integrations || [];
              
              // Map updated integration metrics from background poll
              this.integrations = rawData.map((item: any) => ({
                integrationId: item.integrationId || item.name || 'Unknown Service',
                totalRequests: item.totalRequests || (item.rawLogs ? item.rawLogs.length : 0),
                errorRate: item.errorRate || 0,
                p95LatencyMs: item.p95LatencyMs || 0,
                status: (item.status || 'HEALTHY').toUpperCase(),
                rawLogs: item.rawLogs || item.logs || []
              }));

              // Ensure Google Workspace Directory is retained during polling refreshes
              const hasWorkspace = this.integrations.some(i => i.integrationId === "Google Workspace Directory");
              if (!hasWorkspace) {
                const newObject = {
                  integrationId: "Google Workspace Directory",
                  name: "Google Workspace Directory",
                  totalRequests: 84,
                  errorRate: 0.0,
                  p95LatencyMs: 142,
                  status: "HEALTHY",
                  rawLogs: [
                    { id: 1, endpoint: "/api/workspace/sync", status_code: 200, response_time_ms: 142, error_message: null, timestamp: "2026-11-07T01:30:00Z" },
                    { id: 2, endpoint: "/api/workspace/sync", status_code: 200, response_time_ms: 135, error_message: null, timestamp: "2026-11-07T01:31:00Z" }
                  ]
                };
                this.integrations.push(newObject);
              }

              this.systemStatus = resData.systemStatus || 'UNKNOWN';
              this.errorMessage = null;
              this.cdRef.detectChanges();
            }
          },
          error: (err: any) => {
            console.error('Auto-refresh polling error:', err);
          }
        });
    }
  }

  // Cleanup subscriptions when component is destroyed
  ngOnDestroy(): void {
    if (this.pollingSub) {
      this.pollingSub.unsubscribe();
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Trigger PDF export service for the executive summary report
  downloadPdfReport(): void {
    this.pdfExporter.generateExecutiveReport(
      this.systemStatus,
      this.filteredIntegrations,
      this.aiInsights,
      this.aiModelUsed
    );
  }

  // Open the email dispatch modal popup
  openEmailModal(): void {
    this.showEmailModal = true;
    this.recipientEmail = '';
    this.emailSuccessMsg = null;
    this.emailErrorMsg = null;
    this.cdRef.detectChanges();
  }

  // Close the email dispatch modal popup
  closeEmailModal(): void {
    this.showEmailModal = false;
    this.cdRef.detectChanges();
  }

  // Dispatch executive report and AI playbook via email API
  sendReportByEmail(): void {
    if (!this.recipientEmail) return;
    this.isSendingEmail = true;
    this.emailErrorMsg = null;
    this.emailSuccessMsg = null;
    this.cdRef.detectChanges();

    // Construct payload matching backend parameters
    const payload = {
      recipientEmail: this.recipientEmail,
      systemStatus: this.systemStatus,
      integrations: this.filteredIntegrations,
      aiInsights: this.aiInsights,
      aiModelUsed: this.aiModelUsed
    };

    this.healthService.sendEmailReport(payload)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.isSendingEmail = false;
          this.cdRef.detectChanges();
        })
      )
      .subscribe({
        next: (res: any) => {
          this.emailSuccessMsg = 'Report sent successfully to ' + this.recipientEmail;
          this.cdRef.detectChanges();
          setTimeout(() => {
            this.closeEmailModal();
            this.cdRef.detectChanges();
          }, 2000);
        },
        error: (err: any) => {
          this.emailErrorMsg = 'Failed to send email. Please verify SMTP credentials on backend.';
          this.cdRef.detectChanges();
        }
      });
  }

  // Computed getter to filter and sort integrations for the main table view
  get filteredIntegrations(): any[] {
    const filtered = this.integrations.filter(item => {
      const matchesSearch = item.integrationId?.toLowerCase().includes(this.searchQuery.toLowerCase());
      const matchesStatus = this.selectedStatus === 'ALL' || item.status === this.selectedStatus;
      const matchesRequests = this.minRequests === null || item.totalRequests >= this.minRequests;
      const matchesErrorRate = this.minErrorRate === null || item.errorRate >= this.minErrorRate;
      const matchesLatency = this.maxLatency === null || item.p95LatencyMs <= this.maxLatency;

      return matchesSearch && matchesStatus && matchesRequests && matchesErrorRate && matchesLatency;
    });

    // Sort filtered results based on active column and direction
    return filtered.sort((a, b) => {
      let valA = a[this.mainSortColumn];
      let valB = b[this.mainSortColumn];

      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      }

      if (valA < valB) return this.mainSortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return this.mainSortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  // Handle main table column sorting click events
  sortMainTable(column: string): void {
    if (this.mainSortColumn === column) {
      this.mainSortDirection = this.mainSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.mainSortColumn = column;
      this.mainSortDirection = 'asc';
    }
    this.cdRef.detectChanges();
  }

  // Handle inner log drawer table column sorting click events
  sortInnerTable(integrationId: string, column: string): void {
    const currentColumn = this.innerSortColumns[integrationId];
    let currentDir = this.innerSortDirections[integrationId] || 'asc';

    if (currentColumn === column) {
      this.innerSortDirections[integrationId] = currentDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.innerSortColumns[integrationId] = column;
      this.innerSortDirections[integrationId] = 'asc';
    }
    this.cdRef.detectChanges();
  }

  // Retrieve sorted and paginated raw logs for an expanded integration row
  getSortedAndPaginatedLogs(integration: any): any[] {
    const rawLogs = [...(integration.rawLogs || [])];
    const sortCol = this.innerSortColumns[integration.integrationId] || 'timestamp';
    const sortDir = this.innerSortDirections[integration.integrationId] || 'desc';

    rawLogs.sort((a, b) => {
      let valA = a[sortCol];
      let valB = b[sortCol];

      if (sortCol === 'timestamp') {
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
      } else if (typeof valA === 'string') {
        valA = (valA || '').toLowerCase();
        valB = (valB || '').toLowerCase();
      } else if (valA === null || valA === undefined) {
        valA = '';
      } else if (valB === null || valB === undefined) {
        valB = '';
      }

      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    const currentPage = this.logPages[integration.integrationId] || 1;
    const startIndex = (currentPage - 1) * this.pageSize;
    return rawLogs.slice(startIndex, startIndex + this.pageSize);
  }

  // Calculate total pages for inner log pagination
  getTotalPages(integration: any): number {
    const totalLogs = (integration.rawLogs || []).length;
    return Math.ceil(totalLogs / this.pageSize) || 1;
  }

  // Change current page for an integration's log drawer table
  changePage(integrationId: string, page: number): void {
    const integration = this.integrations.find(item => item.integrationId === integrationId);
    if (integration && page >= 1 && page <= this.getTotalPages(integration)) {
      this.logPages[integrationId] = page;
      this.cdRef.detectChanges();
    }
  }

  // Toggle row expansion for viewing detailed logs
  toggleRow(integrationId: string): void {
    const isCurrentlyOpen = !!this.expandedRows[integrationId];
    this.expandedRows = {}; 
    if (!isCurrentlyOpen) {
      this.expandedRows[integrationId] = true;
    }
    this.cdRef.detectChanges();
  }

  // Check if a specific integration row is currently expanded
  isRowExpanded(integrationId: string): boolean {
    return !!this.expandedRows[integrationId];
  }

  // Reset all search and metric filter inputs to default values
  resetFilters(): void {
    this.searchQuery = '';
    this.selectedStatus = 'ALL';
    this.minRequests = null;
    this.minErrorRate = null;
    this.maxLatency = null;
    this.cdRef.detectChanges();
  }

  // Request Gemini AI insights and self-healing playbook from backend
  fetchAiInsights(): void {
    this.isLoadingAi = true;
    this.aiInsights = '';
    this.aiErrorMessage = null;
    this.cdRef.detectChanges();

    this.healthService.getAiInsights()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.isLoadingAi = false;
          this.cdRef.detectChanges();
        })
      )
      .subscribe({
        next: (response: any) => {
          const resData = response?.data || response;
          const rawInsights = resData?.insights || resData?.playbook || resData?.htmlContent || 'No insights returned.';
          this.aiInsights = this.formatMarkdown(rawInsights);
          this.aiModelUsed = resData?.modelUsed || resData?.model || 'gemini-3.5-flash-lite';
          
          this.successNotification = 'Gemini AI SRE Executive Playbook generated successfully!';
          setTimeout(() => {
            this.successNotification = null;
            this.cdRef.detectChanges();
          }, 4000);

          this.cdRef.detectChanges();
        },
        error: (err: any) => {
          this.aiErrorMessage = 'Server is offline or unreachable. Unable to generate Gemini AI insights at the moment.';
          this.cdRef.detectChanges();
        }
      });
  }

  // Format raw markdown text into safe HTML strings with proper styling tags
  private formatMarkdown(text: string): string {
    if (!text) return '';
    return text
      .replace(/---/gim, '')
      .replace(/^### (.*$)/gim, '<h3 class="ai-heading">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="ai-heading">$2</h2>')
      .replace(/(\*\*)?(Severity Status:)(\*\*)?\s*\[?(STABLE|HEALTHY)\]?/gim, '<strong>Severity Status:</strong> <span class="status-pill green">STABLE</span>')
      .replace(/(\*\*)?(Severity Status:)(\*\*)?\s*\[?(HIGH|CRITICAL|UNHEALTHY)\]?/gim, '<strong>Severity Status:</strong> <span class="status-pill red">HIGH</span>')
      .replace(/(\*\*)?(Severity Status:)(\*\*)?\s*\[?(MEDIUM|DEGRADED|MODERATE)\]?/gim, '<strong>Severity Status:</strong> <span class="status-pill orange">MEDIUM</span>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      .replace(/`([^`]+)`/gim, '<code class="ai-code">$1</code>')
      .replace(/\n+/gim, '<br />')
      .replace(/(<\/h[23]>)\s*(<br\s*\/?>)+/gim, '$1')
      .replace(/(<br\s*\/?>\s*){2,}/gim, '<br />');
  }
}