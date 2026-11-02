import pg from 'pg';
import { ENV } from '../config/env.config.js';

const { Pool } = pg;

// Connection pool setup for database access
export const pool = new Pool({
  connectionString: ENV.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
});