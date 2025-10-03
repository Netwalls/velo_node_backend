import { Request, Response } from 'express';
import { AuthRequest } from '../types';
import { AppDataSource } from '../config/database';
import { SplitPayment, SplitPaymentStatus } from '../entities/SplitPayment';
import { SplitPaymentRecipient } from '../entities/SplitPaymentRecipient';
import {
    SplitPaymentExecution,
    ExecutionStatus,
} from '../entities/SplitPaymentExecution';
import {
    SplitPaymentExecutionResult,
    PaymentResultStatus,
} from '../entities/SplitPaymentExecutionResult';
import { UserAddress } from '../entities/UserAddress';
import { Notification } from '../entities/Notification';
import { NotificationType } from '../types/index';
import { ethers } from 'ethers';
import {
    Connection,
    PublicKey,
    Keypair,
    SystemProgram,
    Transaction as SolTx,
    sendAndConfirmTransaction,
} from '@solana/web3.js';
import ECPairFactory from 'ecpair';
import * as ecc from 'tiny-secp256k1';
import { ChainType, NetworkType } from '../types';

const ECPair = ECPairFactory(ecc);

export class SplitPaymentController {
    /**
     * Create a new reusable split payment template
     * POST /split-payment/create
     */
    static async createSplitPayment(
        req: AuthRequest,
        res: Response
    ): Promise<void> {
        try {
            const {
                title,
                description,
                chain,
                network,
                fromAddress,
                recipients, // Array of { address, amount, name?, email? }
            } = req.body;

            // Validation
            if (!title || !chain || !network || !fromAddress || !recipients) {
                res.status(400).json({
                    error: 'Missing required fields: title, chain, network, fromAddress, recipients',
                });
                return;
            }

            if (!Array.isArray(recipients) || recipients.length === 0) {
                res.status(400).json({
                    error: 'Recipients must be a non-empty array',
                });
                return;
            }

            if (recipients.length > 1000) {
                res.status(400).json({
                    error: 'Maximum 1000 recipients allowed per split',
                });
                return;
            }

            // Validate each recipient
            for (const recipient of recipients) {
                if (!recipient.address || !recipient.amount) {
                    res.status(400).json({
                        error: 'Each recipient must have address and amount',
                    });
                    return;
                }

                if (Number(recipient.amount) <= 0) {
                    res.status(400).json({
                        error: 'All amounts must be positive',
                    });
                    return;
                }
            }

            // Verify user owns the fromAddress
            const userAddressRepo = AppDataSource.getRepository(UserAddress);
            const userAddress = await userAddressRepo.findOne({
                where: {
                    userId: req.user!.id,
                    address: fromAddress,
                    chain: chain as ChainType,
                    network: network as NetworkType,
                },
            });

            if (!userAddress) {
                res.status(404).json({
                    error: 'Sender address not found in your wallet',
                });
                return;
            }

            // Calculate total amount
            const totalAmount = recipients.reduce(
                (sum, recipient) => sum + Number(recipient.amount),
                0
            );

            // Create split payment template
            const splitPaymentRepo = AppDataSource.getRepository(SplitPayment);
            const splitPayment = splitPaymentRepo.create({
                userId: req.user!.id,
                title,
                description,
                chain,
                network,
                currency: getCurrencyFromChain(chain),
                fromAddress,
                totalAmount: totalAmount.toString(),
                totalRecipients: recipients.length,
                status: SplitPaymentStatus.ACTIVE,
            });

            const savedSplitPayment = await splitPaymentRepo.save(splitPayment);

            // Create recipient templates
            const recipientRepo = AppDataSource.getRepository(
                SplitPaymentRecipient
            );
            const recipientRecords = recipients.map((recipient: any) =>
                recipientRepo.create({
                    splitPaymentId: savedSplitPayment.id,
                    recipientAddress: recipient.address,
                    recipientName: recipient.name,
                    recipientEmail: recipient.email,
                    amount: recipient.amount.toString(),
                    isActive: true,
                })
            );

            await recipientRepo.save(recipientRecords);

            // Create notification for split creation
            const notificationRepo = AppDataSource.getRepository(Notification);
            await notificationRepo.save({
                userId: req.user!.id,
                type: NotificationType.SEND, // Could create new type: SPLIT_CREATED
                title: 'Split Payment Created',
                message: `Split payment "${title}" created with ${recipients.length} recipients`,
                details: {
                    splitPaymentId: savedSplitPayment.id,
                    title: savedSplitPayment.title,
                    totalAmount: savedSplitPayment.totalAmount,
                    totalRecipients: savedSplitPayment.totalRecipients,
                    chain: savedSplitPayment.chain,
                    network: savedSplitPayment.network,
                    action: 'created',
                },
                isRead: false,
                createdAt: new Date(),
            });

            res.status(201).json({
                message: 'Split payment template created successfully',
                splitPayment: {
                    id: savedSplitPayment.id,
                    title: savedSplitPayment.title,
                    description: savedSplitPayment.description,
                    totalAmount: savedSplitPayment.totalAmount,
                    totalRecipients: savedSplitPayment.totalRecipients,
                    chain: savedSplitPayment.chain,
                    network: savedSplitPayment.network,
                    status: savedSplitPayment.status,
                    executionCount: 0,
                    createdAt: savedSplitPayment.createdAt,
                },
                recipients: recipientRecords.map((r) => ({
                    address: r.recipientAddress,
                    name: r.recipientName,
                    amount: r.amount,
                })),
            });
        } catch (error) {
            console.error('Create split payment error:', error);
            res.status(500).json({
                error: 'Failed to create split payment',
                details: error instanceof Error ? error.message : String(error),
            });
        }
    }

    /**
     * Execute a split payment (can be done multiple times)
     * POST /split-payment/:id/execute
     */
    static async executeSplitPayment(
        req: AuthRequest,
        res: Response
    ): Promise<void> {
        try {
            const { id } = req.params;

            const splitPaymentRepo = AppDataSource.getRepository(SplitPayment);
            const splitPayment = await splitPaymentRepo.findOne({
                where: { id, userId: req.user!.id },
                relations: ['recipients'],
            });

            if (!splitPayment) {
                res.status(404).json({ error: 'Split payment not found' });
                return;
            }

            if (splitPayment.status !== SplitPaymentStatus.ACTIVE) {
                res.status(400).json({
                    error: `Split payment is ${splitPayment.status} and cannot be executed`,
                });
                return;
            }

            // Get only active recipients
            const activeRecipients = splitPayment.recipients.filter(
                (r) => r.isActive
            );
            if (activeRecipients.length === 0) {
                res.status(400).json({
                    error: 'No active recipients found',
                });
                return;
            }

            // Create execution record
            const executionRepo = AppDataSource.getRepository(
                SplitPaymentExecution
            );
            const execution = executionRepo.create({
                splitPaymentId: splitPayment.id,
                totalAmount: splitPayment.totalAmount,
                totalRecipients: activeRecipients.length,
                status: ExecutionStatus.PROCESSING,
            });

            const savedExecution = await executionRepo.save(execution);

            // Get user's private key
            const userAddressRepo = AppDataSource.getRepository(UserAddress);
            const userAddress = await userAddressRepo.findOne({
                where: {
                    userId: req.user!.id,
                    address: splitPayment.fromAddress,
                    chain: splitPayment.chain as ChainType,
                    network: splitPayment.network as NetworkType,
                },
            });

            if (!userAddress?.encryptedPrivateKey) {
                throw new Error('Private key not found for sender address');
            }

            const { decrypt } = require('../utils/keygen');
            const privateKey = decrypt(userAddress.encryptedPrivateKey);

            // Process payments based on chain
            let results;
            if (
                splitPayment.chain === 'ethereum' ||
                splitPayment.chain === 'usdt_erc20'
            ) {
                results = await SplitPaymentController.processEthereumBatch(
                    splitPayment,
                    activeRecipients,
                    privateKey
                );
            } else if (splitPayment.chain === 'bitcoin') {
                results = await SplitPaymentController.processBitcoinBatch(
                    splitPayment,
                    activeRecipients,
                    privateKey
                );
            } else if (splitPayment.chain === 'solana') {
                results = await SplitPaymentController.processSolanaBatch(
                    splitPayment,
                    activeRecipients,
                    privateKey
                );
            } else {
                throw new Error(
                    `Chain ${splitPayment.chain} not supported for split payments`
                );
            }

            // Update execution status
            const successCount = results.filter((r) => r.success).length;
            const failedCount = results.filter((r) => !r.success).length;

            savedExecution.successfulPayments = successCount;
            savedExecution.failedPayments = failedCount;
            savedExecution.completedAt = new Date();

            if (failedCount === 0) {
                savedExecution.status = ExecutionStatus.COMPLETED;
            } else if (successCount > 0) {
                savedExecution.status = ExecutionStatus.PARTIALLY_FAILED;
            } else {
                savedExecution.status = ExecutionStatus.FAILED;
            }

            await executionRepo.save(savedExecution);

            // Save execution results
            const resultRepo = AppDataSource.getRepository(
                SplitPaymentExecutionResult
            );
            for (let i = 0; i < results.length; i++) {
                const result = results[i];
                const recipient = activeRecipients[i];

                await resultRepo.save({
                    executionId: savedExecution.id,
                    recipientAddress: recipient.recipientAddress,
                    recipientName: recipient.recipientName,
                    recipientEmail: recipient.recipientEmail,
                    amount: recipient.amount,
                    status: result.success
                        ? PaymentResultStatus.SUCCESS
                        : PaymentResultStatus.FAILED,
                    txHash: result.txHash,
                    errorMessage: result.error,
                    processedAt: new Date(),
                });
            }

            // Update split payment execution count and last executed time
            splitPayment.executionCount += 1;
            splitPayment.lastExecutedAt = new Date();
            await splitPaymentRepo.save(splitPayment);

            // Create notification for execution
            const notificationRepo = AppDataSource.getRepository(Notification);
            await notificationRepo.save({
                userId: req.user!.id,
                type: NotificationType.SEND,
                title:
                    savedExecution.status === ExecutionStatus.COMPLETED
                        ? 'Split Payment Executed Successfully'
                        : 'Split Payment Partially Completed',
                message: `"${splitPayment.title}" executed: ${successCount} successful, ${failedCount} failed`,
                details: {
                    splitPaymentId: splitPayment.id,
                    executionId: savedExecution.id,
                    title: splitPayment.title,
                    totalAmount: splitPayment.totalAmount,
                    successfulPayments: successCount,
                    failedPayments: failedCount,
                    chain: splitPayment.chain,
                    network: splitPayment.network,
                    action: 'executed',
                    executionNumber: splitPayment.executionCount,
                },
                isRead: false,
                createdAt: new Date(),
            });

            res.status(200).json({
                message: 'Split payment executed successfully',
                execution: {
                    id: savedExecution.id,
                    status: savedExecution.status,
                    total: results.length,
                    successful: successCount,
                    failed: failedCount,
                    executionNumber: splitPayment.executionCount,
                },
                splitPayment: {
                    id: splitPayment.id,
                    title: splitPayment.title,
                    totalExecutions: splitPayment.executionCount,
                    lastExecutedAt: splitPayment.lastExecutedAt,
                },
                results: results.map((r, i) => ({
                    recipient: activeRecipients[i].recipientAddress,
                    name: activeRecipients[i].recipientName,
                    amount: activeRecipients[i].amount,
                    success: r.success,
                    txHash: r.txHash,
                    error: r.error,
                })),
            });
        } catch (error) {
            console.error('Execute split payment error:', error);
            res.status(500).json({
                error: 'Failed to execute split payment',
                details: error instanceof Error ? error.message : String(error),
            });
        }
    }

    /**
     * Get all split payment templates (reusable)
     * GET /split-payment/templates
     */
    static async getSplitPaymentTemplates(
        req: AuthRequest,
        res: Response
    ): Promise<void> {
        try {
            const { status = 'active' } = req.query;

            const splitPaymentRepo = AppDataSource.getRepository(SplitPayment);
            const queryBuilder = splitPaymentRepo
                .createQueryBuilder('splitPayment')
                .where('splitPayment.userId = :userId', {
                    userId: req.user!.id,
                })
                .leftJoinAndSelect('splitPayment.recipients', 'recipients')
                .orderBy('splitPayment.lastExecutedAt', 'DESC')
                .addOrderBy('splitPayment.createdAt', 'DESC');

            if (status === 'active') {
                queryBuilder.andWhere('splitPayment.status = :status', {
                    status: SplitPaymentStatus.ACTIVE,
                });
            }

            const splitPayments = await queryBuilder.getMany();

            res.status(200).json({
                message: 'Split payment templates retrieved successfully',
                templates: splitPayments.map((sp) => ({
                    id: sp.id,
                    title: sp.title,
                    description: sp.description,
                    chain: sp.chain,
                    network: sp.network,
                    currency: sp.currency,
                    totalAmount: sp.totalAmount,
                    totalRecipients: sp.totalRecipients,
                    executionCount: sp.executionCount,
                    status: sp.status,
                    createdAt: sp.createdAt,
                    lastExecutedAt: sp.lastExecutedAt,
                    recipientCount:
                        sp.recipients?.filter((r) => r.isActive).length || 0,
                    canExecute: sp.status === SplitPaymentStatus.ACTIVE,
                })),
                totalTemplates: splitPayments.length,
            });
        } catch (error) {
            console.error('Get split payment templates error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Get execution history for a split payment
     * GET /split-payment/:id/executions
     */
    static async getExecutionHistory(
        req: AuthRequest,
        res: Response
    ): Promise<void> {
        try {
            const { id } = req.params;
            const { page = 1, limit = 20 } = req.query;

            // Verify ownership
            const splitPaymentRepo = AppDataSource.getRepository(SplitPayment);
            const splitPayment = await splitPaymentRepo.findOne({
                where: { id, userId: req.user!.id },
            });

            if (!splitPayment) {
                res.status(404).json({ error: 'Split payment not found' });
                return;
            }

            const executionRepo = AppDataSource.getRepository(
                SplitPaymentExecution
            );
            const [executions, total] = await executionRepo
                .createQueryBuilder('execution')
                .where('execution.splitPaymentId = :splitPaymentId', {
                    splitPaymentId: id,
                })
                .leftJoinAndSelect('execution.results', 'results')
                .orderBy('execution.createdAt', 'DESC')
                .skip((Number(page) - 1) * Number(limit))
                .take(Number(limit))
                .getManyAndCount();

            res.status(200).json({
                message: 'Execution history retrieved successfully',
                splitPayment: {
                    id: splitPayment.id,
                    title: splitPayment.title,
                    totalExecutions: splitPayment.executionCount,
                },
                executions: executions.map((exec) => ({
                    id: exec.id,
                    status: exec.status,
                    totalAmount: exec.totalAmount,
                    totalRecipients: exec.totalRecipients,
                    successfulPayments: exec.successfulPayments,
                    failedPayments: exec.failedPayments,
                    totalFees: exec.totalFees,
                    createdAt: exec.createdAt,
                    completedAt: exec.completedAt,
                    resultCount: exec.results?.length || 0,
                })),
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    totalPages: Math.ceil(total / Number(limit)),
                },
            });
        } catch (error) {
            console.error('Get execution history error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Toggle split payment status (activate/deactivate)
     * PATCH /split-payment/:id/toggle
     */
    static async toggleSplitPayment(
        req: AuthRequest,
        res: Response
    ): Promise<void> {
        try {
            const { id } = req.params;

            const splitPaymentRepo = AppDataSource.getRepository(SplitPayment);
            const splitPayment = await splitPaymentRepo.findOne({
                where: { id, userId: req.user!.id },
            });

            if (!splitPayment) {
                res.status(404).json({ error: 'Split payment not found' });
                return;
            }

            // Toggle status
            splitPayment.status =
                splitPayment.status === SplitPaymentStatus.ACTIVE
                    ? SplitPaymentStatus.INACTIVE
                    : SplitPaymentStatus.ACTIVE;

            await splitPaymentRepo.save(splitPayment);

            res.status(200).json({
                message: `Split payment ${
                    splitPayment.status === SplitPaymentStatus.ACTIVE
                        ? 'activated'
                        : 'deactivated'
                } successfully`,
                splitPayment: {
                    id: splitPayment.id,
                    title: splitPayment.title,
                    status: splitPayment.status,
                    canExecute:
                        splitPayment.status === SplitPaymentStatus.ACTIVE,
                },
            });
        } catch (error) {
            console.error('Toggle split payment error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    // Private methods for processing different chains
    private static async processEthereumBatch(
        splitPayment: SplitPayment,
        recipients: SplitPaymentRecipient[],
        privateKey: string
    ): Promise<Array<{ success: boolean; txHash?: string; error?: string }>> {
        const results = [];
        const provider = new ethers.JsonRpcProvider(
            splitPayment.network === 'testnet'
                ? 'https://eth-sepolia.g.alchemy.com/v2/CP1fRkzqgL_nwb9DNNiKI'
                : 'https://eth-mainnet.g.alchemy.com/v2/CP1fRkzqgL_nwb9DNNiKI'
        );
        const wallet = new ethers.Wallet(privateKey, provider);

        for (const recipient of recipients) {
            try {
                let tx;
                if (splitPayment.chain === 'ethereum') {
                    tx = await wallet.sendTransaction({
                        to: recipient.recipientAddress,
                        value: ethers.parseEther(recipient.amount),
                    });
                } else {
                    // USDT ERC20
                    const usdtAddress =
                        splitPayment.network === 'testnet'
                            ? '0x516de3a7a567d81737e3a46ec4ff9cfd1fcb0136'
                            : '0xdAC17F958D2ee523a2206206994597C13D831ec7';
                    const usdtAbi = [
                        'function transfer(address to, uint256 value) public returns (bool)',
                    ];
                    const usdtContract = new ethers.Contract(
                        usdtAddress,
                        usdtAbi,
                        wallet
                    );
                    tx = await usdtContract.transfer(
                        recipient.recipientAddress,
                        ethers.parseUnits(recipient.amount, 6)
                    );
                }

                results.push({ success: true, txHash: tx.hash });
            } catch (error) {
                results.push({
                    success: false,
                    error:
                        error instanceof Error ? error.message : String(error),
                });
            }
        }

        return results;
    }

    private static async processBitcoinBatch(
        splitPayment: SplitPayment,
        recipients: SplitPaymentRecipient[],
        privateKey: string
    ): Promise<Array<{ success: boolean; txHash?: string; error?: string }>> {
        const results = [];

        for (const recipient of recipients) {
            try {
                // Individual Bitcoin transactions
                const txHash =
                    await SplitPaymentController.sendBitcoinTransaction(
                        splitPayment.fromAddress,
                        recipient.recipientAddress,
                        recipient.amount,
                        splitPayment.network,
                        privateKey
                    );
                results.push({ success: true, txHash });
            } catch (error) {
                results.push({
                    success: false,
                    error:
                        error instanceof Error ? error.message : String(error),
                });
            }
        }

        return results;
    }

    private static async processSolanaBatch(
        splitPayment: SplitPayment,
        recipients: SplitPaymentRecipient[],
        privateKey: string
    ): Promise<Array<{ success: boolean; txHash?: string; error?: string }>> {
        const results = [];
        const connection = new Connection(
            splitPayment.network === 'testnet'
                ? 'https://api.devnet.solana.com'
                : 'https://api.mainnet-beta.solana.com'
        );

        try {
            let secretKeyArray: Uint8Array;
            try {
                const parsed = JSON.parse(privateKey);
                if (Array.isArray(parsed)) {
                    secretKeyArray = Uint8Array.from(parsed);
                } else {
                    throw new Error('Not an array');
                }
            } catch {
                const cleanHex = privateKey.startsWith('0x')
                    ? privateKey.slice(2)
                    : privateKey;
                const buffer = Buffer.from(cleanHex, 'hex');
                if (buffer.length === 32) {
                    const tempKeypair = Keypair.fromSeed(buffer);
                    secretKeyArray = tempKeypair.secretKey;
                } else if (buffer.length === 64) {
                    secretKeyArray = new Uint8Array(buffer);
                } else {
                    throw new Error(
                        `Invalid Solana private key length: ${buffer.length}`
                    );
                }
            }

            const fromKeypair = Keypair.fromSecretKey(secretKeyArray);
            const transaction = new SolTx();

            for (const recipient of recipients) {
                const toPubkey = new PublicKey(recipient.recipientAddress);
                transaction.add(
                    SystemProgram.transfer({
                        fromPubkey: fromKeypair.publicKey,
                        toPubkey,
                        lamports: Math.round(Number(recipient.amount) * 1e9),
                    })
                );
            }

            const signature = await sendAndConfirmTransaction(
                connection,
                transaction,
                [fromKeypair]
            );

            // All recipients get the same transaction hash for Solana batch
            for (const recipient of recipients) {
                results.push({ success: true, txHash: signature });
            }
        } catch (error) {
            // If batch fails, mark all as failed
            for (const recipient of recipients) {
                results.push({
                    success: false,
                    error:
                        error instanceof Error ? error.message : String(error),
                });
            }
        }

        return results;
    }

    private static async sendBitcoinTransaction(
        fromAddress: string,
        toAddress: string,
        amount: string,
        network: string,
        privateKey: string
    ): Promise<string> {
        throw new Error(
            'Bitcoin individual transactions not implemented in split payment'
        );
    }
}

// Helper function
function getCurrencyFromChain(chain: string): string {
    switch (chain) {
        case 'ethereum':
            return 'ETH';
        case 'bitcoin':
            return 'BTC';
        case 'solana':
            return 'SOL';
        case 'starknet':
            return 'STRK';
        case 'usdt_erc20':
        case 'usdt_trc20':
            return 'USDT';
        default:
            return chain.toUpperCase();
    }
}
