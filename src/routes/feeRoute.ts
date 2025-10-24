import { Router } from 'express';
import { FeeController } from '../controllers/feeController';
import { authMiddleware } from '../middleware/auth';
import { adminMiddleware } from '../middleware/admin';

const router = Router();

// Public endpoints - anyone can check fee calculations
router.get('/calculate', FeeController.calculateFee);
router.post('/calculate/batch', FeeController.calculateBatchFees);
router.get('/config', FeeController.getFeeConfig);

// Protected endpoints - require authentication
router.get('/history', authMiddleware, FeeController.getFeeHistory);

// Admin endpoints - require admin privileges
router.get('/stats', authMiddleware, adminMiddleware, FeeController.getFeeStats);

export default router;
