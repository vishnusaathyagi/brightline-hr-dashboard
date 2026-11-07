/**
 * Main application entry point for Brightline HR backend server.
 */
import express from 'express';
import cors from 'cors';
import { ENV } from './config/env.config.js';
import healthRoutes from './routes/health.routes.js';
import { requestLogger } from './middlewares/requestLogger.middleware.js';
import { seedDatabase } from './utils/seed.js';

// Initialize Express application instance
const app = express();

// Middleware setup for handling CORS headers and incoming JSON request bodies
app.use(cors());
app.use(express.json());

// Register global request telemetry logger middleware for tracking HTTP requests
app.use(requestLogger('HR-TELEMETRY-SVC'));

// Mount API health routes under the /api prefix path
app.use('/api', healthRoutes);

// Root route handler for server health sanity checks
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Brightline HR Integration Health Dashboard API is running smoothly!'
  });
});

// Configure port from environment variables with fallback to 5000
const PORT = ENV.PORT || 5000;

// Start Express server listener and execute database seeding on startup
app.listen(PORT, async () => {
  console.log(`Server is running live on port ${PORT}`);
  
  // Seed database with starter kit logs on startup
  await seedDatabase();
});