import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const seedDatabase = async () => {
  try {
    const dataPath = path.join(__dirname, '../../starter_kit/data/integration_logs.json');
    if (!fs.existsSync(dataPath)) {
      console.log('Integration logs JSON not found, skipping seed.');
      return;
    }

    const rawData = fs.readFileSync(dataPath, 'utf-8');
    const logs = JSON.parse(rawData);

    console.log(`Seeding ${logs.length} logs into PostgreSQL database...`);

    for (const log of logs) {
      const query = `
        INSERT INTO request_logs (integration_id, endpoint, status_code, response_time_ms, error_message, timestamp)
        VALUES ($1, $2, $3, $4, $5, $6)
      `;
      await pool.query(query, [
        log.integration_id,
        log.endpoint,
        log.status_code,
        log.response_time_ms,
        log.error_message || null,
        log.timestamp || new Date()
      ]);
    }

    console.log('Database seeding completed successfully!');
  } catch (error) {
    console.error('Database seeding failed:', error.message);
  }
};