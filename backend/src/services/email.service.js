import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';

/**
 * Sends the executive SRE report and AI playbook as an email attachment with styled HTML content.
 */
export async function sendExecutiveReportEmail(recipientEmail, systemStatus, integrations, aiInsights, aiModelUsed) {
  // Check if SMTP credentials are configured in backend environment variables
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error("SMTP credentials are not configured in backend .env file.");
  }

  // Create reusable nodemailer transporter using Gmail service and credentials
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  // Generate the styled executive PDF report buffer to attach to the email
  const pdfBuffer = await generateStyledPdfBuffer(systemStatus, integrations, aiInsights, aiModelUsed);

  // Format current date and time string for email body display
  const reportDate = new Date().toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  // Calculate total endpoints and critical/unhealthy endpoint counts
  const totalEndpoints = integrations.length;
  const criticalCount = integrations.filter(i => i.status === 'UNHEALTHY' || i.status === 'ERROR' || i.status === 'CRITICAL').length;

  // Define email message options including sender, recipient, styled HTML body, and PDF attachment
  const mailOptions = {
    from: `"Brightline HR SRE Operations" <${process.env.SMTP_USER}>`,
    to: recipientEmail,
    subject: `[SRE Report] Executive Telemetry & Health Summary — Status: ${systemStatus}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
        <div style="background-color: #0f172a; color: #ffffff; padding: 20px; border-radius: 6px; margin-bottom: 20px;">
          <h2 style="margin: 0 0 6px 0; font-size: 18px; font-weight: 700;">Brightline HR — SRE Executive Report</h2>
          <p style="margin: 0; font-size: 12px; color: #94a3b8;">Automated Operational Health & Telemetry Dispatch</p>
        </div>
        <p style="font-size: 14px; line-height: 1.5; color: #334155; margin-bottom: 16px;">Hello Team,</p>
        <p style="font-size: 14px; line-height: 1.5; color: #334155; margin-bottom: 16px;">
          Please find below the latest operational telemetry summary and Gemini AI diagnostic insights for the Brightline HR platform.
        </p>
        <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 14px 16px; border-radius: 4px; margin-bottom: 20px; font-size: 13px;">
          <p style="margin: 0 0 6px 0;"><strong>Generated On:</strong> ${reportDate}</p>
          <p style="margin: 0 0 6px 0;"><strong>Overall System Status:</strong> <span style="padding: 2px 8px; border-radius: 4px; font-weight: bold; background-color: ${systemStatus === 'HEALTHY' ? '#dcfce7' : systemStatus === 'DEGRADED' ? '#fef3c7' : '#fee2e2'}; color: ${systemStatus === 'HEALTHY' ? '#166534' : systemStatus === 'DEGRADED' ? '#92400e' : '#991b1b'};">${systemStatus}</span></p>
          <p style="margin: 0;"><strong>Active Endpoints Monitored:</strong> ${totalEndpoints} (${criticalCount} Critical/Unhealthy)</p>
        </div>
        <p style="font-size: 14px; line-height: 1.5; color: #334155; margin-bottom: 20px;">
          The executive report and self-healing action playbook have been securely attached as a styled PDF document.
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 11.5px; color: #64748b; text-align: center; margin: 0;">
          Brightline HR Engineering & Reliability Division &bull; Ramamurthynagar, Bengaluru
        </p>
      </div>
    `,
    attachments: [
      {
        filename: `Brightline_HR_Executive_SRE_Report_${Date.now()}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }
    ]
  };

  // Send the email using the configured transporter
  return await transporter.sendMail(mailOptions);
}

/**
 * Generates a styled PDF document buffer containing system telemetry tables and AI diagnostic playbooks using PDFKit.
 */
function generateStyledPdfBuffer(systemStatus, integrations, aiInsights, aiModelUsed) {
  return new Promise((resolve, reject) => {
    // Initialize new PDF document instance with standard A4 size and margins
    const doc = new PDFDocument({ margin: 40, size: 'A4', bufferPages: true });
    const buffers = [];

    // Collect data chunks into buffer array as PDF is generated
    doc.on('data', chunk => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', err => reject(err));

    // Render header banner background and title text at top of first page
    doc.rect(40, 40, 515, 55).fill('#0f172a');
    doc.fillColor('#ffffff').fontSize(14).font('Helvetica-Bold').text('BRIGHTLINE HR — SRE EXECUTIVE REPORT', 55, 52);
    doc.fontSize(8.5).font('Helvetica').fillColor('#94a3b8').text(`Generated: ${new Date().toLocaleString()}   |   System Status: ${systemStatus}`, 55, 72);

    doc.moveDown(3);

    // Render section title for integration telemetry summary table
    doc.fillColor('#0f172a').fontSize(11).font('Helvetica-Bold').text('1. Integration Endpoints Telemetry Summary', { underline: true });
    doc.moveDown(0.5);

    let startY = doc.y;
    // Draw table header row background and column headers
    doc.rect(40, startY, 515, 18).fill('#e2e8f0');
    doc.fillColor('#0f172a').fontSize(8).font('Helvetica-Bold');
    doc.text('Integration ID', 48, startY + 5, { width: 150 });
    doc.text('Requests', 210, startY + 5, { width: 60, align: 'center' });
    doc.text('Error Rate', 280, startY + 5, { width: 70, align: 'center' });
    doc.text('P95 Latency', 360, startY + 5, { width: 80, align: 'center' });
    doc.text('Status', 450, startY + 5, { width: 95, align: 'center' });

    doc.font('Helvetica');
    let currentY = startY + 18;

    // Iterate through integration records to render table rows with alternating background colors
    integrations.forEach((item, index) => {
      if (index % 2 === 0) {
        doc.rect(40, currentY, 515, 16).fill('#f8fafc');
      }

      doc.fillColor('#1e293b').fontSize(8);
      doc.text(item.integrationId, 48, currentY + 4, { width: 150 });
      doc.text(String(item.totalRequests), 210, currentY + 4, { width: 60, align: 'center' });
      doc.text(`${item.errorRate}%`, 280, currentY + 4, { width: 70, align: 'center' });
      doc.text(`${item.p95LatencyMs} ms`, 360, currentY + 4, { width: 80, align: 'center' });

      // Determine text color for status column based on health state
      const statusColor = item.status === 'HEALTHY' ? '#166534' : item.status === 'DEGRADED' ? '#92400e' : '#991b1b';
      doc.fillColor(statusColor).font('Helvetica-Bold').text(item.status, 450, currentY + 4, { width: 95, align: 'center' });
      doc.font('Helvetica');

      currentY += 16;
    });

    doc.moveDown(1.5);

    // Render section title and model badge for Gemini AI playbook
    doc.x = 40;
    doc.fillColor('#0f172a').fontSize(11).font('Helvetica-Bold').text('2. Gemini AI Diagnostic Playbook & Action Plan', 40, doc.y, { width: 515, underline: true });
    doc.moveDown(0.3);
    doc.fontSize(8.5).font('Helvetica-Oblique').fillColor('#0369a1').text(`Powered by AI Model: ${aiModelUsed || 'gemini-3.5-flash-lite'}`, 40, doc.y, { width: 515 });
    doc.moveDown(0.6);

    // Clean up raw HTML tags and special characters from AI insights text
    const safeAiInsights = aiInsights || '';
    const cleanAiText = safeAiInsights
      .replace(/<h[23][^>]*>(.*?)<\/h[23]>/g, '\n\n### $1\n')
      .replace(/<br\s*[\/]?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/[^\x00-\x7F]/g, '');

    const rawLines = cleanAiText.split('\n').map(l => l.trim()).filter(Boolean);

    // Iterate through cleaned lines to format and render AI playbook text into PDF pages
    rawLines.forEach(line => {
      // Check if current vertical position exceeds page height and add a new page if needed
      if (doc.y > 710) {
        doc.addPage();
        doc.x = 40;
      }

      // Format and render main section headings
      if (/^\d+\.\s+[A-Z]/.test(line) || line.startsWith('###')) {
        doc.moveDown(0.5);
        const headingTitle = line.replace(/^###\s*/, '');
        doc.rect(40, doc.y, 515, 16).fill('#f1f5f9');
        doc.fillColor('#0f172a').fontSize(9).font('Helvetica-Bold').text(headingTitle, 45, doc.y + 3, { width: 505 });
        doc.moveDown(0.4);
      } 
      // Format and render dynamic severity status colored badges
      else if (/^Severity Status:\s*(HIGH|MEDIUM|LOW)/i.test(line)) {
        doc.x = 40;
        doc.moveDown(0.2);
        
        const match = line.match(/^Severity Status:\s*(HIGH|MEDIUM|LOW)/i);
        const severityLevel = match ? match[1].toUpperCase() : 'HIGH';

        let bgColor = '#fee2e2';
        let textColor = '#991b1b';

        if (severityLevel.includes('MEDIUM')) {
          bgColor = '#fef3c7';
          textColor = '#92400e';
        } else if (severityLevel.includes('LOW')) {
          bgColor = '#dcfce7';
          textColor = '#166534';
        }

        doc.rect(40, doc.y, 150, 16).fill(bgColor);
        doc.fillColor(textColor).fontSize(8.5).font('Helvetica-Bold').text(`Severity Status: ${severityLevel}`, 45, doc.y + 3, { width: 140 });
        doc.moveDown(0.5);
      }
      // Format and render sub labels and key identifiers
      else if (/^(Problem Identified|What Problem It Creates|Quick Fix|Long-term Prevention):?/i.test(line) || (/^[^:]+:/.test(line) && line.length < 40)) {
        doc.x = 40;
        doc.moveDown(0.2);
        const cleanedLabel = line.replace(/^-\s*/, '').trim();
        doc.fillColor('#2563eb').fontSize(8.5).font('Helvetica-Bold').text(cleanedLabel, 40, doc.y, { width: 515 });
        doc.moveDown(0.2);
      }
      // Format and render bullet point lists with proper alignment
      else if (line.startsWith('-') || line.startsWith('•') || line.startsWith('*')) {
        doc.x = 40;
        const content = line.replace(/^[-•*]\s*/, '').trim();
        
        let labelMatch = content.match(/^(Greenhouse ATS & ADP Payroll|DocuSign|HR-Telemetry-SVC):\s*(.*)/i);
        if (!labelMatch) {
          labelMatch = content.match(/^(Greenhouse ATS|ADP Payroll|DocuSign|HR-Telemetry-SVC):\s*(.*)/i);
        }

        if (labelMatch) {
          const serviceName = labelMatch[1];
          const serviceText = labelMatch[2];

          doc.fillColor('#334155').fontSize(8.5).font('Helvetica').text('•  ', 48, doc.y, { continued: true, width: 507 });
          doc.fillColor('#1d4ed8').font('Helvetica-Bold').text(`${serviceName}: `, { continued: true });
          doc.fillColor('#334155').font('Helvetica').text(serviceText, { lineGap: 2, paragraphGap: 3 });
        } else {
          doc.fillColor('#334155').fontSize(8.5).font('Helvetica').text(`•  ${content}`, 48, doc.y, {
            width: 507,
            lineGap: 2,
            paragraphGap: 3
          });
        }
        doc.moveDown(0.2);
      }
      // Format and render numbered action items
      else if (/^\d+\.\s+/.test(line)) {
        doc.x = 40;
        doc.fontSize(8.5).font('Helvetica').fillColor('#334155').text(line, 55, doc.y, {
          width: 500,
          lineGap: 2,
          paragraphGap: 4,
          align: 'left'
        });
        doc.moveDown(0.2);
      }
      // Render standard text paragraphs with default styling
      else {
        doc.x = 40;
        doc.fillColor('#334155').fontSize(8.5).font('Helvetica').text(line, 40, doc.y, {
          width: 515,
          lineGap: 2,
          paragraphGap: 4,
          align: 'left'
        });
        doc.moveDown(0.2);
      }
    });

    // Add page numbers and confidentiality notice footer across all generated pages
    try {
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        doc.fontSize(7.5).fillColor('#94a3b8').font('Helvetica').text(
          `Brightline HR SRE Telemetry Platform — Confidential Executive Report (Page ${i + 1} of ${range.count})`,
          40,
          780,
          { align: 'center', width: 515 }
        );
      }
    } catch (e) {
      // Fallback in case page range buffering fails
    }

    doc.end();
  });
}