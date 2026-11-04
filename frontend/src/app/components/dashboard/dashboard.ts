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
  isLoadingHealth: boolean = true; // Initial page load spinner state
  isLoadingAi: boolean = false;
  errorMessage: string = '';

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
    this.errorMessage = '';

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
          this.aiInsights = this.formatMarkdown(rawInsights); // Convert raw markdown to clean HTML tags
          this.aiModelUsed = resData?.modelUsed || 'Gemini AI';
          this.cdRef.detectChanges();
        },
        error: (err) => {
          this.errorMessage = 'Failed to generate Gemini AI insights. Fallback models encountered an error.';
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
      .replace(/^### (.*$)/gim, '<h3 class="ai-heading">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="ai-heading">$1</h2>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      .replace(/`([^`]+)`/gim, '<code class="ai-code">$1</code>')
      .replace(/\n/gim, '<br />');
  }
}