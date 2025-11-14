// @ts-nocheck
import { ChangellyFiatClient } from "@changelly/fiat-api-sdk-node";
import * as crypto from 'crypto';

class ChangellyServiceImpl {
    private client: any;
    private publicKey: string;
    private privateKeyObject: any;

    constructor() {
        const privateKeyBase64 = process.env.CHANGELLY_API_SECRET || process.env.CHANGELLY_PRIVATE_KEY;
        const publicKey = process.env.CHANGELLY_API_KEY || process.env.CHANGELLY_PUBLIC_KEY;

        if (!privateKeyBase64 || !publicKey) {
            throw new Error('CHANGELLY_API_KEY and CHANGELLY_API_SECRET must be set');
        }

        this.publicKey = publicKey.trim();

        try {
            // Decode base64 to get PEM format
            const privateKeyPEM = Buffer.from(privateKeyBase64.trim(), 'base64').toString('utf-8');
            
            // Validate PEM format
            if (!privateKeyPEM.includes('-----BEGIN PRIVATE KEY-----') || 
                !privateKeyPEM.includes('-----END PRIVATE KEY-----')) {
                throw new Error('Invalid private key format. Must be PEM format');
            }

            console.log('✓ Private key decoded successfully');
            console.log('✓ Key length:', privateKeyPEM.length);

            // Create private key object for manual signing (backup method)
            this.privateKeyObject = crypto.createPrivateKey({
                key: privateKeyBase64,
                type: 'pkcs8', // Changed from pkcs1 to pkcs8 for PKCS#8 format
                format: 'pem',
                encoding: 'base64',
            });

            // Initialize SDK client
            this.client = new ChangellyFiatClient({
                privateKey: privateKeyPEM,
                publicKey: this.publicKey
            });

            console.log('✓ Changelly client initialized successfully');
        } catch (error: any) {
            console.error('Initialization error:', error.message);
            throw new Error(`Failed to initialize Changelly: ${error.message}`);
        }
    }

    // Manual API call method (fallback if SDK fails)
    private async makeManualRequest(path: string, body: any) {
        try {
            const payload = path + JSON.stringify(body);
            const signature = crypto.sign('sha256', Buffer.from(payload), this.privateKeyObject).toString('base64');

            console.log('Making manual request to:', path);
            console.log('Payload length:', payload.length);

            const response = await fetch(path, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Api-Key': this.publicKey,
                    'X-Api-Signature': signature,
                },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API Error Response:', errorText);
                throw new Error(`API request failed: ${response.status} ${response.statusText}`);
            }

            return await response.json();
        } catch (error: any) {
            console.error('Manual request error:', error);
            throw error;
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

    async getCurrencies(params: any) {
        try {
            const result = await this.client.getCurrencyList(params || {});
            console.log('✓ Currencies fetched:', result?.length || 0);
            return result;
        } catch (error) {
            this.handleError(error, 'getCurrencies');
        }
    }

    async getOffers(params: any) {
        try {
            console.log('Fetching offers with params:', params);
            const result = await this.client.getOffers(params);
            console.log('✓ Offers fetched:', result?.length || 0);
            
            if (!result || result.length === 0) {
                console.warn('No offers returned. Params:', params);
            }
            
            return result;
        } catch (error) {
            console.error('getOffers SDK error, trying manual request...');
            try {
                // Fallback to manual request
                return await this.makeManualRequest(
                    'https://fiat-api.changelly.com/v1/offers',
                    params
                );
            } catch (manualError) {
                this.handleError(error, 'getOffers');
            }
        }
    }

    async getSellOffers(params: any) {
        try {
            console.log('Fetching sell offers with params:', params);
            const result = await this.client.getSellOffers(params);
            console.log('✓ Sell offers fetched:', result?.length || 0);
            return result;
        } catch (error) {
            console.error('getSellOffers SDK error, trying manual request...');
            try {
                return await this.makeManualRequest(
                    'https://fiat-api.changelly.com/v1/sell-offers',
                    params
                );
            } catch (manualError) {
                this.handleError(error, 'getSellOffers');
            }
        }
    }

    async createOrder(data: any) {
        try {
            console.log('Creating order with SDK...');
            console.log('Order data:', {
                ...data,
                walletAddress: '***HIDDEN***',
                externalOrderId: data.externalOrderId,
                externalUserId: data.externalUserId,
                providerCode: data.providerCode,
                currencyFrom: data.currencyFrom,
                currencyTo: data.currencyTo,
                amountFrom: data.amountFrom,
                country: data.country,
                paymentMethod: data.paymentMethod
            });

            const result = await this.client.createOrder(data);
            console.log('✓ Order created successfully');
            console.log('Order ID:', result?.orderId);
            console.log('Redirect URL:', result?.redirectUrl ? 'Present' : 'Missing');
            
            return result;
        } catch (error: any) {
            console.error('createOrder SDK error:', error);
            console.error('Error details:', {
                message: error?.message,
                type: error?.type,
                code: error?.code,
                response: error?.response?.data
            });

            // Try manual request as fallback
            console.log('Attempting manual order creation...');
            try {
                return await this.makeManualRequest(
                    'https://fiat-api.changelly.com/v1/orders',
                    data
                );
            } catch (manualError) {
                console.error('Manual order creation also failed');
                this.handleError(error, 'createOrder');
            }
        }
    }

    async createSellOrder(data: any) {
        try {
            console.log('Creating sell order with data:', { ...data, refundAddress: '***' });
            const result = await this.client.createSellOrder(data);
            console.log('✓ Sell order created:', result?.orderId);
            return result;
        } catch (error) {
            console.error('createSellOrder SDK error, trying manual request...');
            try {
                return await this.makeManualRequest(
                    'https://fiat-api.changelly.com/v1/sell-orders',
                    data
                );
            } catch (manualError) {
                this.handleError(error, 'createSellOrder');
            }
        }
    }

    async validateAddress(data: any) {
        try {
            const result = await this.client.validateWalletAddress(data);
            console.log('✓ Address validated');
            return result;
        } catch (error) {
            console.error('validateAddress SDK error, trying manual request...');
            try {
                return await this.makeManualRequest(
                    'https://fiat-api.changelly.com/v1/validate-address',
                    data
                );
            } catch (manualError) {
                this.handleError(error, 'validateAddress');
            }
        }
    }

    async getOrders(params: any) {
        try {
            const result = await this.client.getOrderList(params || {});
            console.log('✓ Orders fetched:', result?.length || 0);
            return result;
        } catch (error) {
            this.handleError(error, 'getOrders');
        }
    }

    private handleError(error: any, method?: string): never {
        console.error(`\n❌ Changelly Error ${method ? `in ${method}` : ''}:`);
        console.error('Message:', error?.message);
        console.error('Type:', error?.errorType || error?.type);
        console.error('Code:', error?.code);
        console.error('Status:', error?.status || error?.statusCode);
        console.error('Details:', error?.errorDetails || error?.details);
        
        if (error?.response?.data) {
            console.error('Response data:', JSON.stringify(error.response.data, null, 2));
        }

        const errorMessage = error?.message || 'Unknown error occurred';
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