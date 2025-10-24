import axios from 'axios';
import { ethers } from 'ethers';

/**
 * Cross-chain swap service using Changelly as the bridge aggregator
 * Supports: ETH, BTC, SOL, XLM, STRK, DOT and cross-chain pairs
 */

const CHANGELLY_API_KEY = process.env.CHANGELLY_API_KEY || '';
const CHANGELLY_SECRET = process.env.CHANGELLY_SECRET || '';
const CHANGELLY_BASE = 'https://api.changelly.com/v2';

// Map our chain names to Changelly currency codes
const CHAIN_TO_CHANGELLY: Record<string, string> = {
  ethereum: 'eth',
  bitcoin: 'btc',
  solana: 'sol',
  stellar: 'xlm',
  starknet: 'strk',
  polkadot: 'dot',
  usdt_erc20: 'usdterc20',
  usdt_trc20: 'usdttrc20',
};

// Reverse map
const CHANGELLY_TO_CHAIN: Record<string, string> = Object.fromEntries(
  Object.entries(CHAIN_TO_CHANGELLY).map(([k, v]) => [v, k])
);

interface ChangellyRequest {
  id: string;
  jsonrpc: '2.0';
  method: string;
  params: any;
}

async function changellyRequest(method: string, params: any = {}): Promise<any> {
  if (!CHANGELLY_API_KEY || !CHANGELLY_SECRET) {
    throw new Error('Changelly API credentials not configured. Set CHANGELLY_API_KEY and CHANGELLY_SECRET.');
  }

  const crypto = require('crypto');
  const id = Date.now().toString();
  const message: ChangellyRequest = {
    id,
    jsonrpc: '2.0',
    method,
    params,
  };

  const sign = crypto
    .createHmac('sha512', CHANGELLY_SECRET)
    .update(JSON.stringify(message))
    .digest('hex');

  const resp = await axios.post(CHANGELLY_BASE, message, {
    headers: {
      'Content-Type': 'application/json',
      'api-key': CHANGELLY_API_KEY,
      'sign': sign,
    },
    timeout: 15000,
  });

  const data: any = resp.data as any;
  if (data?.error) {
    throw new Error(`Changelly error: ${JSON.stringify(data.error)}`);
  }

  return data?.result;
}

export interface CrossChainQuote {
  fromCurrency: string;
  toCurrency: string;
  fromAmount: string;
  toAmount: string;
  rate: string;
  fee: string;
  provider: 'changelly' | 'native';
  estimatedTime?: string; // e.g., "5-30 min"
  payinAddress?: string; // if fixed-rate flow
  transactionId?: string;
}

export interface CrossChainSwapResult {
  transactionId: string;
  payinAddress: string;
  payoutAddress: string;
  fromCurrency: string;
  toCurrency: string;
  fromAmount: string;
  expectedToAmount: string;
  status: string;
  provider: 'changelly';
}

export class CrossChainSwapService {
  /**
   * Get available currencies from Changelly
   */
  static async getCurrencies(): Promise<string[]> {
    const result = await changellyRequest('getCurrencies', {});
    return Array.isArray(result) ? result : [];
  }

  /**
   * Get minimum swap amount for a currency pair
   */
  static async getMinAmount(from: string, to: string): Promise<number> {
    const fromCur = CHAIN_TO_CHANGELLY[from] || from.toLowerCase();
    const toCur = CHAIN_TO_CHANGELLY[to] || to.toLowerCase();
    
    const result = await changellyRequest('getMinAmount', {
      from: fromCur,
      to: toCur,
    });
    
    return Number(result || 0);
  }

  /**
   * Get estimated exchange amount (floating rate)
   */
  static async getExchangeAmount(from: string, to: string, amount: string): Promise<CrossChainQuote> {
    const fromCur = CHAIN_TO_CHANGELLY[from] || from.toLowerCase();
    const toCur = CHAIN_TO_CHANGELLY[to] || to.toLowerCase();

    const result = await changellyRequest('getExchangeAmount', {
      from: fromCur,
      to: toCur,
      amount,
    });

    // Result shape: [{ from, to, networkFee, amount, result, visibleAmount, rate, fee }]
    const quote = Array.isArray(result) ? result[0] : result;

    return {
      fromCurrency: fromCur,
      toCurrency: toCur,
      fromAmount: amount,
      toAmount: quote?.result || quote?.amount || '0',
      rate: quote?.rate || '0',
      fee: quote?.fee || quote?.networkFee || '0',
      provider: 'changelly',
      estimatedTime: '5-30 min',
    };
  }

  /**
   * Get fixed-rate quote (recommended for production)
   */
  static async getFixedRateQuote(from: string, to: string, amount: string): Promise<CrossChainQuote> {
    const fromCur = CHAIN_TO_CHANGELLY[from] || from.toLowerCase();
    const toCur = CHAIN_TO_CHANGELLY[to] || to.toLowerCase();

    const result = await changellyRequest('getFixRate', {
      from: fromCur,
      to: toCur,
      amountFrom: amount,
    });

    // Result shape: [{ id, result, from, to, max, maxFrom, maxTo, min, minFrom, minTo }]
    const quote = Array.isArray(result) ? result[0] : result;

    return {
      fromCurrency: fromCur,
      toCurrency: toCur,
      fromAmount: amount,
      toAmount: quote?.result || quote?.amountTo || '0',
      rate: quote?.rate || '0',
      fee: '0', // included in rate
      provider: 'changelly',
      estimatedTime: '5-30 min',
      transactionId: quote?.id,
    };
  }

  /**
   * Create a floating-rate swap transaction
   */
  static async createTransaction(
    from: string,
    to: string,
    amount: string,
    recipientAddress: string,
    refundAddress?: string
  ): Promise<CrossChainSwapResult> {
    const fromCur = CHAIN_TO_CHANGELLY[from] || from.toLowerCase();
    const toCur = CHAIN_TO_CHANGELLY[to] || to.toLowerCase();

    const result = await changellyRequest('createTransaction', {
      from: fromCur,
      to: toCur,
      address: recipientAddress,
      amount,
      refundAddress: refundAddress || recipientAddress,
    });

    return {
      transactionId: result.id,
      payinAddress: result.payinAddress,
      payoutAddress: recipientAddress,
      fromCurrency: fromCur,
      toCurrency: toCur,
      fromAmount: amount,
      expectedToAmount: result.amountExpectedTo || result.result || '0',
      status: result.status || 'new',
      provider: 'changelly',
    };
  }

  /**
   * Create a fixed-rate swap transaction
   */
  static async createFixedRateTransaction(
    rateId: string,
    recipientAddress: string,
    refundAddress?: string
  ): Promise<CrossChainSwapResult> {
    const result = await changellyRequest('createFixTransaction', {
      rateId,
      address: recipientAddress,
      refundAddress: refundAddress || recipientAddress,
    });

    return {
      transactionId: result.id,
      payinAddress: result.payinAddress,
      payoutAddress: recipientAddress,
      fromCurrency: result.currencyFrom || result.from,
      toCurrency: result.currencyTo || result.to,
      fromAmount: result.amountExpectedFrom || '0',
      expectedToAmount: result.amountExpectedTo || result.amountTo || '0',
      status: result.status || 'new',
      provider: 'changelly',
    };
  }

  /**
   * Get transaction status
   */
  static async getTransactionStatus(transactionId: string): Promise<any> {
    const result = await changellyRequest('getStatus', {
      id: transactionId,
    });
    return result;
  }

  /**
   * Validate recipient address for a given currency
   */
  static async validateAddress(currency: string, address: string): Promise<{ valid: boolean; message?: string }> {
    try {
      const cur = CHAIN_TO_CHANGELLY[currency] || currency.toLowerCase();
      const result = await changellyRequest('validateAddress', {
        currency: cur,
        address,
      });
      
      return {
        valid: result?.result === true || result === true,
        message: result?.message,
      };
    } catch (error: any) {
      return {
        valid: false,
        message: error?.message || 'Validation failed',
      };
    }
  }

  /**
   * Check if a pair is supported for cross-chain swap
   */
  static isCrossChainPair(fromChain: string, toChain: string): boolean {
    // If same chain, not cross-chain (use native DEX instead)
    if (fromChain === toChain) return false;
    
    // Check if both chains are supported
    const fromSupported = !!CHAIN_TO_CHANGELLY[fromChain] || !!CHANGELLY_TO_CHAIN[fromChain.toLowerCase()];
    const toSupported = !!CHAIN_TO_CHANGELLY[toChain] || !!CHANGELLY_TO_CHAIN[toChain.toLowerCase()];
    
    return fromSupported && toSupported;
  }

  /**
   * Get supported chain pairs
   */
  static getSupportedChains(): string[] {
    return Object.keys(CHAIN_TO_CHANGELLY);
  }
}

export default CrossChainSwapService;
