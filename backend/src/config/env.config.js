/**
 * Environment variables configuration reader using dotenv.
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Bulletproof dotenv loading checking both backend root and project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });

export const ENV = {
  PORT: process.env.PORT || 5000,
  DATABASE_URL: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || ''}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME || 'brightline_hr'}`,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || ''
};

if (!ENV.GEMINI_API_KEY) {
  console.warn("⚠️ WARNING: GEMINI_API_KEY is missing! Check your .env path.");
} else {
  console.log("✅ Gemini API Key loaded successfully!");
}