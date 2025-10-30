"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CrossChainSwapService = void 0;
const axios_1 = __importDefault(require("axios"));
/**
 * Cross-chain swap service using Changelly as the bridge aggregator
 * Supports: ETH, BTC, SOL, XLM, STRK, DOT and cross-chain pairs
 */
const CHANGELLY_API_KEY = process.env.CHANGELLY_API_KEY || '';
const CHANGELLY_SECRET = process.env.CHANGELLY_SECRET || '';
const CHANGELLY_BASE = 'https://api.changelly.com/v2';
// Map our chain names to Changelly currency codes
const CHAIN_TO_CHANGELLY = {
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
const CHANGELLY_TO_CHAIN = Object.fromEntries(Object.entries(CHAIN_TO_CHANGELLY).map(([k, v]) => [v, k]));
async function changellyRequest(method, params = {}) {
    if (!CHANGELLY_API_KEY || !CHANGELLY_SECRET) {
        throw new Error('Changelly API credentials not configured. Set CHANGELLY_API_KEY and CHANGELLY_SECRET.');
    }
    const crypto = require('crypto');
    const id = Date.now().toString();
    const message = {
        id,
        jsonrpc: '2.0',
        method,
        params,
    };
    const sign = crypto
        .createHmac('sha512', CHANGELLY_SECRET)
        .update(JSON.stringify(message))
        .digest('hex');
    const resp = await axios_1.default.post(CHANGELLY_BASE, message, {
        headers: {
            'Content-Type': 'application/json',
            'api-key': CHANGELLY_API_KEY,
            'sign': sign,
        },
        timeout: 15000,
    });
    const data = resp.data;
    if (data?.error) {
        throw new Error(`Changelly error: ${JSON.stringify(data.error)}`);
    }
    return data?.result;
}
class CrossChainSwapService {
    /**
     * Get available currencies from Changelly
     */
    static async getCurrencies() {
        const result = await changellyRequest('getCurrencies', {});
        return Array.isArray(result) ? result : [];
    }
    /**
     * Get minimum swap amount for a currency pair
     */
    static async getMinAmount(from, to) {
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
    static async getExchangeAmount(from, to, amount) {
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
    static async getFixedRateQuote(from, to, amount) {
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
    static async createTransaction(from, to, amount, recipientAddress, refundAddress) {
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
    static async createFixedRateTransaction(rateId, recipientAddress, refundAddress) {
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
    static async getTransactionStatus(transactionId) {
        const result = await changellyRequest('getStatus', {
            id: transactionId,
        });
        return result;
    }
    /**
     * Validate recipient address for a given currency
     */
    static async validateAddress(currency, address) {
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
        }
        catch (error) {
            return {
                valid: false,
                message: error?.message || 'Validation failed',
            };
        }
    }
    /**
     * Check if a pair is supported for cross-chain swap
     */
    static isCrossChainPair(fromChain, toChain) {
        // If same chain, not cross-chain (use native DEX instead)
        if (fromChain === toChain)
            return false;
        // Check if both chains are supported
        const fromSupported = !!CHAIN_TO_CHANGELLY[fromChain] || !!CHANGELLY_TO_CHAIN[fromChain.toLowerCase()];
        const toSupported = !!CHAIN_TO_CHANGELLY[toChain] || !!CHANGELLY_TO_CHAIN[toChain.toLowerCase()];
        return fromSupported && toSupported;
    }
    /**
     * Get supported chain pairs
     */
    static getSupportedChains() {
        return Object.keys(CHAIN_TO_CHANGELLY);
    }
}
exports.CrossChainSwapService = CrossChainSwapService;
exports.default = CrossChainSwapService;
//# sourceMappingURL=crossChainSwapService.js.map