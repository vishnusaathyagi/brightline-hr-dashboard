import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './db.js';

// Get current file path and directory name for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const seedDatabase = async () => {
  try {
    // 1. Ensure request_logs table exists
    const createLogTableQuery = `
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
    await pool.query(createLogTableQuery);
    console.log('request_logs table verified.');

    // 2. Read integration_logs.json from starter_kit
    const jsonFilePath = path.join(__dirname, '../../data/starter_kit/data/integration_logs.json');
    
    if (!fs.existsSync(jsonFilePath)) {
      console.error('Integration logs JSON file not found at path:', jsonFilePath);
      return;
    }

    const rawData = fs.readFileSync(jsonFilePath, 'utf-8');
    const logs = JSON.parse(rawData);

    console.log(`Found ${logs.length} logs in JSON file. Inserting into database...`);

    // 3. Clear existing logs to prevent duplicates (optional)
    await pool.query('DELETE FROM request_logs;');

    // 4. Loop and insert each log record
    for (const log of logs) {
      const insertQuery = `
        INSERT INTO request_logs (integration_id, endpoint, status_code, response_time_ms, error_message, timestamp)
        VALUES ($1, $2, $3, $4, $5, $6)
      `;
      
      const values = [
        log.integrationId || log.integration_id,
        log.endpoint,
        log.statusCode || log.status_code,
        log.responseTimeMs || log.response_time_ms || log.response_time,
        log.errorMessage || log.error_message || null,
        log.timestamp || new Date()
      ];

      await pool.query(insertQuery, values);
    }

    console.log('Database seeded successfully with all integration logs!');
  } catch (error) {
    console.error('Database seeding failed:', error.message);
  }
};

// Execute if run directly via node
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seedDatabase().then(() => process.exit());
}