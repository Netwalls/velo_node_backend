import axios from 'axios';
import crypto from 'crypto';

class ChangellyService {
    private apiKey: string;
    private privateKey: string;
    private baseURL: string;
    private client: ReturnType<typeof axios.create>;

    constructor() {
        // Load from environment variables
        this.apiKey = process.env.CHANGELLY_API_KEY || '';
        const apiSecretRaw = process.env.CHANGELLY_API_SECRET || '';
        
        // Decode the Base64-encoded private key
        this.privateKey = this.decodePrivateKey(apiSecretRaw);

        this.baseURL = 'https://fiat-api.changelly.com';

        if (!this.apiKey || !this.privateKey) {
            throw new Error('CHANGELLY_API_KEY and CHANGELLY_API_SECRET must be set in environment variables');
        }

        this.client = axios.create({
            baseURL: this.baseURL,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
            }
        });
    }

    /**
     * Decode Base64-encoded private key from Changelly
     */
    private decodePrivateKey(encodedKey: string): string {
        try {
            // If it's already in PEM format (starts with -----BEGIN), return as-is
            if (encodedKey.includes('BEGIN PRIVATE KEY')) {
                return encodedKey;
            }
            
            // Otherwise, decode from Base64
            const decoded = Buffer.from(encodedKey, 'base64').toString('utf-8');
            return decoded;
        } catch (error) {
            console.error('Failed to decode private key:', error);
            return encodedKey;
        }
    }

    /**
     * Generate RSA SHA256 signature for Changelly API
     * Changelly uses RSA signature, not HMAC!
     */
    private generateSignature(message: string): string {
        try {
            const sign = crypto.createSign('RSA-SHA256');
            sign.update(message);
            sign.end();
            
            // Sign with private key and return hex
            const signature = sign.sign(this.privateKey, 'hex');
            return signature;
        } catch (error) {
            console.error('Signature generation error:', error);
            throw error;
        }
    }

    /**
     * Make authenticated GET request
     */
    private async get(endpoint: string, params?: any) {
        try {
            // Build query string manually
            let queryString = '';
            if (params) {
                const sortedParams: any = {};
                // Sort parameters alphabetically for consistent signature
                Object.keys(params).sort().forEach(key => {
                    if (params[key] !== undefined && params[key] !== null) {
                        sortedParams[key] = params[key];
                    }
                });
                
                const queryParts = Object.entries(sortedParams).map(
                    ([key, value]) => `${key}=${encodeURIComponent(String(value))}`
                );
                
                if (queryParts.length > 0) {
                    queryString = '?' + queryParts.join('&');
                }
            }
            
            const fullPath = endpoint + queryString;
            
            // Generate signature from the full path
            const signature = this.generateSignature(fullPath);

            console.log('GET Request Debug:', {
                path: fullPath,
                apiKey: this.apiKey.substring(0, 10) + '...',
                signatureLength: signature.length
            });

            const response = await this.client.get(fullPath, {
                headers: {
                    'X-Api-Key': this.apiKey,
                    'X-Api-Signature': signature,
                }
            });

            return response.data;
        } catch (error: any) {
            this.handleError(error);
        }
    }

    /**
     * Make authenticated POST request
     */
    private async post(endpoint: string, data: any) {
        try {
            // Stringify the body for signature (no spaces, sorted keys)
            const body = JSON.stringify(data, Object.keys(data).sort());
            
            // Generate signature from the request body
            const signature = this.generateSignature(body);

            console.log('POST Request Debug:', {
                endpoint,
                apiKey: this.apiKey.substring(0, 10) + '...',
                bodyLength: body.length,
                signatureLength: signature.length
            });

            const response = await this.client.post(endpoint, data, {
                headers: {
                    'X-Api-Key': this.apiKey,
                    'X-Api-Signature': signature,
                    'Content-Type': 'application/json'
                }
            });

            return response.data;
        } catch (error: any) {
            this.handleError(error);
        }
    }

    /**
     * Handle API errors
     */
    private handleError(error: any): never {
        if (error.response) {
            const errorData = error.response.data;
            const errorMessage = errorData?.errorMessage || error.message;
            const err: any = new Error(`Changelly API error: ${JSON.stringify(errorData)}`);
            err.status = error.response.status;
            err.errorType = errorData?.errorType;
            err.errorMessage = errorMessage;
            err.errorDetails = errorData?.errorDetails;
            throw err;
        } else if (error.request) {
            throw new Error('No response from Changelly API');
        } else {
            throw new Error(`Request setup error: ${error.message}`);
        }
    }

    /**
     * Get list of providers
     */
    async getProviders() {
        return this.get('/v1/providers');
    }

    /**
     * Get available currencies
     */
    async getCurrencies(query: any) {
        return this.get('/v1/currencies', query);
    }

    /**
     * Get available countries
     */
    async getAvailableCountries(query: any) {
        return this.get('/v1/available-countries', query);
    }

    /**
     * Get buy offers (on-ramp)
     */
    async getOffers(query: {
        currencyFrom: string;
        currencyTo: string;
        amountFrom: string;
        country: string;
        providerCode?: string;
        externalUserID?: string;
        state?: string;
        ip?: string;
    }) {
        return this.get('/v1/offers', query);
    }

    /**
     * Get sell offers (off-ramp)
     */
    async getSellOffers(query: {
        currencyFrom: string;
        currencyTo: string;
        amountFrom: string;
        country: string;
        providerCode?: string;
        state?: string;
        ip?: string;
    }) {
        return this.get('/v1/sell-offers', query);
    }

    /**
     * Create buy order (on-ramp)
     */
    async createOrder(data: {
        externalOrderId: string;
        externalUserId: string;
        providerCode: string;
        currencyFrom: string;
        currencyTo: string;
        amountFrom: string;
        country: string;
        walletAddress: string;
        walletExtraId?: string;
        state?: string;
        ip?: string;
        paymentMethod?: string;
        userAgent?: string;
        metadata?: any;
        returnSuccessUrl?: string;
        returnFailedUrl?: string;
    }) {
        return this.post('/v1/orders', data);
    }

    /**
     * Create sell order (off-ramp)
     */
    async createSellOrder(data: {
        externalOrderId: string;
        externalUserId: string;
        providerCode: string;
        currencyFrom: string;
        currencyTo: string;
        amountFrom: string;
        country: string;
        refundAddress: string;
        state?: string;
        ip?: string;
        userAgent?: string;
        metadata?: any;
        returnSuccessUrl?: string;
        returnFailedUrl?: string;
    }) {
        return this.post('/v1/sell-orders', data);
    }

    /**
     * Validate wallet address
     */
    async validateAddress(data: {
        currency: string;
        address: string;
        extraId?: string;
    }) {
        return this.post('/v1/validate-address', data);
    }

    /**
     * Get orders
     */
    async getOrders(query: {
        externalOrderId?: string;
        externalUserId?: string;
        orderId?: string;
        limit?: number;
        offset?: number;
    }) {
        return this.get('/v1/orders', query);
    }
}

// Export singleton instance
export default new ChangellyService();