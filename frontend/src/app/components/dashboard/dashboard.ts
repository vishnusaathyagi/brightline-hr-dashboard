import { Component, OnInit, inject, DestroyRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs/operators';
import { HealthService } from '../../services/health';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class DashboardComponent implements OnInit {
  private healthService = inject(HealthService);
  private destroyRef = inject(DestroyRef);
  private cdRef = inject(ChangeDetectorRef);

  systemStatus: string = 'LOADING';
  integrations: any[] = [];
  aiInsights: string = '';
  aiModelUsed: string = '';
  isLoadingHealth: boolean = true;
  isLoadingAi: boolean = false;
  
  errorMessage: string = '';
  aiErrorMessage: string = '';

  // Filter State
  searchQuery: string = '';
  selectedStatus: string = 'ALL';
  minRequests: number | null = null;
  minErrorRate: number | null = null;
  maxLatency: number | null = null;

  // Main Table Sorting State
  mainSortColumn: string = 'integrationId';
  mainSortDirection: 'asc' | 'desc' = 'asc';

  // Inner Log Table Sorting State (Per Integration ID)
  innerSortColumns: { [key: string]: string } = {};
  innerSortDirections: { [key: string]: 'asc' | 'desc' } = {};

  // Accordion & Pagination State
  expandedRows: { [key: string]: boolean } = {};
  logPages: { [key: string]: number } = {};
  pageSize: number = 5;

  ngOnInit(): void {
    this.loadSystemHealth();
  }

  loadSystemHealth(): void {
    this.isLoadingHealth = true;
    this.healthService.getSystemHealth()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.isLoadingHealth = false;
          this.cdRef.detectChanges();
        })
      )
      .subscribe({
        next: (response: any) => {
          const resData = response.data || response;
          if (response.success !== false) {
            this.systemStatus = resData.systemStatus || 'UNKNOWN';
            this.integrations = resData.integrations || [];
            
            this.integrations.forEach(item => {
              this.logPages[item.integrationId] = 1;
              this.innerSortColumns[item.integrationId] = 'timestamp';
              this.innerSortDirections[item.integrationId] = 'desc'; // Latest logs first by default
            });

            this.errorMessage = '';
            this.cdRef.detectChanges();
          }
        },
        error: (err) => {
          this.errorMessage = 'Failed to load backend health metrics. Please check your connection.';
          this.systemStatus = 'ERROR';
          this.cdRef.detectChanges();
        }
      });
  }

  // Sort Main Integrations Table
  sortMainTable(column: string): void {
    if (this.mainSortColumn === column) {
      this.mainSortDirection = this.mainSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.mainSortColumn = column;
      this.mainSortDirection = 'asc';
    }
    this.cdRef.detectChanges();
  }

  // Sort Inner Logs Table per Integration
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

  // Filtered & Sorted Integrations Array
  get filteredIntegrations(): any[] {
    const filtered = this.integrations.filter(item => {
      const matchesSearch = item.integrationId.toLowerCase().includes(this.searchQuery.toLowerCase());
      const matchesStatus = this.selectedStatus === 'ALL' || item.status === this.selectedStatus;
      const matchesRequests = this.minRequests === null || item.totalRequests >= this.minRequests;
      const matchesErrorRate = this.minErrorRate === null || item.errorRate >= this.minErrorRate;
      const matchesLatency = this.maxLatency === null || item.p95LatencyMs <= this.maxLatency;

      return matchesSearch && matchesStatus && matchesRequests && matchesErrorRate && matchesLatency;
    });

    // Apply Sorting
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

  // Sorted & Paginated Inner Logs
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

  getTotalPages(integration: any): number {
    const totalLogs = (integration.rawLogs || []).length;
    return Math.ceil(totalLogs / this.pageSize) || 1;
  }

  changePage(integrationId: string, page: number): void {
    const integration = this.integrations.find(item => item.integrationId === integrationId);
    if (integration && page >= 1 && page <= this.getTotalPages(integration)) {
      this.logPages[integrationId] = page;
      this.cdRef.detectChanges();
    }
  }

  toggleRow(integrationId: string): void {
    const isCurrentlyOpen = !!this.expandedRows[integrationId];
    this.expandedRows = {}; // Exclusive accordion behavior
    if (!isCurrentlyOpen) {
      this.expandedRows[integrationId] = true;
    }
    this.cdRef.detectChanges();
  }

  isRowExpanded(integrationId: string): boolean {
    return !!this.expandedRows[integrationId];
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.selectedStatus = 'ALL';
    this.minRequests = null;
    this.minErrorRate = null;
    this.maxLatency = null;
    this.cdRef.detectChanges();
  }

  fetchAiInsights(): void {
    this.isLoadingAi = true;
    this.aiInsights = '';
    this.aiErrorMessage = '';

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
          const rawInsights = resData?.insights || 'No insights returned.';
          this.aiInsights = this.formatMarkdown(rawInsights);
          this.aiModelUsed = resData?.modelUsed || 'Gemini AI';
          this.cdRef.detectChanges();
        },
        error: (err) => {
          this.aiErrorMessage = 'Server is offline or unreachable. Unable to generate Gemini AI insights at the moment.';
          this.cdRef.detectChanges();
        }
      });
  }

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