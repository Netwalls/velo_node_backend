"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MoonpayController = void 0;
const moonpayService_1 = __importDefault(require("../services/moonpayService"));
const notificationService_1 = require("../services/notificationService");
const types_1 = require("../types");
const PROVIDER_CODE = 'moonpay';
class MoonpayController {
    /**
     * Creates a MoonPay transaction (hosted checkout) and returns the redirect URL (or order id/status).
     */
    static async createPurchase(req, res) {
        try {
            const userId = req.user && req.user.id;
            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }
            const { currency = 'USD', amount, walletAddress, email } = req.body;
            if (!currency || !amount || !walletAddress) {
                res.status(400).json({ error: 'currency, amount, and walletAddress are required' });
                return;
            }
            const externalTransactionId = `velo_${userId}_${Date.now()}`;
            // Build provider payload. Adjust fields to match MoonPay's API if needed.
            const txPayload = {
                externalTransactionId,
                baseCurrency: 'USD',
                baseAmount: String(amount),
                fiatCurrency: currency.toUpperCase(),
                walletAddress,
                customerEmail: email || undefined,
                returnUrl: process.env.MOONPAY_RETURN_URL_SUCCESS || 'https://connectvelo.com/success',
                cancelUrl: process.env.MOONPAY_RETURN_URL_FAILED || 'https://connectvelo.com/failed',
            };
            const result = await moonpayService_1.default.createTransaction(txPayload);
            if (!result.ok) {
                console.error('[MOONPAY] createTransaction failed', { status: result.status, data: result.data });
                res.status(502).json({ error: 'Provider error', details: result.data });
                return;
            }
            const data = result.data || {};
            // MoonPay may return different shapes; pick common fields and fall back to our external id.
            const returnedId = data.id || data.transactionId || data.externalTransactionId || externalTransactionId;
            const redirectUrl = data.checkoutUrl || data.redirectUrl || data.url || data.paymentUrl;
            const status = data.status || 'pending';
            console.log('[MOONPAY] Purchase created', { userId, externalTransactionId, returnedId, status });
            try {
                await notificationService_1.NotificationService.createNotification(userId, types_1.NotificationType.DEPOSIT, 'Purchase Created', `Your purchase ${returnedId} is pending.`, {
                    orderId: returnedId,
                    externalOrderId: externalTransactionId,
                    amount: txPayload.baseAmount,
                    currency: txPayload.fiatCurrency,
                    provider: PROVIDER_CODE,
                    redirectUrl,
                });
            }
            catch (err) {
                console.error('[MOONPAY] Failed to create notification', err);
            }
            res.json({ success: true, redirectUrl, orderId: returnedId, status, provider: PROVIDER_CODE });
        }
        catch (err) {
            console.error('[MOONPAY] createPurchase error', err);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    /**
     * Webhook handler stub. Verify provider signature and update order status accordingly.
     */
    static async moonpayWebhook(req, res) {
        try {
            const body = req.body || {};
            const orderId = body.id || body.transactionId || body.externalTransactionId;
            const userId = body.externalUserId || body.external_user_id || body.userId;
            const status = (body.status || '').toString().toLowerCase();
            console.log('[MOONPAY][WEBHOOK] Received webhook', { orderId, userId, status });
            if (!userId) {
                console.warn('[MOONPAY][WEBHOOK] Missing user id in webhook payload', body);
                res.status(200).json({ ok: true });
                return;
            }
            if (['completed', 'finished', 'success'].includes(status)) {
                try {
                    await notificationService_1.NotificationService.notifyDeposit(String(userId), String(body.amount || ''), String(body.currency || ''), { orderId, raw: body });
                    console.log('[MOONPAY][WEBHOOK] Notified deposit success', { userId, orderId });
                }
                catch (err) {
                    console.error('[MOONPAY][WEBHOOK] notifyDeposit failed', err);
                }
            }
            else if (['failed', 'cancelled', 'error'].includes(status)) {
                try {
                    await notificationService_1.NotificationService.notifyPurchaseFailed(String(userId), types_1.NotificationType.DEPOSIT, body.reason || status, { orderId, raw: body });
                    console.log('[MOONPAY][WEBHOOK] Notified deposit failure', { userId, orderId });
                }
                catch (err) {
                    console.error('[MOONPAY][WEBHOOK] notifyPurchaseFailed failed', err);
                }
            }
            else {
                console.log('[MOONPAY][WEBHOOK] Unhandled status', status);
            }
            res.status(200).json({ ok: true });
        }
        catch (err) {
            console.error('[MOONPAY][WEBHOOK] Error processing webhook', err);
            res.status(500).json({ error: 'Webhook processing error' });
        }
    }
}
exports.MoonpayController = MoonpayController;
exports.default = MoonpayController;
//# sourceMappingURL=moonpayController.js.map