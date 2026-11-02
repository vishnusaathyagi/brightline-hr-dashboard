/**
 * Core health aggregation engine with hysteresis noise reduction for integration metrics.
 */
import { HEALTH_CONSTANTS } from '../config/constants.js';
import { getRollingWindowMetrics } from '../repositories/health.repository.js';

// In-Memory Hysteresis Cache to prevent status flapping
const stateHistoryCache = new Map();

/**
 * Calculates system health with hysteresis noise reduction.
 */
export const calculateSystemHealth = async () => {
  const rawMetrics = await getRollingWindowMetrics();
  let overallSystemStatus = HEALTH_CONSTANTS.STATUS.HEALTHY;

  const processedIntegrations = rawMetrics.map(metric => {
    const total = parseInt(metric.total_requests, 10) || 1;
    const errors = parseInt(metric.error_count, 10) || 0;
    const p95Latency = parseFloat(metric.p95_latency) || 0;
    const errorRate = (errors / total) * 100;

    let calculatedStatus = HEALTH_CONSTANTS.STATUS.HEALTHY;
    if (errorRate >= HEALTH_CONSTANTS.THRESHOLDS.UNHEALTHY_ERROR_RATE) {
      calculatedStatus = HEALTH_CONSTANTS.STATUS.UNHEALTHY;
    } else if (
      errorRate >= HEALTH_CONSTANTS.THRESHOLDS.DEGRADED_ERROR_RATE ||
      p95Latency > HEALTH_CONSTANTS.THRESHOLDS.P95_DEGRADED_LATENCY_MS
    ) {
      calculatedStatus = HEALTH_CONSTANTS.STATUS.DEGRADED;
    }

    // Apply Hysteresis Filter (Require 2 consecutive failed ticks to flag UNHEALTHY)
    const prevHistory = stateHistoryCache.get(metric.integration_id) || { consecutiveFailures: 0 };
    let finalStatus = calculatedStatus;

    if (calculatedStatus === HEALTH_CONSTANTS.STATUS.UNHEALTHY) {
      const newConsecutive = prevHistory.consecutiveFailures + 1;
      if (newConsecutive < 2) {
        finalStatus = HEALTH_CONSTANTS.STATUS.DEGRADED;
      }
      stateHistoryCache.set(metric.integration_id, { consecutiveFailures: newConsecutive });
    } else {
      stateHistoryCache.set(metric.integration_id, { consecutiveFailures: 0 });
    }

    // Worst-Case Overall Aggregation
    if (finalStatus === HEALTH_CONSTANTS.STATUS.UNHEALTHY) {
      overallSystemStatus = HEALTH_CONSTANTS.STATUS.UNHEALTHY;
    } else if (finalStatus === HEALTH_CONSTANTS.STATUS.DEGRADED && overallSystemStatus !== HEALTH_CONSTANTS.STATUS.UNHEALTHY) {
      overallSystemStatus = HEALTH_CONSTANTS.STATUS.DEGRADED;
    }

    return {
      integrationId: metric.integration_id,
      totalRequests: total,
      errorRate: parseFloat(errorRate.toFixed(2)),
      p95LatencyMs: Math.round(p95Latency),
      status: finalStatus
    };
  });

  return {
    systemStatus: overallSystemStatus,
    timestamp: new Date().toISOString(),
    integrations: processedIntegrations
  };
};