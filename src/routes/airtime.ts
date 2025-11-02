// src/routes/airtime.ts
import { Router } from 'express';
import { airtimeController } from '../controllers/airtimeController';
import { purchaseRateLimiter } from '../controllers/airtimeController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Apply authentication to all routes
router.use(authMiddleware);

// Airtime purchase routes
router.post('/purchase', purchaseRateLimiter, airtimeController.processAirtimePurchase);
router.get('/history', airtimeController.getUserAirtimeHistory);
router.get('/supported-options', airtimeController.getSupportedOptions);
router.get('/purchase/:purchaseId', airtimeController.getAirtimePurchase);
router.get('/expected-amount', airtimeController.getExpectedAmount);

export default router;