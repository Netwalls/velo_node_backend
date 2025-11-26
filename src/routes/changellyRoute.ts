// src/routes/changellyRoute.ts
import { Router } from 'express';
import { ChangellyController } from '../controllers/changellyController';
import { authMiddleware } from '../middleware/auth'; // ← Your existing auth

const router = Router();

// Protected route — real user ID from JWT/session
router.post('/deposit', authMiddleware, ChangellyController.createDepositOrder);

// Webhook endpoint for Changelly to notify order status updates
// Note: this route is intentionally left unauthenticated because the provider will call it.
router.post('/webhook', ChangellyController.changellyWebhook);

export default router;