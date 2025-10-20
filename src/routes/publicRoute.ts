import { Router, RequestHandler } from 'express';
import AdminController from '../controllers/adminController';
import createRateLimiter from '../middleware/rateLimiter';

const router = Router();

// Conservative rate limit for public stats to prevent abuse
const publicStatsLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 30 });

// Sanitize query to avoid triggering heavy background refreshes via public endpoint
const sanitizePublicStats: RequestHandler = (req, _res, next) => {
  try {
    if (req.query && (req.query as any).refresh) {
      delete (req.query as any).refresh;
    }
    if (req.query && (req.query as any).wait) {
      delete (req.query as any).wait;
    }
  } catch {}
  next();
};

// Public stats endpoint (no auth required)
// GET /stats
router.get('/stats', publicStatsLimiter, sanitizePublicStats, AdminController.getStats);

export default router;
