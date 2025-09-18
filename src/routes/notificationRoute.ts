import { Router } from 'express';
import { NotificationController } from '../controllers/notificationController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Get all notifications for the user
router.get('/', authMiddleware, NotificationController.getNotifications);

// Create a swap notification
router.post('/swap', authMiddleware, NotificationController.notifySwap);

export default router;
