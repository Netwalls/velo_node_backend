// src/routes/data.ts
import { Router } from 'express';
import { dataController } from '../controllers/dataController';
import { dataPurchaseRateLimiter } from '../controllers/dataController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Apply authentication to all routes
router.use(authMiddleware);

// Data purchase routes
router.post('/purchase', dataPurchaseRateLimiter, dataController.processDataPurchase.bind(dataController));
router.get('/plans', dataController.getDataPlans.bind(dataController));
router.get('/history', dataController.getUserDataHistory.bind(dataController));
router.get('/supported-options', dataController.getSupportedOptions.bind(dataController));
router.get('/purchase/:purchaseId', dataController.getDataPurchase.bind(dataController));
router.get('/expected-amount', dataController.getExpectedAmount.bind(dataController));
router.get('/stats', dataController.getUserPurchaseStats.bind(dataController));
router.get('/security-limits', dataController.getSecurityLimits.bind(dataController));

export default router;