export interface ExchangeRates {
    tether: {
        ngn: number;
    };
    'usd-coin': {
        ngn: number;
    };
    starknet: {
        ngn: number;
    };
    ethereum: {
        ngn: number;
    };
    bitcoin: {
        ngn: number;
    };
    solana: {
        ngn: number;
    };
    polkadot: {
        ngn: number;
    };
    stellar: {
        ngn: number;
    };
}
export declare class ExchangeRateService {
    private readonly COINGECKO_API_URL;
    private cache;
    private readonly CACHE_DURATION;
    /**
     * Get current exchange rates from CoinGecko
     */
    getExchangeRates(): Promise<ExchangeRates>;
    /**
     * Get specific cryptocurrency rate in NGN
     */
    getCryptoRate(cryptoId: string): Promise<number>;
    /**
     * Convert fiat amount to crypto amount
     */
    convertFiatToCrypto(fiatAmount: number, cryptoId: string): Promise<number>;
    /**
     * Convert crypto amount to fiat amount
     */
    convertCryptoToFiat(cryptoAmount: number, cryptoId: string): Promise<number>;
    /**
     * Get all rates for display
     */
    getAllRates(): Promise<{
        USDT: number;
        USDC: number;
        STRK: number;
        ETH: number;
        BTC: number;
        SOL: number;
        DOT: number;
        XLM: number;
        lastUpdated: string;
    }>;
}
export declare const exchangeRateService: ExchangeRateService;
//# sourceMappingURL=exchangeRateService.d.ts.map