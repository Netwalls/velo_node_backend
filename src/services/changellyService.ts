// @ts-nocheck
import { ChangellyFiatClient } from "@changelly/fiat-api-sdk-node";

class ChangellyService {
    private client: any;

    constructor() {
        const privateKey = process.env.CHANGELLY_API_SECRET || process.env.CHANGELLY_PRIVATE_KEY;
        const publicKey = process.env.CHANGELLY_API_KEY || process.env.CHANGELLY_PUBLIC_KEY;

        if (!privateKey || !publicKey) {
            throw new Error('CHANGELLY_API_KEY and CHANGELLY_API_SECRET must be set in environment variables');
        }

        this.client = new ChangellyFiatClient({
            privateKey,
            publicKey,
        });
    }

    async getProviders() {
        try {
            return await this.client.getProviderList();
        } catch (error) {
            this.handleError(error);
        }
    }

    async getCurrencies(params) {
        try {
            return await this.client.getCurrencyList(params || {});
        } catch (error) {
            this.handleError(error);
        }
    }

    async getAvailableCountries(params) {
        try {
            return await this.client.getCountryAvailabilityList(params || {});
        } catch (error) {
            this.handleError(error);
        }
    }

    async getOffers(params) {
        try {
            return await this.client.getOfferList(params);
        } catch (error) {
            this.handleError(error);
        }
    }

    async getSellOffers(params) {
        try {
            return await this.client.getSellOfferList(params);
        } catch (error) {
            this.handleError(error);
        }
    }

    async createOrder(data) {
        try {
            return await this.client.createOrder(data);
        } catch (error) {
            this.handleError(error);
        }
    }

    async createSellOrder(data) {
        try {
            return await this.client.createSellOrder(data);
        } catch (error) {
            this.handleError(error);
        }
    }

    async validateAddress(data) {
        try {
            return await this.client.validateWalletAddress(data);
        } catch (error) {
            this.handleError(error);
        }
    }

    async getOrders(params) {
        try {
            return await this.client.getOrderList(params || {});
        } catch (error) {
            this.handleError(error);
        }
    }

    private handleError(error: any): never {
        console.error('Changelly SDK Error:', error);
        
        const errorMessage = error.message || 'Unknown error';
        const errorType = error.errorType || error.type || 'unknown';
        const errorDetails = error.errorDetails || error.details || null;
        
        const err: any = new Error(`Changelly API error: ${errorMessage}`);
        err.status = error.status || error.statusCode || 500;
        err.errorType = errorType;
        err.errorMessage = errorMessage;
        err.errorDetails = errorDetails;
        
        throw err;
    }
}

export default new ChangellyService();