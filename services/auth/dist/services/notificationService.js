"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const axios_1 = __importDefault(require("axios"));
const MONOLITH_URL = process.env.MONOLITH_URL;
class NotificationService {
    static async notifyRegistration(userId, payload) {
        if (MONOLITH_URL) {
            try {
                await axios_1.default.post(`${MONOLITH_URL}/internal/notifications/registration`, { userId, payload });
                return;
            }
            catch (err) {
                console.warn('Forward to monolith notification failed', err);
            }
        }
        console.log('NotifyRegistration:', userId, payload);
    }
    static async notifyLogin(userId, payload) {
        if (MONOLITH_URL) {
            try {
                await axios_1.default.post(`${MONOLITH_URL}/internal/notifications/login`, { userId, payload });
                return;
            }
            catch (err) {
                console.warn('Forward to monolith notification failed', err);
            }
        }
        console.log('NotifyLogin:', userId, payload);
    }
    static async notifyOTPVerified(userId, payload) {
        if (MONOLITH_URL) {
            try {
                await axios_1.default.post(`${MONOLITH_URL}/internal/notifications/otp-verified`, { userId, payload });
                return;
            }
            catch (err) {
                console.warn('Forward to monolith notification failed', err);
            }
        }
        console.log('NotifyOTPVerified:', userId, payload);
    }
    static async createNotification(userId, type, title, body, meta) {
        if (MONOLITH_URL) {
            try {
                await axios_1.default.post(`${MONOLITH_URL}/internal/notifications/create`, { userId, type, title, body, meta });
                return;
            }
            catch (err) {
                console.warn('Forward to monolith create notification failed', err);
            }
        }
        console.log('CreateNotification:', { userId, type, title, body, meta });
    }
}
exports.NotificationService = NotificationService;
