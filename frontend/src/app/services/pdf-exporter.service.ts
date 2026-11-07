import { Injectable } from '@angular/core';

// PDF exporter service responsible for generating printable executive SRE reports via hidden iframes
@Injectable({
  providedIn: 'root'
})
export class PdfExporterService {

  /**
   * Generates and triggers browser print prompt for the SRE executive report and AI playbook in PDF format.
   */
  generateExecutiveReport(systemStatus: string, integrations: any[], aiInsights: string, aiModelUsed: string): void {
    // Create a hidden iframe element to render the printable HTML document safely
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    // Format current date and time string for report metadata
    const reportDate = new Date().toLocaleString('en-US', {
      dateStyle: 'full',
      timeStyle: 'medium'
    });

    // Detect environment source based on hostname
    const currentOrigin = window.location.origin;
    const environmentLabel = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
      ? 'Local Server (Development)' 
      : currentOrigin;

    // Calculate quick counts for executive header stats
    const totalIntegrations = integrations.length;
    const unhealthyCount = integrations.filter(i => i.status === 'UNHEALTHY' || i.status === 'ERROR' || i.status === 'CRITICAL').length;
    const degradedCount = integrations.filter(i => i.status === 'DEGRADED' || i.status === 'WARNING').length;

    // Map integration records into HTML table rows with alternating background colors and status badges
    const tableRowsHtml = integrations.map((item, index) => `
      <tr style="background-color: ${index % 2 === 0 ? '#ffffff' : '#f8fafc'};">
        <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #0f172a;">${item.integrationId}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #475569; text-align: center;">${item.totalRequests}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #475569; text-align: center;">${item.errorRate}%</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #475569; text-align: center;">${item.p95LatencyMs} ms</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: center;">
          <span style="display: inline-block; padding: 4px 10px; border-radius: 12px; font-weight: 700; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px;
            background-color: ${item.status === 'HEALTHY' || item.status === 'STABLE' ? '#dcfce7' : item.status === 'DEGRADED' || item.status === 'WARNING' ? '#fef3c7' : '#fee2e2'};
            color: ${item.status === 'HEALTHY' || item.status === 'STABLE' ? '#166534' : item.status === 'DEGRADED' || item.status === 'WARNING' ? '#92400e' : '#991b1b'};">
            ${item.status}
          </span>
        </td>
      </tr>
    `).join('');

    // Determine background color and text color for overall system status badge
    const statusBg = systemStatus === 'HEALTHY' ? '#dcfce7' : systemStatus === 'DEGRADED' ? '#fef3c7' : '#fee2e2';
    const statusColor = systemStatus === 'HEALTHY' ? '#166534' : systemStatus === 'DEGRADED' ? '#92400e' : '#991b1b';

    // Construct full HTML document template for the PDF export
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>Brightline HR - SRE Executive Report</title>
          <style>
            @page { size: A4 portrait; margin: 15mm; }
            body {
              font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
              color: #1e293b; margin: 0; padding: 0; background: #ffffff;
              -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;
            }
            .report-header {
              background: #0f172a;
              color: #ffffff;
              padding: 24px;
              border-radius: 8px;
              margin-bottom: 24px;
            }
            .report-header h1 {
              font-size: 20px;
              margin: 0 0 6px 0;
              font-weight: 700;
              letter-spacing: 0.3px;
            }
            .report-header p {
              margin: 0;
              font-size: 12px;
              color: #94a3b8;
            }
            .meta-grid {
              display: flex;
              justify-content: space-between;
              margin-top: 16px;
              padding-top: 14px;
              border-top: 1px solid rgba(255, 255, 255, 0.1);
              font-size: 11.5px;
            }
            .meta-item span {
              color: #94a3b8;
              display: block;
              font-size: 10px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 2px;
            }
            .meta-item strong {
              color: #ffffff;
              font-size: 12px;
            }
            .section-title {
              font-size: 13px;
              font-weight: 700;
              color: #0f172a;
              margin-top: 24px;
              margin-bottom: 10px;
              padding-bottom: 4px;
              border-bottom: 2px solid #e2e8f0;
              text-transform: uppercase;
              letter-spacing: 0.6px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 11.5px;
              margin-top: 6px;
              border: 1px solid #e2e8f0;
              border-radius: 6px;
              overflow: hidden;
            }
            th {
              background-color: #1e293b !important;
              color: #ffffff !important;
              text-align: left;
              padding: 10px 12px;
              font-weight: 600;
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .ai-box {
              background-color: #f8fafc !important;
              border: 1px solid #cbd5e1;
              border-left: 4px solid #2563eb !important;
              padding: 18px 20px;
              border-radius: 6px;
              margin-top: 12px;
              font-size: 12px;
              line-height: 1.6;
              color: #334155;
            }
            .model-tag {
              display: inline-block;
              background: #e0f2fe !important;
              color: #0369a1 !important;
              padding: 3px 10px;
              border-radius: 4px;
              font-weight: 600;
              font-size: 11px;
              margin-bottom: 12px;
            }
            .ai-heading {
              font-size: 13px;
              font-weight: 700;
              color: #0f172a;
              margin-top: 16px;
              margin-bottom: 6px;
              border-bottom: 1px dashed #cbd5e1;
              padding-bottom: 2px;
            }
            code.ai-code {
              background: #f1f5f9;
              padding: 2px 5px;
              border-radius: 3px;
              font-family: monospace;
              color: #be123c;
              font-size: 11px;
            }
            .status-pill-badge {
              display: inline-block;
              padding: 3px 8px;
              border-radius: 4px;
              font-weight: bold;
              font-size: 11px;
            }
          </style>
        </head>
        <body>
          
          <div class="report-header">
            <h1>Brightline HR — Enterprise SRE Executive Report</h1>
            <p>Real-time Telemetry Health Monitoring & Self-Healing Diagnostics Playbook</p>
            
            <div class="meta-grid">
              <div class="meta-item">
                <span>Generated On</span>
                <strong>${reportDate}</strong>
              </div>
              <div class="meta-item">
                <span>Environment Source</span>
                <strong>${environmentLabel}</strong>
              </div>
              <div class="meta-item">
                <span>System Status</span>
                <strong>
                  <span class="status-pill-badge" style="background-color: ${statusBg}; color: ${statusColor};">
                    ${systemStatus}
                  </span>
                </strong>
              </div>
              <div class="meta-item">
                <span>Endpoints Monitored</span>
                <strong>${totalIntegrations} Active (${unhealthyCount} Critical)</strong>
              </div>
            </div>
          </div>

          <div class="section-title">1. Integration Endpoints Telemetry Summary</div>
          <table>
            <thead>
              <tr>
                <th>Integration ID</th>
                <th style="text-align: center;">Total Requests</th>
                <th style="text-align: center;">Error Rate (%)</th>
                <th style="text-align: center;">P95 Latency (ms)</th>
                <th style="text-align: center;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${tableRowsHtml}
            </tbody>
          </table>

          <div class="section-title" style="margin-top: 28px;">2. Gemini AI Diagnostic Playbook & Self-Healing Recommendations</div>
          <div class="ai-box">
            <div class="model-tag">Powered by Model: ${aiModelUsed || 'gemini-3.5-flash-lite'}</div>
            <div class="ai-content">
              ${aiInsights}
            </div>
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.parent.document.body.removeChild(window.frameElement);
              }, 400);
            };
          </script>
        </body>
      </html>
    `;

    doc.open();
    doc.write(htmlContent);
    doc.close();
  }
}