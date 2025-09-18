import { Router } from 'express';
import { HistoryController } from '../controllers/historyController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Get all transactions for the user
router.get('/', authMiddleware, HistoryController.getHistory);

export default router;
