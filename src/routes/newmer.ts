
import { authMiddleware } from '../middleware/auth';

const router = Router();


// routes/merchantRoutes.ts
import { Router } from 'express';
import { MerchantController } from '../controllers/newnew';


// Create a new payment request
router.post('/payments', authMiddleware, MerchantController.createPayment);

// Get all payments for the merchant
router.get('/payments', authMiddleware, MerchantController.getPayments);

// Get a specific payment
router.get('/payments/:paymentId', authMiddleware, MerchantController.getPaymentById);

// Manually check payment status
router.post('/payments/:paymentId/check', authMiddleware, MerchantController.checkPaymentStatus);

// Cancel a pending payment
router.post('/payments/:paymentId/cancel', authMiddleware,  MerchantController.cancelPayment);

export default router;