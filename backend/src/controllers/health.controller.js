/**
 * Controller layer for handling health check and AI insight endpoints.
 */
import { calculateSystemHealth } from '../services/healthEngine.service.js';
import { generateAiHealthInsights } from '../services/ai.service.js';

/**
 * Handles GET /api/health request to fetch integration health metrics.
 */
export const getHealthStatusController = async (req, res) => {
  try {
    const healthData = await calculateSystemHealth();
    return res.status(200).json({
      success: true,
      data: healthData
    });
  } catch (error) {
    console.error('Error fetching health status:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Internal server error while evaluating system health.'
    });
  }
};

/**
 * Handles POST /api/health/insights request to fetch Gemini AI playbooks.
 */
export const getAiInsightsController = async (req, res) => {
  try {
    const healthData = await calculateSystemHealth();
    const aiResult = await generateAiHealthInsights(healthData);
    
    return res.status(200).json({
      success: true,
      data: aiResult
    });
  } catch (error) {
    console.error('Error generating AI insights:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate AI insights from fallback models.'
    });
  }
};