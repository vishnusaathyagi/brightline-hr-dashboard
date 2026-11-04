import pool from '../config/db.js';

export const requestLogger = (integrationId = 'HR-DB-01') => {
  return async (req, res, next) => {
    const start = Date.now();
    
    res.on('finish', async () => {
      const responseTimeMs = Date.now() - start;
      const statusCode = res.statusCode;
      const endpoint = req.originalUrl || req.url;
      const errorMessage = statusCode >= 400 ? 'Error response returned' : null;

      try {
        await pool.query(
          `INSERT INTO request_logs (integration_id, endpoint, status_code, response_time_ms, error_message, timestamp) 
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [integrationId, endpoint, statusCode, responseTimeMs, errorMessage]
        );
      } catch (err) {
        console.error('Failed to log request telemetry:', err.message);
      }
    });

    next();
  };
};