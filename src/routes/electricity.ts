// src/routes/electricity.ts
import { Router } from 'express';
import { electricityController } from '../controllers/electricityController';
import { electricityPurchaseRateLimiter } from '../controllers/electricityController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Apply authentication to all routes
router.use(authMiddleware);

// Electricity payment routes
router.post('/purchase', electricityPurchaseRateLimiter, electricityController.processElectricityPayment.bind(electricityController));
router.get('/verify-meter', electricityController.verifyMeterNumber.bind(electricityController));
router.get('/history', electricityController.getUserElectricityHistory.bind(electricityController));
router.get('/supported-options', electricityController.getSupportedOptions.bind(electricityController));
router.get('/purchase/:purchaseId', electricityController.getElectricityPayment.bind(electricityController));
router.get('/expected-amount', electricityController.getExpectedAmount.bind(electricityController));
router.get('/stats', electricityController.getUserPurchaseStats.bind(electricityController));
router.get('/security-limits', electricityController.getSecurityLimits.bind(electricityController));

export default router;