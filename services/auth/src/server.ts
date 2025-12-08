// services/auth-service/src/server.ts
import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { setupSwagger } from './config/swagger';
import { morganStream, logger } from './config/logger';
import rateLimit from 'express-rate-limit';

import { env } from '../../../shared/config/env';
import { AppDataSource } from '../src/config/database';
import { connectDB } from '../../../shared/config/database';

import authRoutes from './routes/authRoute';
import { sendError } from '../../../shared/errors/response'; // ← this is all you need

const app = express();

// ──────────────────────────────
// Security & Middleware
// ──────────────────────────────
app.use(helmet());
app.use(cors({
  origin: env.NODE_ENV === 'production'
    ? ['https://yourapp.com', 'https://app.yourapp.com']
    : '*',
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(morgan(process.env.LOG_FORMAT || 'dev', { stream: morganStream }));
// app.use(requestLogger); // optional: pretty logs with request ID

// Rate limiting — critical for auth endpoints
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per window
  // legacyHeaders: false,
  message: 'Too many requests, please try again later.',
});
app.use('/api/auth', limiter);

// ──────────────────────────────
// Health Check
// ──────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'auth-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ──────────────────────────────
// Routes
// ──────────────────────────────
app.use('/api/auth', authRoutes);

// Serve interactive docs (swagger)
setupSwagger(app);


// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ──────────────────────────────
// Global Error Handler (MUST BE LAST)
// ──────────────────────────────
// app.use(errorHandler);

// ──────────────────────────────
// Start Server
// ──────────────────────────────
const PORT = env.PORT || 4000;

async function startServer() {
  try {
    // Connect to DB first
    await connectDB(AppDataSource);

    app.listen(PORT, '0.0.0.0', () => {
      logger.info('AUTH-SERVICE RUNNING');
      logger.info(`Mode: ${env.NODE_ENV}`);
      logger.info(`Port: ${PORT}`);
      logger.info(`Health: http://localhost:${PORT}/health`);
      logger.info(`Docs: http://localhost:${PORT}/api-docs`);
      logger.info('Ready for logins, registrations, and empire-building.');
    });
  } catch (error) {
    console.error('Failed to start auth-service:', error);
    process.exit(1);
  }
}

startServer();