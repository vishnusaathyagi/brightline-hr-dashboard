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
  private healthService = inject(HealthService);
  private destroyRef = inject(DestroyRef);

  systemStatus: string = 'LOADING';
  integrations: any[] = [];
  aiInsights: string = '';
  aiModelUsed: string = '';
  isLoadingAi: boolean = false;
  errorMessage: string = '';

  ngOnInit(): void {
    this.loadSystemHealth();
  }

  loadSystemHealth(): void {
    this.healthService.getSystemHealth()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response: any) => {
          // Handle both direct data or wrapped response structures safely
          const resData = response.data || response;
          if (response.success !== false) {
            this.systemStatus = resData.systemStatus || 'UNKNOWN';
            this.integrations = resData.integrations || [];
            this.errorMessage = '';
          }
        },
        error: (err) => {
          this.errorMessage = 'Failed to load backend health metrics. Please check your connection.';
          this.systemStatus = 'ERROR';
        }
      });
  }

  fetchAiInsights(): void {
    this.isLoadingAi = true;
    this.aiInsights = '';

    this.healthService.getAiInsights()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response: any) => {
          const resData = response.data || response;
          if (response.success !== false) {
            this.aiInsights = resData.insights || 'No insights returned.';
            this.aiModelUsed = resData.modelUsed || 'Gemini AI';
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