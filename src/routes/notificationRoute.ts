import { Router } from 'express';
import { NotificationController } from '../controllers/notificationController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Get all notifications for the user
router.get('/', authMiddleware, NotificationController.getNotifications);

// Get unread notification count
router.get('/count', authMiddleware, NotificationController.getUnreadCount);

// Mark notification as read
router.patch('/:id/read', authMiddleware, NotificationController.markAsRead);

// Mark all notifications as read
router.patch('/read-all', authMiddleware, NotificationController.markAllAsRead);

// Create specific notification types
router.post('/swap', authMiddleware, NotificationController.notifySwap);
router.post(
    '/send-money',
    authMiddleware,
    NotificationController.notifySendMoney
);
router.post(
    '/receive-money',
    authMiddleware,
    NotificationController.notifyReceiveMoney
);
router.post(
    '/security-alert',
    authMiddleware,
    NotificationController.notifySecurityAlert
);



export default router;
