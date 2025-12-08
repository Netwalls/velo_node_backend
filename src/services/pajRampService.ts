import 'dotenv/config';
import {
  initializeSDK,
  Environment,
  initiate,
  verify,
  createOrder,
  createOfframpOrder,
  getBanks,
  resolveBankAccount,
  addBankAccount,
  getAllRate,
  getAllTransactions,
  Currency,
} from 'paj_ramp';
import { v4 as uuidv4 } from 'uuid';

const env = (process.env.NODE_ENV || 'staging') as 'staging' | 'production';
initializeSDK(env === 'production' ? Environment.Production : Environment.Staging);

const API_KEY = process.env.BUSINESS_API_KEY!;
const WEBHOOK_URL = `${process.env.WEBHOOK_BASE_URL}/webhook/paj-ramp`;

export class PajRampService {
  static async createSession(email: string, otp?: string) {
    try {
      if (!otp) {
        const res = await initiate(email, API_KEY);
        return { success: true, data: { ...res, otpSent: true } };
      }

      const deviceInfo = {
        uuid: uuidv4(),
        device: 'web',
        os: 'web',
        browser: 'chrome',
        ip: '127.0.0.1',
      };

      const verified = await verify(email, otp, deviceInfo, API_KEY);
      return { success: true, data: verified };
    } catch (error: any) {
      return { success: false, error: error.message || error.toString() };
    }
  }

  static async createOnRampOrder(
    token: string,
    walletAddress: string,
    fiatAmount = 10000,
    currency: string = 'NGN',
    mint: string = process.env.DEFAULT_TOKEN_MINT || '',
    chain: string = 'SOLANA'
  ) {
    try {
      const order = await createOrder(
        {
          fiatAmount: Number(fiatAmount),
          currency,
          recipient: walletAddress,
          mint,
          chain,
          webhookURL: WEBHOOK_URL,
        },
        token
      );
      return { success: true, data: order };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  static async getAvailableBanks(token: string) {
    return this.safeCall(() => getBanks(token));
  }

  static async resolveAndAddBank(token: string, bankId: string, accountNumber: string) {
    try {
      await resolveBankAccount(token, bankId, accountNumber);
      const added = await addBankAccount(token, bankId, accountNumber);
      return { success: true, data: added };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  static async createOffRampOrder(
    token: string,
    bankId: string,
    accountNumber: string,
    amount = 10000,
    currency = 'NGN',
    mint: string = process.env.DEFAULT_TOKEN_MINT || ''
  ) {
    try {
      const order = await createOfframpOrder(
        {
          bank: bankId,
          accountNumber,
          currency,
          amount: Number(amount),
          mint,
          webhookURL: WEBHOOK_URL,
        },
        token
      );
      return { success: true, data: order };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  static async getRates() {
    return this.safeCall(getAllRate);
  }

  static async getTransactions(token: string) {
    return this.safeCall(() => getAllTransactions(token));
  }

  private static async safeCall<T>(fn: () => Promise<T>): Promise<{ success: true; data: T } | { success: false; error: string }> {
    try {
      const data = await fn();
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message || 'Unknown error' };
    }
  }
}