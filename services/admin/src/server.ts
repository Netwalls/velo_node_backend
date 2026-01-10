import express, { Request, Response, NextFunction } from 'express';
import swaggerUi from 'swagger-ui-express';
import { env } from '../../../shared/config/env';
import { AppDataSource } from './config/database';
import { swaggerSpec } from './config/swagger';
import adminRoutes from './routes/adminRoute';
import adminRoutesV2 from './routes/adminRoutesV2';

const app = express();
app.use(express.json());

// Public health endpoint
app.get('/', (_req, res) => res.json({ status: 'ok', service: 'admin' }));

// Swagger UI - Public (for testing and documentation)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Velo Admin API Docs',
}));

// Swagger JSON spec
app.get('/api-docs.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Basic API-key middleware (applied only to /admin routes)
const apiKeyMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.header('x-admin-key') || req.query.api_key;
  const expected = env.INTERNAL_API_KEY;
  if (!apiKey || apiKey !== expected) {
    return res.status(403).json({ error: 'Invalid admin API key' });
  }
  next();
};

// Initialize database connection
AppDataSource.initialize()
  .then(() => {
    console.log('✅ Admin service - Database connected successfully');
    
    // Mount routes
    app.use('/admin', apiKeyMiddleware, adminRoutes);
    app.use('/admin/v2', apiKeyMiddleware, adminRoutesV2); // New comprehensive admin routes
    
    const PORT = Number(env.PORT || 5401);
    app.listen(PORT, () => {
      console.log(`🚀 Admin service listening on port ${PORT}`);
      console.log(`📚 Swagger docs available at http://localhost:${PORT}/api-docs`);
    });
  })
  .catch((error) => {
    console.error('❌ Admin service - Database connection failed:', error);
    process.exit(1);
  });
