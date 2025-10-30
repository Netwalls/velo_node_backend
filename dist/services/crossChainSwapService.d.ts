export interface CrossChainQuote {
    fromCurrency: string;
    toCurrency: string;
    fromAmount: string;
    toAmount: string;
    rate: string;
    fee: string;
    provider: 'changelly' | 'native';
    estimatedTime?: string;
    payinAddress?: string;
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
export declare class CrossChainSwapService {
    /**
     * Get available currencies from Changelly
     */
    static getCurrencies(): Promise<string[]>;
    /**
     * Get minimum swap amount for a currency pair
     */
    static getMinAmount(from: string, to: string): Promise<number>;
    /**
     * Get estimated exchange amount (floating rate)
     */
    static getExchangeAmount(from: string, to: string, amount: string): Promise<CrossChainQuote>;
    /**
     * Get fixed-rate quote (recommended for production)
     */
    static getFixedRateQuote(from: string, to: string, amount: string): Promise<CrossChainQuote>;
    /**
     * Create a floating-rate swap transaction
     */
    static createTransaction(from: string, to: string, amount: string, recipientAddress: string, refundAddress?: string): Promise<CrossChainSwapResult>;
    /**
     * Create a fixed-rate swap transaction
     */
    static createFixedRateTransaction(rateId: string, recipientAddress: string, refundAddress?: string): Promise<CrossChainSwapResult>;
    /**
     * Get transaction status
     */
    static getTransactionStatus(transactionId: string): Promise<any>;
    /**
     * Validate recipient address for a given currency
     */
    static validateAddress(currency: string, address: string): Promise<{
        valid: boolean;
        message?: string;
    }>;
    /**
     * Check if a pair is supported for cross-chain swap
     */
    static isCrossChainPair(fromChain: string, toChain: string): boolean;
    /**
     * Get supported chain pairs
     */
    static getSupportedChains(): string[];
}
export default CrossChainSwapService;
//# sourceMappingURL=crossChainSwapService.d.ts.map