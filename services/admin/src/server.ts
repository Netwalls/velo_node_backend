import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import adminRoutes from './routes/adminRoute';

dotenv.config();

const app = express();
app.use(express.json());

// Public health endpoint
app.get('/', (_req, res) => res.json({ status: 'ok', service: 'admin' }));

// Basic API-key middleware (applied only to /admin routes)
const apiKeyMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.header('x-admin-key') || req.query.api_key;
  const expected = process.env.ADMIN_API_KEY;
  if (!expected) {
    console.warn('ADMIN_API_KEY not set - rejecting admin requests');
    return res.status(403).json({ error: 'Admin API key not configured' });
  }
  if (!apiKey || apiKey !== expected) {
    return res.status(403).json({ error: 'Invalid admin API key' });
  }
  next();
};

app.use('/admin', apiKeyMiddleware, adminRoutes);

const PORT = Number(process.env.PORT || 5401);
app.listen(PORT, () => {
  console.log(`Admin service listening on port ${PORT}`);
});
