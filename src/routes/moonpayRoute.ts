import { Router } from 'express';
import MoonpayController from '../controllers/moonpayController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Create a purchase (backend initiates MoonPay hosted checkout)
router.post('/create', authMiddleware, MoonpayController.createPurchase);

// Webhook endpoint for MoonPay
router.post('/webhook', MoonpayController.moonpayWebhook);

export default router;
