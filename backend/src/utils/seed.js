import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const seedDatabase = async () => {
  try {
    // Only ensure request_logs table exists
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
    await pool.query(createLogsTableQuery);
    console.log('request_logs table verified.');
  } catch (error) {
    console.error('Database check failed:', error.message);
  }
};