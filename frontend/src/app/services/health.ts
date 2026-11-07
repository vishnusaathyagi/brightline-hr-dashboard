/**
 * Service to interact with backend health telemetry and AI insights endpoints.
 * Built for Angular modern standalone architecture.
 */
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

// Interface definitions for strict TypeScript typing of system health response data
export interface SystemHealthResponse {
  success: boolean;
  data: {
    systemStatus: string;
    timestamp: string;
    integrations: Array<{
      integrationId: string;
      totalRequests: number;
      errorRate: number;
      p95LatencyMs: number;
      status: string;
    }>;
  };
}

// Interface definitions for strict TypeScript typing of AI insights response data
export interface AiInsightsResponse {
  success: boolean;
  data: {
    modelUsed: string;
    insights: string;
  };
}

// Health service class responsible for managing all HTTP communication with the backend APIs
@Injectable({
  providedIn: 'root' // Tells Angular to register this service as a global singleton
})
export class HealthService {
  // Modern functional dependency injection using inject()
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:5000/api';

  /**
   * Fetches real-time system health metrics from the backend endpoint.
   */
  getSystemHealth(): Observable<SystemHealthResponse> {
    return this.http.get<SystemHealthResponse>(`${this.baseUrl}/health`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Triggers Gemini AI service to fetch executive SRE insights & self-healing playbooks.
   */
  getAiInsights(): Observable<AiInsightsResponse> {
    return this.http.post<AiInsightsResponse>(`${this.baseUrl}/health/insights`, {}).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Sends the executive report summary and AI playbook to recipients via email API.
   */
  sendEmailReport(payload: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/email-report`, payload).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Centralized HTTP error handler to handle client & server failures gracefully.
   */
  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An unexpected server error occurred.';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Client Error: ${error.error.message}`;
    } else {
      errorMessage = `Server Error Code: ${error.status}, Message: ${error.message}`;
    }
    console.error('API Error Encountered:', errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}