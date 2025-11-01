// Express server entry point

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { config } from './utils/config';
import { sendError, AppError } from './utils/errors';

// Routes
import customersRouter from './routes/customers';
import projectsRouter from './routes/projects';
import configRouter from './routes/config';
import filesRouter from './routes/files';
import simulationRouter from './routes/simulation';

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Ensure all responses are JSON
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});

// Health check endpoint (no auth required)
app.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'tokensim-rest-api',
      version: '1.0.0',
    },
  });
});

// API routes
app.use('/api/customers', customersRouter);
app.use('/api/customers/:customerName/projects', projectsRouter);
app.use('/api/customers/:customerName/projects/:projectId/config', configRouter);
app.use('/api/customers/:customerName/projects/:projectId', filesRouter);
app.use('/api/customers/:customerName/projects/:projectId', simulationRouter);

// 404 handler
app.use((req: Request, res: Response) => {
  sendError(res, new AppError(`Route not found: ${req.method} ${req.path}`, 404));
});

// Global error handler
app.use((err: Error | AppError, req: Request, res: Response, next: NextFunction) => {
  sendError(res, err);
});

// Start server
const PORT = config.port;

app.listen(PORT, () => {
  console.log(`🚀 TokenSim REST API server running on port ${PORT}`);
  console.log(`📁 Volume path: ${config.volumePath}`);
  console.log(`🐳 TokenSim container: ${config.tokensimContainerName}`);
  console.log(`🔐 API Token authentication: ${config.apiToken ? 'enabled' : 'disabled'}`);
});

export default app;

