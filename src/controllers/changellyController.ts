// src/controllers/changellyController.ts
import { Response } from 'express';
import * as crypto from 'crypto';
import { AuthRequest } from '../types';
import { NotificationService } from '../services/notificationService';
import { NotificationType } from '../types';

const API_PUBLIC_KEY = process.env.CHANGELLY_PUBLIC_KEY
// "1fc5ebda92bce8350b973f6718f99aeb871319f2f21fd2d90a6cc12b382883ea";
const API_PRIVATE_KEY_B64 = process.env.CHANGELLY_PRIVATE_KEY


if (!API_PUBLIC_KEY || !API_PRIVATE_KEY_B64) {
  throw new Error('Missing CHANGELLY_PUBLIC_KEY or CHANGELLY_PRIVATE_KEY in .env');
}

const PRIVATE_KEY = crypto.createPrivateKey({
  key: Buffer.from(API_PRIVATE_KEY_B64, 'base64'),
  type: 'pkcs1',
  format: 'pem',
});

const CHANGELLY_URL = 'https://fiat-api.changelly.com/v1/orders';

export class ChangellyController {
  static async createDepositOrder(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id; // ← REAL user from your auth middleware
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const {
        currencyTo,
        amountFrom,
        country = 'FR',
        walletAddress,
        providerCode = 'moonpay',
      } = req.body;

      if (!currencyTo || !amountFrom || !walletAddress) {
        res.status(400).json({ error: 'currencyTo, amountFrom, and walletAddress are required' });
        return;
      }

      const orderData = {
        externalOrderId: `velo_${userId}_${Date.now()}`,
        externalUserId: userId,
        providerCode,
        currencyFrom: 'USD',
        currencyTo: currencyTo.toUpperCase(),
        amountFrom: String(amountFrom),
        country: country.toUpperCase(),
        walletAddress,
        paymentMethod: 'card',
        returnSuccessUrl: 'https://connectvelo.com/success',
        returnFailedUrl: 'https://connectvelo.com/failed',
      };

      const payloadToSign = CHANGELLY_URL + JSON.stringify(orderData);
      const signature = crypto.sign('sha256', Buffer.from(payloadToSign), PRIVATE_KEY).toString('base64');

      const response = await fetch(CHANGELLY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': API_PUBLIC_KEY!,
          'X-Api-Signature': signature,
        },
        body: JSON.stringify(orderData),
      });

      const text = await response.text();
      let data: any;
      try { data = JSON.parse(text); } catch { data = text; }

      if (!response.ok) {
        console.error('Changelly API error:', data);
        res.status(response.status).json({ error: 'Payment provider error', details: data });
        return;
      }

      const result = data.result || data;

      // Resolve provider order id (fall back to our externalOrderId when provider doesn't return an id)
      const returnedOrderId = result.id || result.orderId || result.externalOrderId || orderData.externalOrderId;

      // Log and notify user that the order has been created/initiated
      console.log('[CHANGELLY] Deposit order created', {
        userId,
        externalOrderId: orderData.externalOrderId,
        orderId: returnedOrderId,
        status: result.status || 'waiting',
        provider: result.provider || providerCode,
      });

      // Create a user-facing notification (will also send email using templates)
      try {
        await NotificationService.createNotification(
          userId,
          NotificationType.DEPOSIT,
          'Deposit Order Created',
          `Your deposit order ${returnedOrderId} has been created and is pending.`,
          {
            orderId: returnedOrderId,
            externalOrderId: orderData.externalOrderId,
            amount: orderData.amountFrom,
            currency: orderData.currencyTo,
            provider: result.provider || providerCode,
            redirectUrl: result.redirectUrl || result.paymentUrl || result.url,
          }
        );
      } catch (notifyErr) {
        console.error('[CHANGELLY] Failed to create deposit notification', notifyErr);
      }

      res.json({
        success: true,
        redirectUrl: result.redirectUrl || result.paymentUrl || result.url,
        orderId: returnedOrderId,
        status: result.status || 'waiting',
        provider: result.provider || providerCode,
      });

    } catch (err: any) {
      console.error('Changelly deposit error:', err);
      res.status(500).json({ error: 'Internal server error', message: err.message });
    }
  }

  /**
   * Generic webhook handler for Changelly order status updates.
   * Expects JSON payload with at least { orderId, externalUserId, status, amount, currency }
   */
  static async changellyWebhook(req: any, res: Response): Promise<void> {
    try {
      const body = req.body || {};
      const orderId = body.id || body.orderId || body.externalOrderId;
      const userId = body.externalUserId || body.external_user_id || body.userId || body.externalUser || body.externalUserId;
      const status = (body.status || '').toString().toLowerCase();
      const amount = body.amount || body.amountFrom || body.amountTo || body.value;
      const currency = body.currency || body.currencyTo || body.currencyFrom;
      const reason = body.reason || body.error || body.message;

      console.log('[CHANGELLY][WEBHOOK] Received webhook', { orderId, userId, status });

      if (!userId) {
        console.warn('[CHANGELLY][WEBHOOK] Missing external user id in webhook payload', body);
        // still respond 200 so provider doesn't retry, but log for investigation
        res.status(200).json({ ok: true });
        return;
      }

      // Normalize status handling
      if (['completed', 'finished', 'success'].includes(status)) {
        try {
          await NotificationService.notifyDeposit(String(userId), String(amount || ''), String(currency || ''), { orderId, status, raw: body });
          console.log('[CHANGELLY][WEBHOOK] Sent deposit success notification', { userId, orderId });
        } catch (err) {
          console.error('[CHANGELLY][WEBHOOK] Failed to send deposit success notification', err);
        }
      } else if (['failed', 'cancelled', 'error'].includes(status)) {
        try {
          await NotificationService.notifyPurchaseFailed(String(userId), NotificationType.DEPOSIT, reason || status, { orderId, status, raw: body });
          console.log('[CHANGELLY][WEBHOOK] Sent deposit failure notification', { userId, orderId });
        } catch (err) {
          console.error('[CHANGELLY][WEBHOOK] Failed to send deposit failure notification', err);
        }
      } else {
        console.log('[CHANGELLY][WEBHOOK] Unhandled status - storing as info', { status, body });
      }

      res.status(200).json({ ok: true });
    } catch (err: any) {
      console.error('[CHANGELLY][WEBHOOK] Error processing webhook', err);
      res.status(500).json({ error: 'Webhook processing error' });
    }
  }
}