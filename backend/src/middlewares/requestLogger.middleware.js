import pool from '../config/db.js';

/**
 * Middleware factory function to capture and log incoming HTTP request telemetry into the database.
 */
export const requestLogger = (integrationId = 'HR-DB-01') => {
  return async (req, res, next) => {
    // Record start timestamp to measure request processing duration
    const start = Date.now();
    
    // Listen for the response finish event to capture final status code and response time
    res.on('finish', async () => {
      const responseTimeMs = Date.now() - start;
      const statusCode = res.statusCode;
      const endpoint = req.originalUrl || req.url;
      const errorMessage = statusCode >= 400 ? 'Error response returned' : null;

      try {
        // Insert request telemetry log record into the database table securely
        await pool.query(
          `INSERT INTO request_logs (integration_id, endpoint, status_code, response_time_ms, error_message, timestamp) 
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [integrationId, endpoint, statusCode, responseTimeMs, errorMessage]
        );
      } catch (err) {
        // Handle database logging failure gracefully without crashing the request pipeline
        console.error('Failed to log request telemetry:', err.message);
      }
    });

    // Pass control to the next middleware or route handler in the Express pipeline
    next();
  };
};