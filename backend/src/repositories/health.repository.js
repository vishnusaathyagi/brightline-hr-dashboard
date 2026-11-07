/**
 * Repository layer to query integration request logs from PostgreSQL database.
 */
import { pool } from '../utils/db.js';
import { HEALTH_CONSTANTS } from '../config/constants.js';

/**
 * Fetches log aggregates and performance metrics for all integration request logs.
 */
export const getRollingWindowMetrics = async (windowMinutes = HEALTH_CONSTANTS.ROLLING_WINDOW_MINUTES) => {
  // SQL query to calculate total requests, error counts, and p95 response time latency per integration
  const query = `
    SELECT 
      integration_id,
      COUNT(*) AS total_requests,
      COUNT(CASE WHEN status_code >= 400 THEN 1 END) AS error_count,
      PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms) AS p95_latency
    FROM request_logs
    GROUP BY integration_id;
  `;
  
  // Execute database query securely and extract rows result
  const { rows } = await pool.query(query);
  return rows;
};