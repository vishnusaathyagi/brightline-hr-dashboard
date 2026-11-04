import pool from '../config/db.js';

/**
 * Calculates real-time system health and integration metrics from PostgreSQL request_logs.
 */
export const calculateSystemHealth = async () => {
  try {
    // 1. Fetch active integrations from database
    const integrationsQuery = `SELECT integration_id, name, endpoint_url, is_active FROM integrations WHERE is_active = true;`;
    const integrationsResult = await pool.query(integrationsQuery);
    const integrationsList = integrationsResult.rows;

    let overallSystemHealthy = true;
    const processedIntegrations = [];

    for (const integration of integrationsList) {
      // 2. Fetch live metrics from request_logs for each integration
      const metricsQuery = `
        SELECT 
          COUNT(*) AS total_requests,
          COALESCE(AVG(response_time_ms), 0) AS avg_latency,
          COALESCE(SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END), 0) AS error_count
        FROM request_logs 
        WHERE integration_id = $1 
          AND timestamp >= NOW() - INTERVAL '24 hours';
      `;
      const metricsResult = await pool.query(metricsQuery, [integration.integration_id]);
      const metrics = metricsResult.rows[0];

      const totalRequests = parseInt(metrics.total_requests, 10);
      const errorCount = parseInt(metrics.error_count, 10);
      const errorRate = totalRequests > 0 ? parseFloat(((errorCount / totalRequests) * 100).toFixed(2)) : 0.0;
      const avgLatency = Math.round(parseFloat(metrics.avg_latency));

      // Determine status based on real error rate and thresholds
      let status = 'HEALTHY';
      if (errorRate > 5.0 || avgLatency > 500) {
        status = 'DEGRADED';
        overallSystemHealthy = false;
      }
      if (errorRate > 20.0) {
        status = 'UNHEALTHY';
        overallSystemHealthy = false;
      }

      processedIntegrations.push({
        integrationId: integration.integration_id,
        name: integration.name,
        totalRequests,
        errorRate,
        p95LatencyMs: avgLatency,
        status
      });
    }

    return {
      systemStatus: overallSystemHealthy ? 'HEALTHY' : 'DEGRADED',
      timestamp: new Date().toISOString(),
      integrations: processedIntegrations
    };

  } catch (error) {
    console.error('Error calculating live system health from DB:', error.message);
    throw error; // Let controller handle or bubble up
  }
};