import { Response } from 'express';
import { AuthRequest } from '../types';
import MoonpayService from '../services/moonpayService';
import { NotificationService } from '../services/notificationService';
import { NotificationType } from '../types';

const PROVIDER_CODE = 'moonpay';

export class MoonpayController {
  /**
   * Creates a MoonPay transaction (hosted checkout) and returns the redirect URL (or order id/status).
   */
  static async createPurchase(req: AuthRequest, res: Response): Promise<void> {
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
      const txPayload: any = {
        externalTransactionId,
        baseCurrency: 'USD',
        baseAmount: String(amount),
        fiatCurrency: currency.toUpperCase(),
        walletAddress,
        customerEmail: email || undefined,
        returnUrl: process.env.MOONPAY_RETURN_URL_SUCCESS || 'https://connectvelo.com/success',
        cancelUrl: process.env.MOONPAY_RETURN_URL_FAILED || 'https://connectvelo.com/failed',
      };

      const result = await MoonpayService.createTransaction(txPayload);

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
        await NotificationService.createNotification(
          userId,
          NotificationType.DEPOSIT,
          'Purchase Created',
          `Your purchase ${returnedId} is pending.`,
          {
            orderId: returnedId,
            externalOrderId: externalTransactionId,
            amount: txPayload.baseAmount,
            currency: txPayload.fiatCurrency,
            provider: PROVIDER_CODE,
            redirectUrl,
          }
        );
      } catch (err) {
        console.error('[MOONPAY] Failed to create notification', err);
      }

      res.json({ success: true, redirectUrl, orderId: returnedId, status, provider: PROVIDER_CODE });

    } catch (err: any) {
      console.error('[MOONPAY] createPurchase error', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Webhook handler stub. Verify provider signature and update order status accordingly.
   */
  static async moonpayWebhook(req: any, res: Response): Promise<void> {
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
          await NotificationService.notifyDeposit(String(userId), String(body.amount || ''), String(body.currency || ''), { orderId, raw: body });
          console.log('[MOONPAY][WEBHOOK] Notified deposit success', { userId, orderId });
        } catch (err) {
          console.error('[MOONPAY][WEBHOOK] notifyDeposit failed', err);
        }
      } else if (['failed', 'cancelled', 'error'].includes(status)) {
        try {
          await NotificationService.notifyPurchaseFailed(String(userId), NotificationType.DEPOSIT, body.reason || status, { orderId, raw: body });
          console.log('[MOONPAY][WEBHOOK] Notified deposit failure', { userId, orderId });
        } catch (err) {
          console.error('[MOONPAY][WEBHOOK] notifyPurchaseFailed failed', err);
        }
      } else {
        console.log('[MOONPAY][WEBHOOK] Unhandled status', status);
      }

      res.status(200).json({ ok: true });
    } catch (err: any) {
      console.error('[MOONPAY][WEBHOOK] Error processing webhook', err);
      res.status(500).json({ error: 'Webhook processing error' });
    }
  }
}

export default MoonpayController;
