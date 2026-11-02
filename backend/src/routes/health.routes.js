/**
 * Express router for system health metrics and Gemini AI insights.
 */
import { Router } from 'express';
import { getHealthStatusController, getAiInsightsController } from '../controllers/health.controller.js';

const router = Router();

// GET endpoint to fetch rolling window health metrics and status
router.get('/health', getHealthStatusController);

// POST/GET endpoint to fetch Gemini AI executive summary and self-healing playbook
router.post('/health/insights', getAiInsightsController);

export default router;