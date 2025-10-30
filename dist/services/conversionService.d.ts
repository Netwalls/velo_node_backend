import { Conversion } from '../entities/Conversion';
export declare class ConversionService {
    /**
     * Process manual conversion request
     */
    static processManualConversion(userId: string, fromCurrency: string, toCurrency: string, amount: number, fromAddress?: string): Promise<Conversion>;
    /**
     * Process automatic conversion (triggered by incoming payments)
     */
    static processAutomaticConversion(userId: string, fromCurrency: string, amount: number, fromAddress: string, txHash: string): Promise<Conversion>;
    /**
     * Execute the actual conversion (simulate DEX interaction)
     */
    private static executeConversion;
    /**
     * Get conversion history for a user
     */
    static getConversionHistory(userId: string, page?: number, limit?: number): Promise<{
        conversions: Conversion[];
        total: number;
    }>;
    /**
     * Get user's USDT balance
     */
    static getUSDTBalance(userId: string): Promise<number>;
    /**
     * Simulate DEX selection based on currency
     */
    private static getSimulatedDEX;
    /**
     * Cancel a pending conversion
     */
    static cancelConversion(conversionId: string, userId: string): Promise<void>;
}
//# sourceMappingURL=conversionService.d.ts.map