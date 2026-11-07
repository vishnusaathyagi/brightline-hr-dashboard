import pool from '../config/db.js';

/**
 * Calculates system health metrics, error rates, p95 latency, and processes drill-down logs from PostgreSQL.
 */
export const calculateSystemHealth = async () => {
  try {
    // SQL query to aggregate total requests, average latency, and error counts grouped by integration ID
    const query = `
      SELECT 
        integration_id AS integration,
        COUNT(*) AS total_requests,
        COALESCE(AVG(response_time_ms), 0) AS avg_latency,
        COALESCE(SUM(CASE WHEN status_code >= 400 OR status_code IS NULL THEN 1 ELSE 0 END), 0) AS error_count
      FROM request_logs 
      GROUP BY integration_id;
    `;
    
    // Execute aggregation query against the PostgreSQL database
    const result = await pool.query(query);
    const rows = result.rows;

    let overallSystemHealthy = true;
    const processedIntegrations = [];

    // Loop through each aggregated integration record to calculate metrics and fetch drill-down logs
    for (const row of rows) {
      // Fetch detailed individual logs for drill-down accordion view sorted by timestamp descending
      const logsQuery = `
        SELECT id, endpoint, status_code, response_time_ms, error_message, timestamp 
        FROM request_logs 
        WHERE integration_id = $1 
        ORDER BY timestamp DESC;
      `;
      const logsResult = await pool.query(logsQuery, [row.integration]);

      // Parse and compute request volumes, error percentages, and latency metrics
      const totalRequests = parseInt(row.total_requests, 10);
      const errorCount = parseInt(row.error_count, 10);
      const errorRate = totalRequests > 0 ? parseFloat(((errorCount / totalRequests) * 100).toFixed(2)) : 0.0;
      const avgLatency = Math.round(parseFloat(row.avg_latency));

      // Determine health status based on error rate and latency threshold rules
      let status = 'HEALTHY';
      if (errorRate > 5.0 || avgLatency > 500) {
        status = 'DEGRADED';
        overallSystemHealthy = false;
      }
      if (errorRate > 20.0) {
        status = 'UNHEALTHY';
        overallSystemHealthy = false;
      }

      // Push processed integration telemetry object into the array
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

    // Return final system status payload containing overall health, timestamp, and integration metrics
    return {
      systemStatus: overallSystemHealthy ? 'HEALTHY' : 'DEGRADED',
      timestamp: new Date().toISOString(),
      integrations: processedIntegrations
    };

  } catch (error) {
    // Log and throw error if database calculation fails
    console.error('Error calculating system health from request_logs:', error.message);
    throw error;
  }
};