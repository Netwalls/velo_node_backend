import { Response } from 'express';
import { AuthRequest } from '../types';
export declare class NotificationController {
    /**
     * Get all notifications for the authenticated user.
     * Returns notifications ordered by most recent first.
     */
    static getNotifications(req: AuthRequest, res: Response): Promise<void>;
    /**
     * Mark notification as read
     */
    static markAsRead(req: AuthRequest, res: Response): Promise<void>;
    /**
     * Mark all notifications as read
     */
    static markAllAsRead(req: AuthRequest, res: Response): Promise<void>;
    /**
     * Get unread notification count
     */
    static getUnreadCount(req: AuthRequest, res: Response): Promise<void>;
    /**
     * Create a swap notification
     */
    static notifySwap(req: AuthRequest, res: Response): Promise<void>;
    /**
     * Create a send money notification
     */
    static notifySendMoney(req: AuthRequest, res: Response): Promise<void>;
    /**
     * Create a receive money notification
     */
    static notifyReceiveMoney(req: AuthRequest, res: Response): Promise<void>;
    /**
     * Create a security alert notification
     */
    static notifySecurityAlert(req: AuthRequest, res: Response): Promise<void>;
    /**
     * Clear all notifications for the authenticated user
     */
    static clearAllNotifications(req: AuthRequest, res: Response): Promise<void>;
}
//# sourceMappingURL=notificationController.d.ts.map