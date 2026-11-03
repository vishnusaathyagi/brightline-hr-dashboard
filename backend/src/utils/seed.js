/**
 * Creates the request_logs table if not exists and seeds integration logs into PostgreSQL.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const seedDatabase = async () => {
  try {
    // 1. Automatically create the table if it does not exist
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS request_logs (
        id SERIAL PRIMARY KEY,
        integration_id VARCHAR(255),
        endpoint VARCHAR(255),
        status_code INT,
        response_time_ms INT,
        error_message TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await pool.query(createTableQuery);
    console.log('Table "request_logs" checked/created successfully.');

    // 2. Locate the JSON file inside the data directory
    const dataDir = path.join(__dirname, '../../data');

    if (!fs.existsSync(dataDir)) {
      console.log(`Data directory not found at: ${dataDir}`);
      return;
    }

    const findJsonFile = (dir) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          const found = findJsonFile(fullPath);
          if (found) return found;
        } else if (entry.isFile() && entry.name.endsWith('.json')) {
          return fullPath;
        }
      }
      return null;
    };

    const jsonFilePath = findJsonFile(dataDir);

    if (!jsonFilePath) {
      console.log('No JSON file found in data folder or its sub-folders.');
      return;
    }

    console.log(`JSON file found at: ${jsonFilePath}`);

    // 3. Read and parse JSON data
    const rawData = fs.readFileSync(jsonFilePath, 'utf-8');
    const logsData = JSON.parse(rawData);
    
    const logRecords = Array.isArray(logsData) ? logsData : (logsData.logs || logsData.data || []);

    console.log(`Inserting ${logRecords.length} records into PostgreSQL database...`);

    // 4. Insert records into request_logs table
    for (const log of logRecords) {
      const query = `
        INSERT INTO request_logs (integration_id, endpoint, status_code, response_time_ms, error_message, timestamp)
        VALUES ($1, $2, $3, $4, $5, $6)
      `;
      await pool.query(query, [
        log.integration_id || log.id || 'N/A',
        log.endpoint || log.path || '/',
        log.status_code || 200,
        log.response_time_ms || log.latency || 0,
        log.error_message || log.error || null,
        log.timestamp || new Date()
      ]);
    }

    console.log('Database seeding completed successfully!');
  } catch (error) {
    console.error('Database seeding failed:', error.message);
  }
};