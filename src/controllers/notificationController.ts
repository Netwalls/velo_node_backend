import { Response } from 'express';
import { AppDataSource } from '../config/database';
import { Notification } from '../entities/Notification';
import { AuthRequest } from '../types';

export class NotificationController {
    /**
     * Get all notifications for the authenticated user.
     * Returns notifications ordered by most recent first.
     */
    static async getNotifications(
        req: AuthRequest,
        res: Response
    ): Promise<void> {
        try {
            const notificationRepo = AppDataSource.getRepository(Notification);
            const notifications = await notificationRepo.find({
                where: { userId: req.user!.id },
                order: { createdAt: 'DESC' },
            });
            res.json({ notifications });
        } catch (error) {
            console.error('Get notifications error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Create a swap notification for the authenticated user.
     * Expects swap details in req.body.details.
     * Returns the created notification.
     */
    static async notifySwap(req: AuthRequest, res: Response): Promise<void> {
        try {
            const notificationRepo = AppDataSource.getRepository(Notification);
            const { details } = req.body;
            const notification = notificationRepo.create({
                userId: req.user!.id,
                type: 'swap',
                details,
            });
            await notificationRepo.save(notification);
            res.json({ message: 'Swap notification created', notification });
        } catch (error) {
            console.error('Notify swap error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}
