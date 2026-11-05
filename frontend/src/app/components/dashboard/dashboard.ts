import { Component, OnInit, inject, DestroyRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs/operators';
import { HealthService } from '../../services/health';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
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
  
  // Separated error messages to prevent cross-card interference
  errorMessage: string = '';       // For system health load errors
  aiErrorMessage: string = '';     // For AI generation errors only

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

  fetchAiInsights(): void {
    this.isLoadingAi = true;
    this.aiInsights = '';
    this.aiErrorMessage = ''; // Reset only AI error message

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
          // Assign error strictly to AI section without affecting system health card
          this.aiErrorMessage = 'Server is offline or unreachable. Unable to generate Gemini AI insights at the moment.';
          this.cdRef.detectChanges();
        }
      });
  }

  /**
   * Helper function to convert Gemini markdown syntax (**bold**, ### headings, bullet points) into clean HTML
   */
  private formatMarkdown(text: string): string {
    if (!text) return '';
    return text
      .replace(/---/gim, '')
      .replace(/^### (.*$)/gim, '<h3 class="ai-heading">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="ai-heading">$1</h2>')
      // Severity status badges
      .replace(/(\*\*)?(Severity Status:)(\*\*)?\s*\[?(STABLE|HEALTHY)\]?/gim, '<strong>Severity Status:</strong> <span class="status-pill green">STABLE</span>')
      .replace(/(\*\*)?(Severity Status:)(\*\*)?\s*\[?(HIGH|CRITICAL|UNHEALTHY)\]?/gim, '<strong>Severity Status:</strong> <span class="status-pill red">HIGH</span>')
      .replace(/(\*\*)?(Severity Status:)(\*\*)?\s*\[?(MEDIUM|DEGRADED|MODERATE)\]?/gim, '<strong>Severity Status:</strong> <span class="status-pill orange">MEDIUM</span>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      .replace(/`([^`]+)`/gim, '<code class="ai-code">$1</code>')
      // 1. Convert newlines to breaks first
      .replace(/\n+/gim, '<br />')
      // 2. Remove any <br /> immediately following a heading tag (removes heading bottom gap!)
      .replace(/(<\/h[23]>)\s*(<br\s*\/?>)+/gim, '$1')
      // 3. Clean up multiple consecutive breaks
      .replace(/(<br\s*\/?>\s*){2,}/gim, '<br />');
  }
}