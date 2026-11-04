/**
 * Standalone Dashboard Component - Acts as the primary controller for health metrics and AI insights.
 */
import { Component, OnInit, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HealthService, SystemHealthResponse, AiInsightsResponse } from '../../services/health';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class DashboardComponent implements OnInit {
  // Functional dependency injection for Angular modern standard
  private healthService = inject(HealthService);
  private destroyRef = inject(DestroyRef);

  // Component state variables
  systemStatus: string = 'LOADING';
  integrations: any[] = [];
  aiInsights: string = '';
  aiModelUsed: string = '';
  isLoadingAi: boolean = false;
  errorMessage: string = '';

  ngOnInit(): void {
    this.loadSystemHealth();
  }

  /**
   * Loads system health metrics and uses DestroyRef lifecycle to prevent memory leaks.
   */
  loadSystemHealth(): void {
    this.healthService.getSystemHealth()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response: SystemHealthResponse) => {
          if (response.success) {
            this.systemStatus = response.data.systemStatus;
            this.integrations = response.data.integrations;
            this.errorMessage = '';
          }
        },
        error: (err) => {
          this.errorMessage = 'Failed to load backend health metrics. Please check your connection.';
          this.systemStatus = 'ERROR';
        }
      });
  }

  /**
   * Fetches Gemini AI SRE insights and playbook.
   */
  fetchAiInsights(): void {
    this.isLoadingAi = true;
    this.aiInsights = '';

    this.healthService.getAiInsights()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response: AiInsightsResponse) => {
          if (response.success) {
            this.aiInsights = response.data.insights;
            this.aiModelUsed = response.data.modelUsed;
            this.isLoadingAi = false;
          }
        },
        error: (err) => {
          this.errorMessage = 'Failed to generate Gemini AI insights. Fallback models encountered an error.';
          this.isLoadingAi = false;
        }
      });
  }
}