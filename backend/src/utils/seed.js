import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './db.js';

// Get current file path and directory name for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Verifies and ensures the request_logs table exists in the PostgreSQL database on startup.
 */
export const seedDatabase = async () => {
  try {
    // SQL query to create request_logs table if it does not already exist
    const createLogsTableQuery = `
      CREATE TABLE IF NOT EXISTS request_logs (
          id SERIAL PRIMARY KEY,
          integration_id VARCHAR(50) NOT NULL,
          endpoint VARCHAR(255) NOT NULL,
          status_code INT NOT NULL,
          response_time_ms INT NOT NULL,
          error_message TEXT,
          timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    // Execute table creation query against the database
    await pool.query(createLogsTableQuery);
    console.log('request_logs table verified.');
  } catch (error) {
    // Log error details if database check or table creation fails
    console.error('Database check failed:', error.message);
  }
};