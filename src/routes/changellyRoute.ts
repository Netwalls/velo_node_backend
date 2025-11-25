// src/routes/changellyRoute.ts
import { Router } from 'express';
import { ChangellyController } from '../controllers/changellyController';
import { authMiddleware } from '../middleware/auth'; // ← Your existing auth

const router = Router();

// Protected route — real user ID from JWT/session
router.post('/deposit', authMiddleware, ChangellyController.createDepositOrder);

export default router;