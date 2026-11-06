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

  // Advanced Filter & Metrics State
  searchQuery: string = '';
  selectedStatus: string = 'ALL';
  minRequests: number | null = null;
  minErrorRate: number | null = null;
  maxLatency: number | null = null;
  startDate: string = '';
  endDate: string = '';

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

  // Enhanced Filter Logic including Requests, Error Rate, and Latency thresholds
  get filteredIntegrations(): any[] {
    return this.integrations.filter(item => {
      const matchesSearch = item.integrationId.toLowerCase().includes(this.searchQuery.toLowerCase());
      const matchesStatus = this.selectedStatus === 'ALL' || item.status === this.selectedStatus;
      const matchesRequests = this.minRequests === null || item.totalRequests >= this.minRequests;
      const matchesErrorRate = this.minErrorRate === null || item.errorRate >= this.minErrorRate;
      const matchesLatency = this.maxLatency === null || item.p95LatencyMs <= this.maxLatency;

      return matchesSearch && matchesStatus && matchesRequests && matchesErrorRate && matchesLatency;
    });
  }

  getFilteredLogs(integration: any): any[] {
    let logs = integration.rawLogs || [];

    if (this.startDate) {
      const start = new Date(this.startDate).getTime();
      logs = logs.filter((log: any) => new Date(log.timestamp).getTime() >= start);
    }

    if (this.endDate) {
      const end = new Date(this.endDate).getTime() + 86400000;
      logs = logs.filter((log: any) => new Date(log.timestamp).getTime() <= end);
    }

    return logs;
  }

  getPaginatedLogs(integration: any): any[] {
    const filteredLogs = this.getFilteredLogs(integration);
    const currentPage = this.logPages[integration.integrationId] || 1;
    const startIndex = (currentPage - 1) * this.pageSize;
    return filteredLogs.slice(startIndex, startIndex + this.pageSize);
  }

  getTotalPages(integration: any): number {
    const totalLogs = this.getFilteredLogs(integration).length;
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
    this.expandedRows = {}; // Exclusive accordion
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
    this.startDate = '';
    this.endDate = '';
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