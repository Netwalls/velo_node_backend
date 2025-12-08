import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import hpp from 'hpp';
// @ts-ignore
import xss from 'xss-clean';
import { AppDataSource } from './config/database';
import { swaggerSpec } from './config/swagger';
import qrPaymentRoutes from './routes/qrPaymentRoutes';

dotenv.config();

// Extend the Express Request interface to include the userId
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

const app = express();

// Security Middleware
app.use(helmet()); // Set secure HTTP headers
app.use(hpp()); // Prevent HTTP Parameter Pollution
app.use(xss()); // Sanitize user input

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// Middleware
app.use(express.json({ limit: '10kb' })); // Limit body size


// Configure CORS for specific origins
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  // 'https://staging.yourfrontend.com'
];

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, Postman, or curl requests) in development
    if (!origin) {
      return callback(null, true);
    }

    // Check if origin is allowed
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }

    // Allow local development dynamically
    if (process.env.NODE_ENV !== 'production' && origin.startsWith('http://localhost:')) {
      return callback(null, true);
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true, // This allows cookies to be sent
  optionsSuccessStatus: 200 // For legacy browser support
};

app.use(cors(corsOptions));
app.use(morgan('dev'));

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Velo QR Payment API',
}));

// Health check
app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'qrpayment',
    timestamp: new Date().toISOString(),
    docs: '/api-docs'
  });
});

// Authentication middleware
const authenticateJWT = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      return res.status(500).send('JWT secret not configured.');
    }

    jwt.verify(token, secret, (err, user) => {
      if (err) {
        return res.sendStatus(403); // Forbidden
      }
      req.userId = (user as any).id;
      next();
    });
  } else {
    res.sendStatus(401); // Unauthorized
  }
};

// Routes
app.use('/api/qrpayment', authenticateJWT, qrPaymentRoutes);

const PORT = process.env.PORT || 3002;

// Initialize database and start server
AppDataSource.initialize()
  .then(() => {
    console.log('✅ QR Payment Service - Database connected');

    app.listen(PORT, () => {
      console.log(` QR Payment Service listening on port ${PORT}`);
      console.log(` Health check: http://localhost:${PORT}/health`);
      console.log(` API endpoint: http://localhost:${PORT}/api/qrpayment`);
    });
  })
  .catch((error) => {
    console.error(' Database connection failed:', error);
    process.exit(1);
  });

export default app;
