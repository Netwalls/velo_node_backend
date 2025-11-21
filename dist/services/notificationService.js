"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const database_1 = require("../config/database");
const Notification_1 = require("../entities/Notification");
const types_1 = require("../types");
const User_1 = require("../entities/User");
const mailtrap_1 = require("../utils/mailtrap");
const registrationTemplate_1 = require("../utils/templates/registrationTemplate");
const depositTemplate_1 = require("../utils/templates/depositTemplate");
const withdrawalTemplate_1 = require("../utils/templates/withdrawalTemplate");
const purchaseTemplate_1 = require("../utils/templates/purchaseTemplate");
const purchaseFailedTemplate_1 = require("../utils/templates/purchaseFailedTemplate");
const loginTemplate_1 = require("../utils/templates/loginTemplate");
const qrPaymentTemplate_1 = require("../utils/templates/qrPaymentTemplate");
const logoutNotificationTemplate_1 = require("../utils/logoutNotificationTemplate");
const MAIL_NOTIFICATIONS_ENABLED = process.env.MAIL_NOTIFICATIONS_ENABLED !== 'false';
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
        const saved = await notificationRepo.save(notification);
        // Send an email copy for important notification types if enabled and user has email
        if (MAIL_NOTIFICATIONS_ENABLED) {
            try {
                const userRepo = database_1.AppDataSource.getRepository(User_1.User);
                const user = await userRepo.findOne({ where: { id: userId } });
                if (user && user.email) {
                    // Select template by notification type
                    let html = `<p>${message}</p>`;
                    let text = typeof message === 'string' ? message : JSON.stringify(message);
                    try {
                        switch (type) {
                            case types_1.NotificationType.REGISTRATION:
                                html = (0, registrationTemplate_1.registrationTemplate)(user.email || '');
                                break;
                            case types_1.NotificationType.DEPOSIT:
                                html = (0, depositTemplate_1.depositTemplate)(details?.amount || '', details?.currency || '', details);
                                break;
                            case types_1.NotificationType.WITHDRAWAL:
                                html = (0, withdrawalTemplate_1.withdrawalTemplate)(details?.amount || '', details?.currency || '', details);
                                break;
                            case types_1.NotificationType.AIRTIME_PURCHASE:
                            case types_1.NotificationType.DATA_PURCHASE:
                            case types_1.NotificationType.UTILITY_PAYMENT:
                                html = (0, purchaseTemplate_1.purchaseTemplate)(title, message, details);
                                break;
                            case types_1.NotificationType.PURCHASE_FAILED:
                                html = (0, purchaseFailedTemplate_1.purchaseFailedTemplate)(details?.purchaseType || 'Purchase', details?.reason || message, details);
                                break;
                            case types_1.NotificationType.LOGIN:
                                html = (0, loginTemplate_1.loginTemplate)(user.email || '');
                                break;
                            case types_1.NotificationType.LOGOUT:
                                html = (0, logoutNotificationTemplate_1.logoutNotificationTemplate)(user.email || '');
                                break;
                            case types_1.NotificationType.QR_PAYMENT_CREATED:
                            case types_1.NotificationType.QR_PAYMENT_RECEIVED:
                            case types_1.NotificationType.QR_PAYMENT_COMPLETED:
                                html = (0, qrPaymentTemplate_1.qrPaymentTemplate)(title, details?.amount || details?.value || '', details?.currency || details?.currencyCode || '');
                                break;
                            default:
                                // leave default simple html
                                break;
                        }
                    }
                    catch (tplErr) {
                        console.error('Error rendering notification template', tplErr);
                    }
                    // Send email asynchronously but do not block the response path.
                    (0, mailtrap_1.sendMailtrapMail)({
                        to: user.email,
                        subject: title,
                        text,
                        html,
                    }).catch((err) => {
                        console.error('Failed to send Mailtrap email for notification', err);
                    });
                }
            }
            catch (err) {
                // Fail silently - notification was already persisted
                console.error('Error while attempting to send notification email:', err);
            }
        }
        return saved;
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
    /**
     * Create data purchase notification
     */
    static async notifyDataPurchase(userId, planName, amount, currency, mobileNumber, network, details) {
        const title = 'Data Purchase Successful';
        const message = `Your data purchase (${planName}) of ${amount} ${currency} for ${mobileNumber}${network ? ` on ${network}` : ''} was successful.`;
        return this.createNotification(userId, types_1.NotificationType.DATA_PURCHASE, title, message, { planName, amount, currency, mobileNumber, network, ...details });
    }
    /**
     * Create utility (electricity) purchase notification
     */
    static async notifyUtilityPurchase(userId, amount, currency, meterNumber, company, details) {
        const title = 'Utility Payment Successful';
        const message = `Your utility payment of ${amount} ${currency} for meter ${meterNumber}${company ? ` (${company})` : ''} was successful.`;
        return this.createNotification(userId, types_1.NotificationType.UTILITY_PAYMENT, title, message, { amount, currency, meterNumber, company, ...details });
    }
    /**
     * Generic purchase failed notification
     */
    static async notifyPurchaseFailed(userId, purchaseType, reason, details) {
        const title = 'Purchase Failed';
        const message = `Your ${purchaseType} purchase failed: ${reason}`;
        return this.createNotification(userId, types_1.NotificationType.PURCHASE_FAILED, title, message, { reason, ...details });
    }
}
exports.NotificationService = NotificationService;
//# sourceMappingURL=notificationService.js.map