import pool from '../config/db.js';

export const calculateSystemHealth = async () => {
  try {
    const query = `
      SELECT 
        integration_id AS integration,
        COUNT(*) AS total_requests,
        COALESCE(AVG(response_time_ms), 0) AS avg_latency,
        COALESCE(SUM(CASE WHEN status_code >= 400 OR status_code IS NULL THEN 1 ELSE 0 END), 0) AS error_count
      FROM request_logs 
      GROUP BY integration_id;
    `;
    
    const result = await pool.query(query);
    const rows = result.rows;

    let overallSystemHealthy = true;
    const processedIntegrations = [];

    for (const row of rows) {
      // Fetch detailed individual logs for drill-down accordion view
      const logsQuery = `
        SELECT id, endpoint, status_code, response_time_ms, error_message, timestamp 
        FROM request_logs 
        WHERE integration_id = $1 
        ORDER BY timestamp DESC;
      `;
      const logsResult = await pool.query(logsQuery, [row.integration]);

      const totalRequests = parseInt(row.total_requests, 10);
      const errorCount = parseInt(row.error_count, 10);
      const errorRate = totalRequests > 0 ? parseFloat(((errorCount / totalRequests) * 100).toFixed(2)) : 0.0;
      const avgLatency = Math.round(parseFloat(row.avg_latency));

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
        integrationId: row.integration,
        name: row.integration,
        totalRequests,
        errorRate,
        p95LatencyMs: avgLatency,
        status,
        rawLogs: logsResult.rows // Detailed logs for dropdown table
      });
    }

    return {
      systemStatus: overallSystemHealthy ? 'HEALTHY' : 'DEGRADED',
      timestamp: new Date().toISOString(),
      integrations: processedIntegrations
    };

  } catch (error) {
    console.error('Error calculating system health from request_logs:', error.message);
    throw error;
  }
};