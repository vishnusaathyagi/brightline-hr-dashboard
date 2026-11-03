/**
 * System application constants, health threshold configurations, and AI model fallback chains.
 */
export const HEALTH_CONSTANTS = {
  ROLLING_WINDOW_MINUTES: 15,
  THRESHOLDS: {
    DEGRADED_ERROR_RATE: 5.0,    // Error rate >= 5% marks as degraded
    UNHEALTHY_ERROR_RATE: 15.0,  // Error rate >= 15% marks as unhealthy
    P95_DEGRADED_LATENCY_MS: 800 // P95 latency > 800ms marks as degraded
  },
  STATUS: {
    HEALTHY: 'HEALTHY',
    DEGRADED: 'DEGRADED',
    UNHEALTHY: 'UNHEALTHY'
  }
};

export const AI_CONSTANTS = {
  MODEL_FALLBACK_CHAIN: [
    'gemini-3.8-flash',
    'gemini-3.5-flash',
    'gemini-3.1-flash'
  ]
};