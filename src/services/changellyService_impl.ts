// @ts-nocheck
import { ChangellyFiatClient } from "@changelly/fiat-api-sdk-node";

class ChangellyServiceImpl {
    private client: any;

    constructor() {
        const privateKeyBase64 = process.env.CHANGELLY_API_SECRET || process.env.CHANGELLY_PRIVATE_KEY;
        const publicKey = process.env.CHANGELLY_API_KEY || process.env.CHANGELLY_PUBLIC_KEY;

        if (!privateKeyBase64 || !publicKey) {
            throw new Error('CHANGELLY_API_KEY and CHANGELLY_API_SECRET must be set in environment variables');
        }

        // Decode the Base64 private key
        let privateKey: string;
        try {
            // If value looks like PEM already, use it as-is
            if (privateKeyBase64.trim().startsWith('-----BEGIN')) {
                privateKey = privateKeyBase64.trim();
            } else {
                privateKey = Buffer.from(privateKeyBase64, 'base64').toString('utf-8').trim();
            }
            
            // Debug logging (REMOVE IN PRODUCTION!)
            console.log('=== Changelly Configuration ===');
            console.log('Public Key:', publicKey);
            console.log('Private Key Preview:', privateKey.substring(0, 50) + '...');
            console.log('Private Key Length:', privateKey.length);
            console.log('===============================');
            
        } catch (error) {
            console.error('Failed to decode private key:', error);
            throw new Error('Invalid private key format');
        }

        try {
            this.client = new ChangellyFiatClient({
                privateKey: privateKey,
                publicKey: publicKey.trim(),
                // Uncomment to use sandbox environment
                // apiUrl: 'https://fiat-api-sandbox.changelly.com'
            });
            console.log('✓ Changelly client initialized successfully');
        } catch (err) {
            console.error('Failed to initialize Changelly client:', (err as any)?.message || err);
            throw err;
        }
    }

    async getProviders() {
        try {
            const result = await this.client.getProviderList();
            console.log('✓ Providers fetched:', result?.length || 0);
            return result;
        } catch (error) {
            this.handleError(error, 'getProviders');
        }
    }

    async getCurrencies(params) {
        try {
            const result = await this.client.getCurrencyList(params || {});
            console.log('✓ Currencies fetched:', result?.length || 0);
            return result;
        } catch (error) {
            this.handleError(error, 'getCurrencies');
        }
    }

    async getAvailableCountries(params) {
        try {
            const result = await this.client.getCountryAvailabilityList(params || {});
            console.log('✓ Countries fetched:', result?.length || 0);
            return result;
        } catch (error) {
            this.handleError(error, 'getAvailableCountries');
        }
    }

    async getOffers(params) {
        try {
            console.log('Fetching offers with params:', params);
            const result = await this.client.getOfferList(params);
            console.log('✓ Offers fetched:', result?.length || 0);
            return result;
        } catch (error) {
            this.handleError(error, 'getOffers');
        }
    }

    async getSellOffers(params) {
        try {
            console.log('Fetching sell offers with params:', params);
            const result = await this.client.getSellOfferList(params);
            console.log('✓ Sell offers fetched:', result?.length || 0);
            return result;
        } catch (error) {
            this.handleError(error, 'getSellOffers');
        }
    }

    async createOrder(data) {
        try {
            console.log('Creating order with data:', { ...data, walletAddress: '***' });
            const result = await this.client.createOrder(data);
            console.log('✓ Order created:', result?.orderId);
            return result;
        } catch (error) {
            this.handleError(error, 'createOrder');
        }
    }

    async createSellOrder(data) {
        try {
            console.log('Creating sell order with data:', { ...data, refundAddress: '***' });
            const result = await this.client.createSellOrder(data);
            console.log('✓ Sell order created:', result?.orderId);
            return result;
        } catch (error) {
            this.handleError(error, 'createSellOrder');
        }
    }

    async validateAddress(data) {
        try {
            const result = await this.client.validateWalletAddress(data);
            console.log('✓ Address validated');
            return result;
        } catch (error) {
            this.handleError(error, 'validateAddress');
        }
    }

    async getOrders(params) {
        try {
            const result = await this.client.getOrderList(params || {});
            console.log('✓ Orders fetched:', result?.length || 0);
            return result;
        } catch (error) {
            this.handleError(error, 'getOrders');
        }
    }

    private handleError(error: any, method?: string): never {
        console.error(`Changelly SDK Error ${method ? `in ${method}` : ''}:`, error);
        console.error('Error details:', {
            message: error?.message,
            type: error?.errorType || error?.type,
            code: error?.code,
            status: error?.status || error?.statusCode,
            details: error?.errorDetails || error?.details,
            response: error?.response?.data
        });

        const errorMessage = error?.message || 'Unknown error';
        const errorType = error?.errorType || error?.type || 'unknown';
        const errorDetails = error?.errorDetails || error?.details || null;

        const err: any = new Error(`Changelly API error: ${errorMessage}`);
        err.status = error?.status || error?.statusCode || 500;
        err.errorType = errorType;
        err.errorMessage = errorMessage;
        err.errorDetails = errorDetails;

        throw err;
    }
}

export default new ChangellyServiceImpl();