"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionController = void 0;
const database_1 = require("../config/database");
const Transaction_1 = require("../entities/Transaction");
const feeService_1 = require("../services/feeService");
const feeCollectionService_1 = __importDefault(require("../services/feeCollectionService"));
const treasury_1 = __importDefault(require("../config/treasury"));
class TransactionController {
    static async getHistory(req, res) {
        try {
            const { page = 1, limit = 20 } = req.query;
            const transactionRepo = database_1.AppDataSource.getRepository(Transaction_1.Transaction);
            const [transactions, total] = await transactionRepo.findAndCount({
                where: { userId: req.user.id },
                order: { createdAt: 'DESC' },
                take: Number(limit),
                skip: (Number(page) - 1) * Number(limit),
            });
            res.json({
                transactions,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    totalPages: Math.ceil(total / Number(limit)),
                },
            });
        }
        catch (error) {
            console.error('Get transaction history error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    static async sendTransaction(req, res) {
        try {
            const { amount, currency, toAddress, chain = 'ethereum', network = 'mainnet' } = req.body;
            if (!req.user) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }
            // Validate required fields
            if (!amount || !toAddress) {
                res.status(400).json({ error: 'Amount and recipient address are required' });
                return;
            }
            const amountNum = parseFloat(amount);
            if (isNaN(amountNum) || amountNum <= 0) {
                res.status(400).json({ error: 'Invalid amount' });
                return;
            }
            // Get user address
            const userAddress = req.user.addresses?.[0];
            if (!userAddress || !userAddress.address) {
                res.status(400).json({ error: 'User address not found' });
                return;
            }
            // STEP 1: Calculate fee
            const feeCalculation = feeService_1.FeeService.calculateFee(amountNum);
            console.log('Fee calculation:', feeCalculation);
            // STEP 2: Get treasury wallet address for fee collection
            let treasuryAddress;
            try {
                treasuryAddress = treasury_1.default.getTreasuryWallet(chain, network);
            }
            catch (error) {
                res.status(500).json({
                    error: 'Treasury wallet not configured',
                    details: error?.message || 'Please configure treasury wallet for this chain'
                });
                return;
            }
            // STEP 3: Validate sender has sufficient balance (amount + fee)
            // TODO: Implement actual balance check from blockchain/wallet
            // For now, we'll assume validation happens on blockchain side
            console.log(`Transaction breakdown:
                - Recipient receives: $${feeCalculation.recipientReceives}
                - Fee: $${feeCalculation.fee}
                - Sender pays total: $${feeCalculation.senderPays}
                - Treasury wallet: ${treasuryAddress}
            `);
            // STEP 4: Execute main transaction (send to recipient)
            // TODO: Implement actual blockchain transaction
            // This is a placeholder - replace with actual wallet/blockchain logic
            const recipientTxHash = `0x${Math.random().toString(16).substring(2)}`;
            const recipientTransaction = await database_1.AppDataSource.getRepository(Transaction_1.Transaction).save({
                userId: req.user.id,
                type: 'send',
                amount: feeCalculation.recipientReceives,
                chain: chain,
                network: network,
                toAddress,
                fromAddress: userAddress.address,
                txHash: recipientTxHash,
                status: 'confirmed',
                details: {
                    originalAmount: amountNum,
                    fee: feeCalculation.fee,
                    total: feeCalculation.senderPays,
                    tier: feeCalculation.tier
                },
                createdAt: new Date(),
            });
            // STEP 5: Execute fee collection transaction (send to treasury)
            // TODO: Implement actual blockchain transaction for fee
            const feeTxHash = `0x${Math.random().toString(16).substring(2)}`;
            const feeTransaction = await database_1.AppDataSource.getRepository(Transaction_1.Transaction).save({
                userId: req.user.id,
                type: 'fee_collection',
                amount: feeCalculation.fee,
                chain: chain,
                network: network,
                toAddress: treasuryAddress,
                fromAddress: userAddress.address,
                txHash: feeTxHash,
                status: 'confirmed',
                details: {
                    feeType: 'normal_transaction',
                    originalTransactionId: recipientTransaction.id,
                    tier: feeCalculation.tier
                },
                createdAt: new Date(),
            });
            // STEP 6: Record fee in database for analytics
            await feeCollectionService_1.default.recordFee({
                userId: req.user.id,
                transactionId: recipientTransaction.id,
                calculation: feeCalculation,
                chain: chain,
                network: network,
                currency: currency || 'USD',
                feeType: 'normal_transaction',
                description: `Transaction fee for sending ${amount} to ${toAddress}`
            });
            res.json({
                success: true,
                message: 'Transaction completed successfully',
                transaction: {
                    id: recipientTransaction.id,
                    recipientReceives: feeCalculation.recipientReceives,
                    fee: feeCalculation.fee,
                    senderPays: feeCalculation.senderPays,
                    tier: feeCalculation.tier,
                    recipientTxHash: recipientTxHash,
                    feeTxHash: feeTxHash,
                    treasuryAddress: treasuryAddress,
                    breakdown: {
                        amount: feeCalculation.amount,
                        fee: feeCalculation.fee,
                        total: feeCalculation.total,
                        feePercentage: `${feeCalculation.feePercentage}%`
                    }
                }
            });
        }
        catch (error) {
            console.error('Send transaction error:', error);
            res.status(500).json({
                error: 'Transaction failed',
                details: error instanceof Error ? error.message : 'Internal server error'
            });
        }
    }
}
exports.TransactionController = TransactionController;
//# sourceMappingURL=transactionController.js.map