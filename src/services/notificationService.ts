import { AppDataSource } from '../config/database';
import { Notification } from '../entities/Notification';
import { NotificationType } from '../types';

export class NotificationService {
    /**
     * Create a notification for a user
     */
    static async createNotification(
        userId: string,
        type: NotificationType,
        title: string,
        message: string,
        details?: any
    ): Promise<Notification> {
        const notificationRepo = AppDataSource.getRepository(Notification);
        const notification = notificationRepo.create({
            userId,
            type,
            title,
            message,
            details,
            isRead: false,
        });
        return await notificationRepo.save(notification);
    }

    /**
     * Create login notification
     */
    static async notifyLogin(
        userId: string,
        details?: any
    ): Promise<Notification> {
        return this.createNotification(
            userId,
            NotificationType.LOGIN,
            'Login Successful',
            'You have successfully logged into your Velo account.',
            details
        );
    }

    /**
     * Create logout notification
     */
    static async notifyLogout(
        userId: string,
        details?: any
    ): Promise<Notification> {
        return this.createNotification(
            userId,
            NotificationType.LOGOUT,
            'Logout Successful',
            'You have successfully logged out of your Velo account.',
            details
        );
    }

    /**
     * Create registration notification
     */
    static async notifyRegistration(
        userId: string,
        details?: any
    ): Promise<Notification> {
        return this.createNotification(
            userId,
            NotificationType.REGISTRATION,
            'Welcome to Velo!',
            'Your account has been successfully created. Welcome to the Velo multi-chain wallet!',
            details
        );
    }

    /**
     * Create send money notification
     */
    static async notifySendMoney(
        userId: string,
        amount: string,
        currency: string,
        toAddress: string,
        txHash?: string,
        details?: any
    ): Promise<Notification> {
        return this.createNotification(
            userId,
            NotificationType.SEND_MONEY,
            'Money Sent',
            `You sent ${amount} ${currency} to ${toAddress.substring(
                0,
                10
            )}...`,
            { amount, currency, toAddress, txHash, ...details }
        );
    }

    /**
     * Create receive money notification
     */
    static async notifyReceiveMoney(
        userId: string,
        amount: string,
        currency: string,
        fromAddress: string,
        txHash?: string,
        details?: any
    ): Promise<Notification> {
        return this.createNotification(
            userId,
            NotificationType.RECEIVE_MONEY,
            'Money Received',
            `You received ${amount} ${currency} from ${fromAddress.substring(
                0,
                10
            )}...`,
            { amount, currency, fromAddress, txHash, ...details }
        );
    }

    /**
     * Create swap notification
     */
    static async notifySwap(
        userId: string,
        fromAmount: string,
        fromCurrency: string,
        toAmount: string,
        toCurrency: string,
        details?: any
    ): Promise<Notification> {
        return this.createNotification(
            userId,
            NotificationType.SWAP,
            'Swap Completed',
            `You swapped ${fromAmount} ${fromCurrency} for ${toAmount} ${toCurrency}`,
            { fromAmount, fromCurrency, toAmount, toCurrency, ...details }
        );
    }

    /**
     * Create OTP verified notification
     */
    static async notifyOTPVerified(
        userId: string,
        details?: any
    ): Promise<Notification> {
        return this.createNotification(
            userId,
            NotificationType.OTP_VERIFIED,
            'Email Verified',
            'Your email has been successfully verified.',
            details
        );
    }

    /**
     * Create security alert notification
     */
    static async notifySecurityAlert(
        userId: string,
        alertMessage: string,
        details?: any
    ): Promise<Notification> {
        return this.createNotification(
            userId,
            NotificationType.SECURITY_ALERT,
            'Security Alert',
            alertMessage,
            details
        );
    }

    /**
     * Create deposit notification
     */
    static async notifyDeposit(
        userId: string,
        amount: string,
        currency: string,
        details?: any
    ): Promise<Notification> {
        return this.createNotification(
            userId,
            NotificationType.DEPOSIT,
            'Deposit Successful',
            `Your deposit of ${amount} ${currency} has been processed.`,
            { amount, currency, ...details }
        );
    }

    /**
     * Create withdrawal notification
     */
    static async notifyWithdrawal(
        userId: string,
        amount: string,
        currency: string,
        details?: any
    ): Promise<Notification> {
        return this.createNotification(
            userId,
            NotificationType.WITHDRAWAL,
            'Withdrawal Successful',
            `Your withdrawal of ${amount} ${currency} has been processed.`,
            { amount, currency, ...details }
        );
    }
}
