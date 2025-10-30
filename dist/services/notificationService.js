"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const database_1 = require("../config/database");
const Notification_1 = require("../entities/Notification");
const types_1 = require("../types");
class NotificationService {
    /**
     * Create a notification for a user
     */
    static async createNotification(userId, type, title, message, details) {
        const notificationRepo = database_1.AppDataSource.getRepository(Notification_1.Notification);
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
    static async notifyLogin(userId, details) {
        return this.createNotification(userId, types_1.NotificationType.LOGIN, 'Login Successful', 'You have successfully logged into your Velo account.', details);
    }
    /**
     * Create logout notification
     */
    static async notifyLogout(userId, details) {
        return this.createNotification(userId, types_1.NotificationType.LOGOUT, 'Logout Successful', 'You have successfully logged out of your Velo account.', details);
    }
    /**
     * Create registration notification
     */
    static async notifyRegistration(userId, details) {
        return this.createNotification(userId, types_1.NotificationType.REGISTRATION, 'Welcome to Velo!', 'Your account has been successfully created. Welcome to the Velo multi-chain wallet!', details);
    }
    /**
     * Create send money notification
     */
    static async notifySendMoney(userId, amount, currency, toAddress, txHash, details) {
        return this.createNotification(userId, types_1.NotificationType.SEND_MONEY, 'Money Sent', `You sent ${amount} ${currency} to ${toAddress.substring(0, 10)}...`, { amount, currency, toAddress, txHash, ...details });
    }
    /**
     * Create receive money notification
     */
    static async notifyReceiveMoney(userId, amount, currency, fromAddress, txHash, details) {
        return this.createNotification(userId, types_1.NotificationType.RECEIVE_MONEY, 'Money Received', `You received ${amount} ${currency} from ${fromAddress.substring(0, 10)}...`, { amount, currency, fromAddress, txHash, ...details });
    }
    /**
     * Create swap notification
     */
    static async notifySwap(userId, fromAmount, fromCurrency, toAmount, toCurrency, details) {
        return this.createNotification(userId, types_1.NotificationType.SWAP, 'Swap Completed', `You swapped ${fromAmount} ${fromCurrency} for ${toAmount} ${toCurrency}`, { fromAmount, fromCurrency, toAmount, toCurrency, ...details });
    }
    /**
     * Create OTP verified notification
     */
    static async notifyOTPVerified(userId, details) {
        return this.createNotification(userId, types_1.NotificationType.OTP_VERIFIED, 'Email Verified', 'Your email has been successfully verified.', details);
    }
    /**
     * Create security alert notification
     */
    static async notifySecurityAlert(userId, alertMessage, details) {
        return this.createNotification(userId, types_1.NotificationType.SECURITY_ALERT, 'Security Alert', alertMessage, details);
    }
    /**
     * Create deposit notification
     */
    static async notifyDeposit(userId, amount, currency, details) {
        return this.createNotification(userId, types_1.NotificationType.DEPOSIT, 'Deposit Successful', `Your deposit of ${amount} ${currency} has been processed.`, { amount, currency, ...details });
    }
    /**
     * Create withdrawal notification
     */
    static async notifyWithdrawal(userId, amount, currency, details) {
        return this.createNotification(userId, types_1.NotificationType.WITHDRAWAL, 'Withdrawal Successful', `Your withdrawal of ${amount} ${currency} has been processed.`, { amount, currency, ...details });
    }
    /**
     * Create airtime purchase notification
     */
    static async notifyAirtimePurchase(userId, amount, currency, mobileNumber, network, details) {
        const title = 'Airtime Purchase Successful';
        const message = `Your airtime purchase of ${amount} ${currency} for ${mobileNumber}${network ? ` on ${network}` : ''} was successful.`;
        return this.createNotification(userId, types_1.NotificationType.AIRTIME_PURCHASE, title, message, { amount, currency, mobileNumber, network, ...details });
    }
}
exports.NotificationService = NotificationService;
//# sourceMappingURL=notificationService.js.map