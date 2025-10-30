import { Notification } from '../entities/Notification';
import { NotificationType } from '../types';
export declare class NotificationService {
    /**
     * Create a notification for a user
     */
    static createNotification(userId: string, type: NotificationType, title: string, message: string, details?: any): Promise<Notification>;
    /**
     * Create login notification
     */
    static notifyLogin(userId: string, details?: any): Promise<Notification>;
    /**
     * Create logout notification
     */
    static notifyLogout(userId: string, details?: any): Promise<Notification>;
    /**
     * Create registration notification
     */
    static notifyRegistration(userId: string, details?: any): Promise<Notification>;
    /**
     * Create send money notification
     */
    static notifySendMoney(userId: string, amount: string, currency: string, toAddress: string, txHash?: string, details?: any): Promise<Notification>;
    /**
     * Create receive money notification
     */
    static notifyReceiveMoney(userId: string, amount: string, currency: string, fromAddress: string, txHash?: string, details?: any): Promise<Notification>;
    /**
     * Create swap notification
     */
    static notifySwap(userId: string, fromAmount: string, fromCurrency: string, toAmount: string, toCurrency: string, details?: any): Promise<Notification>;
    /**
     * Create OTP verified notification
     */
    static notifyOTPVerified(userId: string, details?: any): Promise<Notification>;
    /**
     * Create security alert notification
     */
    static notifySecurityAlert(userId: string, alertMessage: string, details?: any): Promise<Notification>;
    /**
     * Create deposit notification
     */
    static notifyDeposit(userId: string, amount: string, currency: string, details?: any): Promise<Notification>;
    /**
     * Create withdrawal notification
     */
    static notifyWithdrawal(userId: string, amount: string, currency: string, details?: any): Promise<Notification>;
    /**
     * Create airtime purchase notification
     */
    static notifyAirtimePurchase(userId: string, amount: string, currency: string, mobileNumber: string, network?: string, details?: any): Promise<Notification>;
}
//# sourceMappingURL=notificationService.d.ts.map