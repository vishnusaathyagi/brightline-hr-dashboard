/**
 * Main application entry point for Brightline HR backend server.
 */
import express from 'express';
import cors from 'cors';
import { ENV } from './config/env.config.js';
import healthRoutes from './routes/health.routes.js';
import { requestLogger } from './middlewares/requestLogger.middleware.js';
import { seedDatabase } from './utils/seed.js';

const app = express();

// Middleware setup
app.use(cors());
app.use(express.json());

// Register global request telemetry logger middleware
app.use(requestLogger('HR-TELEMETRY-SVC'));

// API Routes prefix
app.use('/api', healthRoutes);

// Root route for sanity check
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Brightline HR Integration Health Dashboard API is running smoothly!'
  });
});

// Start server and run database seeder
const PORT = ENV.PORT || 5000;

app.listen(PORT, async () => {
  console.log(`Server is running live on port ${PORT}`);
  
  // Seed database with starter kit logs on startup
  await seedDatabase();
});