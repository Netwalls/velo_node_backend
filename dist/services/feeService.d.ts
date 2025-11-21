/**
 * VELO Fee Service
 * Implements the Normal Transaction Model
 *
 * Fee Tiers:
 * - $0 - $10: $0.00 (no VELO fee)
 * - $10.01 - $50: $0.10
 * - $51 - $100: $0.25
 * - $101 - $500: $1.00
 * - $501 - $1,000: $2.00
 * - $1,001+: 0.5% (percentage-based)
 */
export interface FeeCalculation {
    amount: number;
    fee: number;
    total: number;
    tier: string;
    feePercentage: number;
    recipientReceives: number;
    senderPays: number;
}
export interface FeeTier {
    min: number;
    max: number | null;
    fee: number | null;
    percentage: number | null;
    description: string;
}
export declare class FeeService {
    private static readonly FEE_TIERS;
    /**
     * Calculate transaction fee based on amount
     * @param amount - Transaction amount in USD or USD equivalent
     * @returns FeeCalculation object with fee details
     */
    static calculateFee(amount: number): FeeCalculation;
    /**
     * Calculate fee from total amount (reverse calculation)
     * Useful when user specifies total and we need to extract the fee
     * @param total - Total amount including fee
     * @returns FeeCalculation object
     */
    static calculateFeeFromTotal(total: number): FeeCalculation;
    /**
     * Get all fee tiers configuration
     * @returns Array of fee tiers
     */
    static getFeeTiers(): FeeTier[];
    /**
     * Get fee configuration as a simple object
     * Useful for frontend display
     */
    static getFeeConfig(): {
        tiers: {
            range: string;
            fee: string;
            description: string;
        }[];
        model: string;
        version: string;
        lastUpdated: string;
    };
    /**
     * Batch calculate fees for multiple transactions
     * @param amounts - Array of transaction amounts
     * @returns Array of fee calculations
     */
    static calculateBatchFees(amounts: number[]): FeeCalculation[];
    /**
     * Calculate total fees for a batch of transactions
     * @param amounts - Array of transaction amounts
     * @returns Summary of total amounts and fees
     */
    static calculateBatchSummary(amounts: number[]): {
        transactions: number;
        totalAmount: number;
        totalFee: number;
        totalPayable: number;
        averageFeePercentage: number;
        breakdown: FeeCalculation[];
    };
    /**
     * Validate if fee is correctly applied to amount
     * @param amount - Original amount
     * @param fee - Applied fee
     * @param tolerance - Acceptable difference (default 0.01)
     * @returns boolean indicating if fee is valid
     */
    static validateFee(amount: number, fee: number, tolerance?: number): boolean;
    /**
     * Get minimum transaction amount (where fee doesn't exceed amount)
     * For VELO, minimum is $0.10 fee for $0-$50 range
     * @returns minimum transaction amount
     */
    static getMinimumTransactionAmount(): number;
    /**
     * Calculate net amount received by recipient (amount - fee)
     * Used when sender pays the fee
     * @param amount - Gross amount
     * @returns Net amount after fee deduction
     */
    static calculateNetAmount(amount: number): {
        net: number;
        fee: number;
    };
}
export default FeeService;
//# sourceMappingURL=feeService.d.ts.map