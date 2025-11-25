// src/controllers/changellyController.ts
import { Response } from 'express';
import * as crypto from 'crypto';
import { AuthRequest } from '../types';

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

      res.json({
        success: true,
        redirectUrl: result.redirectUrl || result.paymentUrl || result.url,
        orderId: result.id,
        status: result.status || 'waiting',
        provider: result.provider || providerCode,
      });

    } catch (err: any) {
      console.error('Changelly deposit error:', err);
      res.status(500).json({ error: 'Internal server error', message: err.message });
    }
  }
}