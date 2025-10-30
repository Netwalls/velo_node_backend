"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const notificationController_1 = require("../controllers/notificationController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Get all notifications for the user
router.get('/', auth_1.authMiddleware, notificationController_1.NotificationController.getNotifications);
// Get unread notification count
router.get('/count', auth_1.authMiddleware, notificationController_1.NotificationController.getUnreadCount);
// Mark notification as read
router.patch('/:id/read', auth_1.authMiddleware, notificationController_1.NotificationController.markAsRead);
// Mark all notifications as read
router.patch('/read-all', auth_1.authMiddleware, notificationController_1.NotificationController.markAllAsRead);
// Create specific notification types
router.post('/swap', auth_1.authMiddleware, notificationController_1.NotificationController.notifySwap);
router.post('/send-money', auth_1.authMiddleware, notificationController_1.NotificationController.notifySendMoney);
router.post('/receive-money', auth_1.authMiddleware, notificationController_1.NotificationController.notifyReceiveMoney);
router.post('/security-alert', auth_1.authMiddleware, notificationController_1.NotificationController.notifySecurityAlert);
// Clear all notifications
router.delete('/clear', auth_1.authMiddleware, notificationController_1.NotificationController.clearAllNotifications);
exports.default = router;
//# sourceMappingURL=notificationRoute.js.map