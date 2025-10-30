"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationController = void 0;
const database_1 = require("../config/database");
const Notification_1 = require("../entities/Notification");
const notificationService_1 = require("../services/notificationService");
class NotificationController {
    /**
     * Get all notifications for the authenticated user.
     * Returns notifications ordered by most recent first.
     */
    static async getNotifications(req, res) {
        try {
            const { page = 1, limit = 20, unreadOnly = false } = req.query;
            const notificationRepo = database_1.AppDataSource.getRepository(Notification_1.Notification);
            const whereClause = { userId: req.user.id };
            if (unreadOnly === 'true') {
                whereClause.isRead = false;
            }
            const [notifications, total] = await notificationRepo.findAndCount({
                where: whereClause,
                order: { createdAt: 'DESC' },
                take: Number(limit),
                skip: (Number(page) - 1) * Number(limit),
            });
            res.json({
                notifications,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    totalPages: Math.ceil(total / Number(limit)),
                },
            });
        }
        catch (error) {
            console.error('Get notifications error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    /**
     * Mark notification as read
     */
    static async markAsRead(req, res) {
        try {
            const { id } = req.params;
            const notificationRepo = database_1.AppDataSource.getRepository(Notification_1.Notification);
            const notification = await notificationRepo.findOne({
                where: { id, userId: req.user.id },
            });
            if (!notification) {
                res.status(404).json({ error: 'Notification not found' });
                return;
            }
            notification.isRead = true;
            await notificationRepo.save(notification);
            res.json({ message: 'Notification marked as read', notification });
        }
        catch (error) {
            console.error('Mark notification as read error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    /**
     * Mark all notifications as read
     */
    static async markAllAsRead(req, res) {
        try {
            const notificationRepo = database_1.AppDataSource.getRepository(Notification_1.Notification);
            await notificationRepo.update({ userId: req.user.id, isRead: false }, { isRead: true });
            res.json({ message: 'All notifications marked as read' });
        }
        catch (error) {
            console.error('Mark all notifications as read error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    /**
     * Get unread notification count
     */
    static async getUnreadCount(req, res) {
        try {
            const notificationRepo = database_1.AppDataSource.getRepository(Notification_1.Notification);
            const count = await notificationRepo.count({
                where: { userId: req.user.id, isRead: false },
            });
            res.json({ unreadCount: count });
        }
        catch (error) {
            console.error('Get unread count error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    /**
     * Create a swap notification
     */
    static async notifySwap(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }
            const { fromAmount, fromCurrency, toAmount, toCurrency, details } = req.body;
            const notification = await notificationService_1.NotificationService.notifySwap(userId, fromAmount, fromCurrency, toAmount, toCurrency, details);
            res.json({ message: 'Swap notification created', notification });
        }
        catch (error) {
            console.error('Notify swap error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    /**
     * Create a send money notification
     */
    static async notifySendMoney(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }
            const { amount, currency, toAddress, txHash, details } = req.body;
            const notification = await notificationService_1.NotificationService.notifySendMoney(userId, amount, currency, toAddress, txHash, details);
            res.json({
                message: 'Send money notification created',
                notification,
            });
        }
        catch (error) {
            console.error('Notify send money error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    /**
     * Create a receive money notification
     */
    static async notifyReceiveMoney(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }
            const { amount, currency, fromAddress, txHash, details } = req.body;
            const notification = await notificationService_1.NotificationService.notifyReceiveMoney(userId, amount, currency, fromAddress, txHash, details);
            res.json({
                message: 'Receive money notification created',
                notification,
            });
        }
        catch (error) {
            console.error('Notify receive money error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    /**
     * Create a security alert notification
     */
    static async notifySecurityAlert(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }
            const { alertMessage, details } = req.body;
            const notification = await notificationService_1.NotificationService.notifySecurityAlert(userId, alertMessage, details);
            res.json({
                message: 'Security alert notification created',
                notification,
            });
        }
        catch (error) {
            console.error('Notify security alert error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    /**
     * Clear all notifications for the authenticated user
     */
    static async clearAllNotifications(req, res) {
        try {
            const notificationRepo = database_1.AppDataSource.getRepository(Notification_1.Notification);
            await notificationRepo.update({ userId: req.user.id }, { isArchived: true });
            res.json({ message: 'All notifications cleared' });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to clear notifications' });
        }
    }
}
exports.NotificationController = NotificationController;
//# sourceMappingURL=notificationController.js.map