"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const crypto_1 = __importDefault(require("crypto"));
const BASE = 'https://fiat-api.changelly.com/v1';
function getEnv(name) {
    return process.env[name] || '';
}
const API_KEY = getEnv('CHANGELLY_API_KEY');
const API_SECRET = getEnv('CHANGELLY_API_SECRET');
if (!API_KEY || !API_SECRET) {
    // We don't throw here to avoid breaking startup when env isn't set in some environments,
    // but consumers should check and fail appropriately if they expect the service to be active.
    console.warn('Changelly credentials are not set. Set CHANGELLY_API_KEY and CHANGELLY_API_SECRET in your .env to enable Changelly endpoints');
}
function signPayload(payload) {
    // Changelly Fiat API requires an HMAC signature in the X-Api-Signature header.
    // Implementation: HMAC-SHA512 over the payload using the API secret.
    // For GET requests without a body we sign an empty string.
    return crypto_1.default.createHmac('sha512', API_SECRET || '').update(payload).digest('hex');
}
async function callChangelly(method, path, data, params) {
    const url = `${BASE}${path}` + (params && Object.keys(params || {}).length ? `?${new URLSearchParams(params).toString()}` : '');
    const payload = method === 'post' ? JSON.stringify(data || {}) : '';
    const signature = signPayload(payload);
    const headers = {
        'X-Api-Key': API_KEY || '',
        'X-Api-Signature': signature,
        'Content-Type': 'application/json',
    };
    try {
        const resp = await axios_1.default.request({
            method,
            url,
            headers,
            data: method === 'post' ? data : undefined,
            timeout: 20000,
        });
        return resp.data;
    }
    catch (err) {
        // Normalize error thrown
        if (err.response && err.response.data) {
            const e = new Error(`Changelly API error: ${JSON.stringify(err.response.data)}`);
            e.status = err.response.status;
            e.body = err.response.data;
            throw e;
        }
        throw err;
    }
}
class ChangellyService {
    static async getProviders() {
        return callChangelly('get', '/providers');
    }
    static async getCurrencies(query) {
        return callChangelly('get', '/currencies', undefined, query);
    }
    static async getAvailableCountries(query) {
        return callChangelly('get', '/available-countries', undefined, query);
    }
    static async getOffers(query) {
        return callChangelly('get', '/offers', undefined, query);
    }
    static async getSellOffers(query) {
        return callChangelly('get', '/sell/offers', undefined, query);
    }
    static async getOrders(query) {
        return callChangelly('get', '/orders', undefined, query);
    }
    static async createOrder(body) {
        return callChangelly('post', '/orders', body);
    }
    static async createSellOrder(body) {
        return callChangelly('post', '/sell/orders', body);
    }
    static async validateAddress(body) {
        return callChangelly('post', '/validate-address', body);
    }
}
exports.default = ChangellyService;
//# sourceMappingURL=changellyService.js.map