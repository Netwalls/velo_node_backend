import axios from 'axios';
import { env } from '../../../../shared/config/env';

export const walletClient = axios.create({
  baseURL: env.WALLET_SERVICE_URL,
  headers: {
    'x-api-key': env.INTERNAL_API_KEY,
    'Content-Type': 'application/json',
  },
  timeout: 8000,
});

export const notificationClient = axios.create({
  baseURL: env.NOTIFICATION_SERVICE_URL,
  headers: {
    'x-api-key': env.INTERNAL_API_KEY,
    'Content-Type': 'application/json',
  },
  timeout: 8000,
});

export const qrPaymentClient = axios.create({
  baseURL: env.QRPAYMENT_SERVICE_URL,
  headers: {
    'x-api-key': env.INTERNAL_API_KEY,
    'Content-Type': 'application/json',
  },
  timeout: 8000,
});

export interface AuthTokensPayload {
  userId: string;
  email: string;
  accessToken: string;
  refreshToken: string;
}

export async function broadcastAuthTokens(payload: AuthTokensPayload): Promise<void> {
  await Promise.all([
    notificationClient
      .post('/internal/auth/user-authenticated', payload)
      .catch(() => {}),
    qrPaymentClient
      .post('/internal/auth/user-authenticated', payload)
      .catch(() => {}),
  ]);
}

export async function broadcastLogout(userId: string): Promise<void> {
  await Promise.all([
    notificationClient
      .post('/internal/auth/user-logout', { userId })
      .catch(() => {}),
    qrPaymentClient
      .post('/internal/auth/user-logout', { userId })
      .catch(() => {}),
  ]);
}
