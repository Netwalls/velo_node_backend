/**
 * Fee Collection Service
 * Handles sending collected fees to VELO treasury wallets
 */
import { Fee } from '../entities/Fee';
import { Transaction } from '../entities/Transaction';
import { FeeCalculation } from './feeService';
export interface FeeTransferResult {
    success: boolean;
    feeAmount: string;
    treasuryAddress: string;
    txHash?: string;
    error?: string;
}
export declare class FeeCollectionService {
    /**
     * Record fee in database
     * Called after successful transaction to log the fee
     */
    static recordFee(params: {
        userId: string;
        transactionId?: string;
        calculation: FeeCalculation;
        chain: string;
        network: string;
        currency?: string;
        feeType?: string;
        description?: string;
    }): Promise<Fee>;
    /**
     * Get treasury wallet for fee collection
     */
    static getTreasuryWallet(chain: string, network: string): string;
    /**
     * Validate if treasury is configured for a chain/network
     */
    static isTreasuryConfigured(chain: string, network: string): boolean;
    /**
     * Calculate total fee deduction from sender
     * This is what needs to be deducted from sender's balance
     */
    static calculateTotalDeduction(amount: number, fee: number): number;
    /**
     * Validate sender has sufficient balance for amount + fee
     */
    static validateSufficientBalance(senderBalance: number, amount: number, fee: number): {
        valid: boolean;
        required: number;
        shortfall?: number;
    };
    /**
     * Create fee transfer transaction record
     * This records the internal fee transfer to treasury
     */
    static createFeeTransferRecord(params: {
        userId: string;
        feeAmount: string;
        chain: string;
        network: string;
        fromAddress: string;
        treasuryAddress: string;
        originalTxId?: string;
    }): Promise<Transaction>;
    /**
     * Mark fee transfer as completed
     */
    static completeFeeTransfer(feeTransactionId: string, txHash: string): Promise<void>;
    /**
     * Mark fee transfer as failed
     */
    static failFeeTransfer(feeTransactionId: string, error: string): Promise<void>;
    /**
     * Get fee collection statistics
     */
    static getFeeStats(params?: {
        startDate?: Date;
        endDate?: Date;
        chain?: string;
        network?: string;
    }): Promise<{
        transactionCount: number;
        totalFeesCollected: number;
        totalVolume: number;
        averageFee: number;
        effectiveRate: number;
    }>;
}
export default FeeCollectionService;
//# sourceMappingURL=feeCollectionService.d.ts.map