export interface PriceData {
    currency: string;
    price: number;
    timestamp: Date;
}
export declare class PriceFeedService {
    private static readonly COINGECKO_API;
    private static readonly CACHE_DURATION;
    private static priceCache;
    private static inflight;
    private static MAX_CONCURRENT_REQUESTS;
    private static currentRequests;
    private static rateLimitedUntil;
    private static readonly CURRENCY_IDS;
    /**
     * Get current price for a currency in USD
     */
    static getPrice(currency: string): Promise<number>;
    /**
     * Get NGN to USD rate with multiple fallbacks
     */
    private static getNGNPrice;
    /**
     * Get conversion rate from one currency to another
     */
    static getConversionRate(fromCurrency: string, toCurrency?: string): Promise<number>;
    /**
     * Convert amount from one currency to another
     */
    static convertAmount(amount: number, fromCurrency: string, toCurrency?: string, includeSlippage?: boolean): Promise<{
        convertedAmount: number;
        rate: number;
        slippage: number;
    }>;
    /**
     * Get all current prices
     */
    static getAllPrices(): Promise<Record<string, number>>;
    /**
     * Calculate conversion with fees
     */
    static calculateConversion(amount: number, fromCurrency: string, toCurrency?: string, feePercentage?: number): Promise<{
        inputAmount: number;
        outputAmount: number;
        rate: number;
        fee: number;
        totalFeeUSD: number;
        slippage: number;
    }>;
    /**
     * Clear price cache
     */
    static clearCache(): void;
}
//# sourceMappingURL=priceFeedService.d.ts.map