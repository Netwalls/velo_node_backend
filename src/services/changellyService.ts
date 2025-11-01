import axios from 'axios';
import crypto from 'crypto';

const BASE = 'https://fiat-api.changelly.com/v1';

function getEnv(name: string): string {
    return process.env[name] || '';
}

const API_KEY = getEnv('CHANGELLY_API_KEY');
const API_SECRET = getEnv('CHANGELLY_API_SECRET');

if (!API_KEY || !API_SECRET) {
    // We don't throw here to avoid breaking startup when env isn't set in some environments,
    // but consumers should check and fail appropriately if they expect the service to be active.
    console.warn('Changelly credentials are not set. Set CHANGELLY_API_KEY and CHANGELLY_API_SECRET in your .env to enable Changelly endpoints');
}

function signPayload(payload: string): string {
    // Changelly Fiat API requires an HMAC signature in the X-Api-Signature header.
    // Implementation: HMAC-SHA512 over the payload using the API secret.
    // For GET requests without a body we sign an empty string.
    return crypto.createHmac('sha512', API_SECRET || '').update(payload).digest('hex');
}

async function callChangelly(method: 'get' | 'post', path: string, data?: any, params?: any) {
    const url = `${BASE}${path}` + (params && Object.keys(params || {}).length ? `?${new URLSearchParams(params).toString()}` : '');

    const payload = method === 'post' ? JSON.stringify(data || {}) : '';
    const signature = signPayload(payload);

    // Mask the API key for safe debug logging (do not log the secret)
    const maskedKey = API_KEY ? `${API_KEY.slice(0, 8)}...${API_KEY.slice(-4)}` : '';
    // Helpful debug log — will show masked key, signature and minimal payload info
    // Remove or lower log level in production
    console.debug('[Changelly] request', { method, url, maskedKey, signature: signature.slice(0, 8) + '...', payloadLength: payload.length });

    const headers: Record<string, string> = {
        'X-Api-Key': API_KEY || '',
        'X-Api-Signature': signature,
        'Content-Type': 'application/json',
    };

    try {
        const resp = await axios.request({
            method,
            url,
            headers,
            data: method === 'post' ? data : undefined,
            timeout: 20000,
        });
        return resp.data;
    } catch (err: any) {
        // Normalize error thrown
        if (err.response && err.response.data) {
            const e = new Error(`Changelly API error: ${JSON.stringify(err.response.data)}`);
            (e as any).status = err.response.status;
            (e as any).body = err.response.data;
            throw e;
        }
        throw err;
    }
}

export default class ChangellyService {
    static async getProviders() {
        return callChangelly('get', '/providers');
    }

    static async getCurrencies(query?: { type?: string; providerCode?: string; supportedFlow?: string }) {
        return callChangelly('get', '/currencies', undefined, query);
    }

    static async getAvailableCountries(query?: { providerCode?: string; supportedFlow?: string }) {
        return callChangelly('get', '/available-countries', undefined, query);
    }

    static async getOffers(query: { currencyFrom: string; currencyTo: string; amountFrom: string; country: string; providerCode?: string; externalUserId?: string; ip?: string }) {
        return callChangelly('get', '/offers', undefined, query);
    }

    static async getSellOffers(query: { currencyFrom: string; currencyTo: string; amountFrom: string; country: string; providerCode?: string; ip?: string; paymentMethodCode?: string }) {
        return callChangelly('get', '/sell/offers', undefined, query);
    }

    static async getOrders(query?: any) {
        return callChangelly('get', '/orders', undefined, query);
    }

    static async createOrder(body: any) {
        return callChangelly('post', '/orders', body);
    }

    static async createSellOrder(body: any) {
        return callChangelly('post', '/sell/orders', body);
    }

    static async validateAddress(body: { currency: string; walletAddress: string; walletExtraId?: string }) {
        return callChangelly('post', '/validate-address', body);
    }
}
