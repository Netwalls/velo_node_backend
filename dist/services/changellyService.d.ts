export default class ChangellyService {
    static getProviders(): Promise<any>;
    static getCurrencies(query?: {
        type?: string;
        providerCode?: string;
        supportedFlow?: string;
    }): Promise<any>;
    static getAvailableCountries(query?: {
        providerCode?: string;
        supportedFlow?: string;
    }): Promise<any>;
    static getOffers(query: {
        currencyFrom: string;
        currencyTo: string;
        amountFrom: string;
        country: string;
        providerCode?: string;
        externalUserId?: string;
        ip?: string;
    }): Promise<any>;
    static getSellOffers(query: {
        currencyFrom: string;
        currencyTo: string;
        amountFrom: string;
        country: string;
        providerCode?: string;
        ip?: string;
        paymentMethodCode?: string;
    }): Promise<any>;
    static getOrders(query?: any): Promise<any>;
    static createOrder(body: any): Promise<any>;
    static createSellOrder(body: any): Promise<any>;
    static validateAddress(body: {
        currency: string;
        walletAddress: string;
        walletExtraId?: string;
    }): Promise<any>;
}
//# sourceMappingURL=changellyService.d.ts.map