import { Router } from 'express';
import { getHealthStatusController, getAiInsightsController } from '../controllers/health.controller.js';
import * as emailService from '../services/email.service.js';

// Initialize Express router instance for health telemetry and email routes
const router = Router();

// Route to fetch system health status and integration telemetry metrics
router.get('/health', getHealthStatusController);

// Route to trigger and fetch Gemini AI executive SRE playbooks
router.post('/health/insights', getAiInsightsController);

/**
 * Route to handle sending executive SRE reports and AI playbooks via email.
 */
router.post('/email-report', async (req, res) => {
  try {
    // Extract required parameters from request body payload
    const { recipientEmail, systemStatus, integrations, aiInsights, aiModelUsed } = req.body;
    
    // Validate if recipient email is present in payload
    if (!recipientEmail) {
      return res.status(400).json({ success: false, message: 'Recipient email is required.' });
    }
    
    // Invoke email service to dispatch the executive report email
    await emailService.sendExecutiveReportEmail(recipientEmail, systemStatus, integrations, aiInsights, aiModelUsed);
    res.json({ success: true, message: 'Executive report emailed successfully!' });
  } catch (err) {
    // Handle email dispatch failure and log error details
    console.error('Email send error:', err);
    res.status(500).json({ success: false, message: 'Failed to send email. Check SMTP credentials.' });
  }
});

export default router;