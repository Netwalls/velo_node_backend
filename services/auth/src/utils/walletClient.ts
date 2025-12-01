// auth-service/src/utils/walletClient.ts
import axios from 'axios';
import { env } from '../../../../shared/config/env';

export const walletClient = axios.create({
  baseURL: env.WALLET_SERVICE_URL || 'http://localhost:4001',
  headers: {
    'x-api-key': env.INTERNAL_API_KEY,
    'Content-Type': 'application/json',
  },
  timeout: 10_000,
});