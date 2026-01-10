import { AppDataSource } from '../config/database';
import { Transaction } from '../entities/Transaction';
import { User } from '../entities/User';
import { AuthRequest } from '../types';
import { Response } from 'express';
import { FeeService } from '../services/feeService';
import FeeCollectionService from '../services/feeCollectionService';
import TreasuryConfig from '../config/treasury';

export class TransactionController {
    static async getHistory(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { page = 1, limit = 20 } = req.query;
            const transactionRepo = AppDataSource.getRepository(Transaction);

            const [transactions, total] = await transactionRepo.findAndCount({
                where: { userId: req.user!.id },
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
        } catch (error) {
            console.error('Get transaction history error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    static async sendTransaction(
        req: AuthRequest,
        res: Response
    ): Promise<void> {
        try {
            const { amount, currency, toAddress: rawToAddress, toUsername, chain = 'ethereum', network = 'mainnet' } = req.body;
            let toAddress = rawToAddress;

            if (!req.user) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            // Validate required fields
            if (!amount) {
                res.status(400).json({ error: 'Amount is required' });
                return;
            }

            // If recipient address not provided but username is, attempt to resolve
            if (!toAddress && toUsername) {
                const userRepo = AppDataSource.getRepository(User);
                const targetUser = await userRepo.findOne({ where: { username: toUsername }, relations: ['addresses'] });
                if (!targetUser) {
                    res.status(404).json({ error: 'Username not found' });
                    return;
                }

                const matchedAddresses = (targetUser.addresses || []).filter(a => {
                    // compare chain and network as strings to be tolerant of enums
                    return String(a.chain) === String(chain) && String(a.network) === String(network) && a.address;
                });

                if (!matchedAddresses || matchedAddresses.length === 0) {
                    res.status(404).json({ error: 'Username not found for requested chain/network' });
                    return;
                }

                if (matchedAddresses.length > 1) {
                    // ambiguous - client must pick an address explicitly
                    res.status(409).json({
                        error: 'Multiple addresses found for username on requested chain/network',
                        addresses: matchedAddresses.map(a => ({ id: a.id, address: a.address }))
                    });
                    return;
                }

                // exactly one match
                toAddress = matchedAddresses[0].address;
            }

            if (!toAddress) {
                res.status(400).json({ error: 'Recipient address or username is required' });
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
            const feeCalculation = FeeService.calculateFee(amountNum);
            console.log('Fee calculation:', feeCalculation);

            // STEP 2: Get treasury wallet address for fee collection
            let treasuryAddress: string;
            try {
                treasuryAddress = TreasuryConfig.getTreasuryWallet(chain, network);
            } catch (error: any) {
                res.status(500).json({ 
                    error: 'Treasury wallet not configured',
                    details: error?.message || 'Please configure treasury wallet for this chain'
                });
                return;
            }

            // STEP 3: Validate sender has sufficient balance (amount + fee)
            // TODO: Implement actual balance check from blockchain/wallet
            // For now, we'll assume validation happens on blockchain side
            
            console.log(`Transaction breakdown:\n
                - Recipient receives: $${feeCalculation.recipientReceives}
                - Fee: $${feeCalculation.fee}
                - Sender pays total: $${feeCalculation.senderPays}
                - Treasury wallet: ${treasuryAddress}
            `);

            // STEP 4: Execute main transaction (send to recipient)
            // TODO: Implement actual blockchain transaction
            // This is a placeholder - replace with actual wallet/blockchain logic
            const recipientTxHash = `0x${Math.random().toString(16).substring(2)}`;
            
            const recipientTransaction = await AppDataSource.getRepository(Transaction).save({
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
            
            const feeTransaction = await AppDataSource.getRepository(Transaction).save({
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
            await FeeCollectionService.recordFee({
                userId: req.user.id!,
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
        } catch (error) {
            console.error('Send transaction error:', error);
            res.status(500).json({ 
                error: 'Transaction failed',
                details: error instanceof Error ? error.message : 'Internal server error'
            });
        }
    }

    static async sendTransactionByUsername(
        req: AuthRequest,
        res: Response
    ): Promise<void> {
        try {
            const { toUsername, chain = 'ethereum', network = 'mainnet' } = req.body || {};

            if (!toUsername) {
                res.status(400).json({ error: 'toUsername is required' });
                return;
            }

            const userRepo = AppDataSource.getRepository(User);
            const targetUser = await userRepo.findOne({ where: { username: toUsername }, relations: ['addresses'] });
            if (!targetUser) {
                res.status(404).json({ error: 'Username not found' });
                return;
            }

            const matchedAddresses = (targetUser.addresses || []).filter(a => {
                return String(a.chain) === String(chain) && String(a.network) === String(network) && a.address;
            });

            if (!matchedAddresses || matchedAddresses.length === 0) {
                res.status(404).json({ error: 'Username not found for requested chain/network' });
                return;
            }

            if (matchedAddresses.length > 1) {
                res.status(409).json({
                    error: 'Multiple addresses found for username on requested chain/network',
                    addresses: matchedAddresses.map(a => ({ id: a.id, address: a.address }))
                });
                return;
            }

            // Attach resolved address to request body and delegate to existing sendTransaction
            req.body = { ...(req.body || {}), toAddress: matchedAddresses[0].address };
            await TransactionController.sendTransaction(req, res);
        } catch (error) {
            console.error('sendTransactionByUsername error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}
