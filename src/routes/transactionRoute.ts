import { Router } from 'express';
import { TransactionController } from '../controllers/transactionController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/history', authMiddleware, TransactionController.getHistory);

export default router;
