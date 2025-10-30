"use strict";
/**
 * Fee Collection Service
 * Handles sending collected fees to VELO treasury wallets
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeeCollectionService = void 0;
const database_1 = require("../config/database");
const Fee_1 = require("../entities/Fee");
const Transaction_1 = require("../entities/Transaction");
const treasury_1 = __importDefault(require("../config/treasury"));
class FeeCollectionService {
    /**
     * Record fee in database
     * Called after successful transaction to log the fee
     */
    static async recordFee(params) {
        const feeRepo = database_1.AppDataSource.getRepository(Fee_1.Fee);
        const feeRecord = feeRepo.create({
            userId: params.userId,
            transactionId: params.transactionId,
            amount: params.calculation.amount.toString(),
            fee: params.calculation.fee.toString(),
            total: params.calculation.total.toString(),
            tier: params.calculation.tier,
            feePercentage: params.calculation.feePercentage.toString(),
            feeType: params.feeType || 'normal_transaction',
            currency: params.currency || 'USD',
            chain: params.chain,
            network: params.network,
            description: params.description,
            metadata: {
                recipientReceives: params.calculation.recipientReceives,
                senderPays: params.calculation.senderPays
            }
        });
        await feeRepo.save(feeRecord);
        return feeRecord;
    }
    /**
     * Get treasury wallet for fee collection
     */
    static getTreasuryWallet(chain, network) {
        return treasury_1.default.getTreasuryWallet(chain, network);
    }
    /**
     * Validate if treasury is configured for a chain/network
     */
    static isTreasuryConfigured(chain, network) {
        return treasury_1.default.isTreasuryConfigured(chain, network);
    }
    /**
     * Calculate total fee deduction from sender
     * This is what needs to be deducted from sender's balance
     */
    static calculateTotalDeduction(amount, fee) {
        return Math.round((amount + fee) * 100) / 100;
    }
    /**
     * Validate sender has sufficient balance for amount + fee
     */
    static validateSufficientBalance(senderBalance, amount, fee) {
        const required = this.calculateTotalDeduction(amount, fee);
        const valid = senderBalance >= required;
        return {
            valid,
            required,
            shortfall: valid ? undefined : Math.round((required - senderBalance) * 100) / 100
        };
    }
    /**
     * Create fee transfer transaction record
     * This records the internal fee transfer to treasury
     */
    static async createFeeTransferRecord(params) {
        const txRepo = database_1.AppDataSource.getRepository(Transaction_1.Transaction);
        const feeTx = txRepo.create({
            userId: params.userId,
            type: 'fee_collection',
            amount: parseFloat(params.feeAmount),
            chain: params.chain,
            network: params.network,
            fromAddress: params.fromAddress,
            toAddress: params.treasuryAddress,
            txHash: '', // Will be updated when fee is actually transferred
            status: 'pending',
            details: {
                feeType: 'normal_transaction',
                originalTransactionId: params.originalTxId,
                isFeeCollection: true
            }
        });
        await txRepo.save(feeTx);
        return feeTx;
    }
    /**
     * Mark fee transfer as completed
     */
    static async completeFeeTransfer(feeTransactionId, txHash) {
        const txRepo = database_1.AppDataSource.getRepository(Transaction_1.Transaction);
        const feeTx = await txRepo.findOne({ where: { id: feeTransactionId } });
        if (feeTx) {
            feeTx.status = 'confirmed';
            feeTx.txHash = txHash;
            feeTx.details = {
                ...(feeTx.details || {}),
                completedAt: new Date().toISOString()
            };
            await txRepo.save(feeTx);
        }
    }
    /**
     * Mark fee transfer as failed
     */
    static async failFeeTransfer(feeTransactionId, error) {
        const txRepo = database_1.AppDataSource.getRepository(Transaction_1.Transaction);
        const feeTx = await txRepo.findOne({ where: { id: feeTransactionId } });
        if (feeTx) {
            feeTx.status = 'failed';
            feeTx.error = error;
            feeTx.details = {
                ...(feeTx.details || {}),
                failedAt: new Date().toISOString()
            };
            await txRepo.save(feeTx);
        }
    }
    /**
     * Get fee collection statistics
     */
    static async getFeeStats(params) {
        const feeRepo = database_1.AppDataSource.getRepository(Fee_1.Fee);
        let query = feeRepo.createQueryBuilder('fee');
        if (params?.startDate) {
            query = query.andWhere('fee.createdAt >= :startDate', { startDate: params.startDate });
        }
        if (params?.endDate) {
            query = query.andWhere('fee.createdAt <= :endDate', { endDate: params.endDate });
        }
        if (params?.chain) {
            query = query.andWhere('fee.chain = :chain', { chain: params.chain });
        }
        if (params?.network) {
            query = query.andWhere('fee.network = :network', { network: params.network });
        }
        const fees = await query.getMany();
        const totalFees = fees.reduce((sum, fee) => sum + parseFloat(fee.fee), 0);
        const totalVolume = fees.reduce((sum, fee) => sum + parseFloat(fee.amount), 0);
        return {
            transactionCount: fees.length,
            totalFeesCollected: Math.round(totalFees * 100) / 100,
            totalVolume: Math.round(totalVolume * 100) / 100,
            averageFee: fees.length > 0 ? Math.round((totalFees / fees.length) * 100) / 100 : 0,
            effectiveRate: totalVolume > 0 ? Math.round((totalFees / totalVolume * 100) * 100) / 100 : 0
        };
    }
}
exports.FeeCollectionService = FeeCollectionService;
exports.default = FeeCollectionService;
//# sourceMappingURL=feeCollectionService.js.map