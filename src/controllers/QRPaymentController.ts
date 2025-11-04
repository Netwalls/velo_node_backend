import { Request, Response } from 'express';
import { AppDataSource } from '../config/database_migration';
import {
    MerchantPayment,
    MerchantPaymentStatus,
} from '../entities/MerchantPayment';
import { Notification } from '../entities/Notification';
import { NotificationType } from '../types/index';
import { AuthRequest } from '../types';
import axios from 'axios';

// Validation helpers
function isValidEthAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
}

function isValidBtcAddress(address: string): boolean {
    return /^[13mn2][a-zA-Z0-9]{25,39}$/.test(address);
}

function isValidSolAddress(address: string): boolean {
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}

function isValidStrkAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{63,64}$/.test(address);
}

function isValidPolkadotAddress(address: string): boolean {
    try {
        // Lazy require to avoid hard import at module load
        const { decodeAddress } = require('@polkadot/util-crypto');
        decodeAddress(address);
        return true;
    } catch {
        return false;
    }
}

const STARKNET_TOKEN_CONTRACTS: Record<
    string,
    { mainnet: string; testnet: string }
> = {
    // STRK / related tokens (use provided addresses)
    strk: {
        mainnet:
            '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d',
        testnet:
            '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d',
    },
    strk_eth: {
        mainnet:
            '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
        testnet:
            '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
    },
    strk_usdt: {
        mainnet:
            '0x068f5c6a61780768455de69077e07e89787839bf8166decfbf92b645209c0fb8',
        testnet:
            '0x068f5c6a61780768455de69077e07e89787839bf8166decfbf92b645209c0fb8',
    },
    strk_usdc: {
        mainnet:
            '0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8',
        testnet:
            '0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8',
    },
};

function padStarknetAddress(addr: string): string {
    if (!addr) return addr;
    const a = addr.startsWith('0x') ? addr.slice(2) : addr;
    return '0x' + a.padStart(64, '0').toLowerCase();
}

// Blockchain API helpers with mainnet/testnet support
interface BlockchainConfig {
    apiUrl: string;
    apiKey?: string;
    explorerUrl?: string;
}

const BLOCKCHAIN_APIS = {
    ethereum: {
        mainnet: {
            apiUrl: 'https://api.etherscan.io/api',
            apiKey: process.env.ETHERSCAN_API_KEY || '',
            explorerUrl: 'https://etherscan.io',
        },
        testnet: {
            apiUrl: 'https://api-sepolia.etherscan.io/api',
            apiKey: process.env.ETHERSCAN_API_KEY || '',
            explorerUrl: 'https://sepolia.etherscan.io',
        },
    },
    bitcoin: {
        mainnet: {
            apiUrl: 'https://blockchain.info/rawaddr',
            explorerUrl: 'https://blockchain.info',
        },
        testnet: {
            apiUrl: 'https://blockstream.info/testnet/api/address',
            explorerUrl: 'https://blockstream.info/testnet',
        },
    },
    solana: {
        mainnet: {
            apiUrl: 'https://api.mainnet-beta.solana.com',
            explorerUrl: 'https://explorer.solana.com',
        },
        testnet: {
            apiUrl: 'https://api.testnet.solana.com',
            explorerUrl: 'https://explorer.solana.com/?cluster=testnet',
        },
        devnet: {
            apiUrl: 'https://api.devnet.solana.com',
            explorerUrl: 'https://explorer.solana.com/?cluster=devnet',
        },
    },
    starknet: {
        mainnet: {
            apiUrl: 'https://alpha-mainnet.starknet.io',
            explorerUrl: 'https://starkscan.co',
        },
        testnet: {
            apiUrl: 'https://alpha4.starknet.io',
            explorerUrl: 'https://testnet.starkscan.co',
        },
    },
};

function getBlockchainConfig(chain: string, network: string): BlockchainConfig {
    const normalizedNetwork = network?.toLowerCase() || 'mainnet';
    const chainConfig = BLOCKCHAIN_APIS[chain as keyof typeof BLOCKCHAIN_APIS];

    if (!chainConfig) {
        throw new Error(`Unsupported chain: ${chain}`);
    }

    if (chain === 'usdt-erc20') {
        return BLOCKCHAIN_APIS.ethereum[
            normalizedNetwork as keyof typeof BLOCKCHAIN_APIS.ethereum
        ];
    }

    const config = chainConfig[normalizedNetwork as keyof typeof chainConfig];

    if (!config) {
        throw new Error(
            `Unsupported network ${normalizedNetwork} for chain ${chain}`
        );
    }

    return config;
}

export class MerchantController {
    /**
     * Create a new payment request with QR code support
     */
    static async createPayment(req: AuthRequest, res: Response) {
        try {
            const {
                amount,
                chain,
                network,
                stellarAddress,
                ethAddress,
                btcAddress,
                solAddress,
                strkAddress,
                polkadotAddress,
                usdtErc20Address,
                usdtTrc20Address,
                description,
            } = req.body;
            const userId = req.user!.id;

            // Validate required fields
            if (!amount || amount <= 0) {
                return res
                    .status(400)
                    .json({ error: 'Valid amount is required' });
            }

            if (!chain) {
                return res.status(400).json({ error: 'Chain is required' });
            }

            // Determine the address strictly based on selected chain
            let address: string | undefined;
            switch ((chain || '').toLowerCase()) {
                case 'bitcoin':
                    address = btcAddress; break;
                case 'ethereum':
                    address = ethAddress; break;
                case 'stellar':
                    address = stellarAddress; break;
                case 'solana':
                    address = solAddress; break;
                case 'starknet':
                    address = strkAddress; break;
                case 'polkadot':
                    address = polkadotAddress; break;
                case 'usdt-erc20':
                    address = usdtErc20Address; break;
                case 'usdt-trc20':
                    address = usdtTrc20Address; break;
                default:
                    return res.status(400).json({ error: `Unsupported chain: ${chain}` });
            }

            if (!address) {
                return res.status(400).json({
                    error: `Missing address for chain ${chain}`,
                });
            }

            // Validate address format based on chain
            const validations: Record<string, () => boolean> = {
                bitcoin: () => isValidBtcAddress(address),
                ethereum: () => isValidEthAddress(address),
                stellar: () => MerchantController.isValidStellarAddress(address),
                solana: () => isValidSolAddress(address),
                starknet: () => isValidStrkAddress(address),
                polkadot: () => isValidPolkadotAddress(address),
                'usdt-erc20': () => isValidEthAddress(address),
                'usdt-trc20': () => isValidBtcAddress(address),
            };

            if (validations[chain] && !validations[chain]()) {
                return res.status(400).json({
                    error: `Invalid ${chain} address format`,
                });
            }

            const paymentRepo = AppDataSource.getRepository(MerchantPayment);

            // Create payment request
            const payload: any = {
                userId,
                amount,
                chain,
                network: network || 'mainnet',
                ethAddress,
                btcAddress,
                stellarAddress,
                solAddress,
                strkAddress,
                polkadotAddress,
                usdtErc20Address,
                usdtTrc20Address,
                address,
                status: MerchantPaymentStatus.PENDING,
                description:
                    description ||
                    `Payment request for ${amount} ${chain.toUpperCase()}`,
            };

            const payment = (await paymentRepo.save(payload as any)) as MerchantPayment;

            // Create notification
            await AppDataSource.getRepository(Notification).save({
                userId,
                type: NotificationType.QR_PAYMENT_CREATED,
                title: 'QR Payment Created',
                message: `You created a QR payment request for ${amount} ${chain.toUpperCase()}`,
                details: {
                    amount,
                    chain,
                    paymentId: payment.id,
                    address,
                },
                isRead: false,
                createdAt: new Date(),
            });

            res.status(201).json({
                message: 'Payment request created successfully',
                payment: {
                    id: payment.id,
                    amount: payment.amount,
                    chain: payment.chain,
                    network: payment.network,
                    address: payment.address,
                    status: payment.status,
                    createdAt: payment.createdAt,
                    qrData: `${chain}:${address}?amount=${amount}`,
                },
            });
        } catch (error) {
            console.error('Create payment error:', error);
            res.status(500).json({ error: 'Failed to create payment request' });
        }
    }

    /**
     * Get all payment requests for the merchant
     */
    static async getPayments(req: AuthRequest, res: Response) {
        try {
            const userId = req.user!.id;
            const { status, chain, limit = 50, offset = 0 } = req.query;

            const paymentRepo = AppDataSource.getRepository(MerchantPayment);

            // Build query
            const queryBuilder = paymentRepo
                .createQueryBuilder('payment')
                .where('payment.userId = :userId', { userId })
                .orderBy('payment.createdAt', 'DESC')
                .skip(Number(offset))
                .take(Number(limit));

            // Filter by status if provided
            if (status) {
                queryBuilder.andWhere('payment.status = :status', { status });
            }

            // Filter by chain if provided
            if (chain) {
                queryBuilder.andWhere('payment.chain = :chain', { chain });
            }

            const [payments, total] = await queryBuilder.getManyAndCount();

            res.json({
                payments,
                pagination: {
                    total,
                    limit: Number(limit),
                    offset: Number(offset),
                    hasMore: total > Number(offset) + Number(limit),
                },
            });
        } catch (error) {
            console.error('Get payments error:', error);
            res.status(500).json({ error: 'Failed to fetch payments' });
        }
    }

    /**
     * Get a single payment by ID
     */
    static async getPaymentById(req: AuthRequest, res: Response) {
        try {
            const userId = req.user!.id;
            const { id } = req.params;

            const paymentRepo = AppDataSource.getRepository(MerchantPayment);

            const payment = await paymentRepo.findOne({
                where: { id, userId },
            });

            if (!payment) {
                return res.status(404).json({ error: 'Payment not found' });
            }

            res.json({ payment });
        } catch (error) {
            console.error('Get payment by ID error:', error);
            res.status(500).json({ error: 'Failed to fetch payment' });
        }
    }

    /**
     * Cancel a payment by ID
     */
    static async cancelPayment(req: AuthRequest, res: Response) {
        try {
            const userId = req.user!.id;
            const { id } = req.params;

            const paymentRepo = AppDataSource.getRepository(MerchantPayment);

            const payment = await paymentRepo.findOne({
                where: { id, userId },
            });

            if (!payment) {
                return res.status(404).json({ error: 'Payment not found' });
            }

            // Only pending payments can be cancelled
            if (payment.status !== MerchantPaymentStatus.PENDING) {
                return res.status(400).json({
                    error: `Cannot cancel payment with status: ${payment.status}`,
                });
            }

            payment.status = MerchantPaymentStatus.CANCELLED;
            payment.updatedAt = new Date();
            await paymentRepo.save(payment);

            // Create notification
            await AppDataSource.getRepository(Notification).save({
                userId,
                type: NotificationType.QR_PAYMENT_CREATED,
                title: 'Payment Cancelled',
                message: `Payment request #${payment.id} has been cancelled`,
                details: {
                    paymentId: payment.id,
                    amount: payment.amount,
                    chain: payment.chain,
                },
                isRead: false,
                createdAt: new Date(),
            });

            res.json({
                message: 'Payment cancelled successfully',
                payment,
            });
        } catch (error) {
            console.error('Cancel payment error:', error);
            res.status(500).json({ error: 'Failed to cancel payment' });
        }
    }

    /**
     * Monitor a specific payment for blockchain confirmations
     */
    static async monitorPayment(req: AuthRequest, res: Response) {
        try {
            const userId = req.user!.id;
            const { id } = req.params;

            const paymentRepo = AppDataSource.getRepository(MerchantPayment);

            const payment = await paymentRepo.findOne({
                where: { id, userId },
            });

            if (!payment) {
                return res.status(404).json({ error: 'Payment not found' });
            }

            // Fast-path: if already completed/cancelled, don't perform slow chain checks
            if (payment.status !== MerchantPaymentStatus.PENDING) {
                return res.json({
                    payment,
                    blockchainStatus: {
                        confirmed: payment.status === MerchantPaymentStatus.COMPLETED,
                        transactionHash: payment.txHash || payment.transactionHash,
                        confirmations: payment.status === MerchantPaymentStatus.COMPLETED ? 1 : 0,
                    },
                });
            }

            // Check blockchain for payment
            const blockchainStatus =
                await MerchantController.checkBlockchainPayment(payment);

            // Update payment if confirmed
            if (
                blockchainStatus.confirmed &&
                payment.status === MerchantPaymentStatus.PENDING
            ) {
                payment.status = MerchantPaymentStatus.COMPLETED;
                // persist to the DB column used in your entity (txHash)
                payment.txHash = blockchainStatus.transactionHash ?? '';
                // set completedAt so UI shows the payment as finished
                payment.completedAt = new Date();
                payment.updatedAt = new Date();
                await paymentRepo.save(payment);

                    // Record receive transaction for the merchant/user
                    try {
                        const txRepo = AppDataSource.getRepository('Transaction');
                        const txHash = blockchainStatus.transactionHash || '';
                        if (txHash) {
                            const exists = await txRepo.findOne({ where: { txHash } });
                            if (!exists) {
                                await txRepo.save({
                                    userId: payment.userId,
                                    type: 'receive',
                                    amount: payment.amount,
                                    chain: payment.chain,
                                    network: payment.network,
                                    toAddress: payment.address,
                                    fromAddress: txHash,
                                    txHash: txHash,
                                    status: 'confirmed',
                                    createdAt: new Date(),
                                });
                            }
                        }
                    } catch (txErr) {
                        console.error('Failed to save receive transaction for merchant payment:', txErr);
                    }

                // Create notification
                await AppDataSource.getRepository(Notification).save({
                    userId,
                    type: NotificationType.QR_PAYMENT_CREATED,
                    title: 'Payment Completed',
                    message: `Payment #${payment.id} has been confirmed on the blockchain`,
                    details: {
                        paymentId: payment.id,
                        amount: payment.amount,
                        chain: payment.chain,
                        transactionHash: blockchainStatus.transactionHash,
                    },
                    isRead: false,
                    createdAt: new Date(),
                });
            }

            res.json({
                payment,
                blockchainStatus,
            });
        } catch (error) {
            console.error('Monitor payment error:', error);
            res.status(500).json({ error: 'Failed to monitor payment' });
        }
    }

    /**
     * Monitor all pending payments (can be called by a cron job)
     */
    static async monitorAllPendingPayments(req: Request, res: Response) {
        try {
            const paymentRepo = AppDataSource.getRepository(MerchantPayment);

            // Get all pending payments
            const pendingPayments = await paymentRepo.find({
                where: { status: MerchantPaymentStatus.PENDING },
            });

            const results = [];

            for (const payment of pendingPayments) {
                try {
                    const blockchainStatus =
                        await MerchantController.checkBlockchainPayment(
                            payment
                        );

                    if (blockchainStatus.confirmed) {
                        payment.status = MerchantPaymentStatus.COMPLETED;
                        // persist to the DB column used in your entity (txHash)
                        payment.txHash = blockchainStatus.transactionHash ?? '';
                        payment.updatedAt = new Date();
                        await paymentRepo.save(payment);

                        // Create notification
                        await AppDataSource.getRepository(Notification).save({
                            userId: payment.userId,
                            type: NotificationType.QR_PAYMENT_CREATED,
                            title: 'Payment Completed',
                            message: `Payment #${payment.id} has been confirmed`,
                            details: {
                                paymentId: payment.id,
                                amount: payment.amount,
                                chain: payment.chain,
                                transactionHash:
                                    blockchainStatus.transactionHash,
                            },
                            isRead: false,
                            createdAt: new Date(),
                        });

                        results.push({
                            paymentId: payment.id,
                            status: 'completed',
                            transactionHash: blockchainStatus.transactionHash,
                        });
                        
                        // Record receive transaction for the merchant/user (dedupe by txHash)
                        try {
                            const txRepo = AppDataSource.getRepository('Transaction');
                            const txHash = blockchainStatus.transactionHash || '';
                            if (txHash) {
                                const exists = await txRepo.findOne({ where: { txHash } });
                                if (!exists) {
                                    await txRepo.save({
                                        userId: payment.userId,
                                        type: 'receive',
                                        amount: payment.amount,
                                        chain: payment.chain,
                                        network: payment.network,
                                        toAddress: payment.address,
                                        fromAddress: txHash,
                                        txHash: txHash,
                                        status: 'confirmed',
                                        createdAt: new Date(),
                                    });
                                }
                            }
                        } catch (txErr) {
                            console.error('Failed to save receive transaction for merchant payment (batch monitor):', txErr);
                        }
                    }
                } catch (error) {
                    console.error(
                        `Error monitoring payment ${payment.id}:`,
                        error
                    );
                    results.push({
                        paymentId: payment.id,
                        status: 'error',
                        error:
                            error instanceof Error
                                ? error.message
                                : 'Unknown error',
                    });
                }
            }

            res.json({
                message: `Monitored ${pendingPayments.length} pending payments`,
                checked: pendingPayments.length,
                completed: results.filter((r) => r.status === 'completed')
                    .length,
                results,
            });
        } catch (error) {
            console.error('Monitor all pending payments error:', error);
            res.status(500).json({
                error: 'Failed to monitor pending payments',
            });
        }
    }

    /**
     * Check blockchain for payment confirmation
     * This is a helper method that queries blockchain APIs
     */
    private static async checkBlockchainPayment(
        payment: MerchantPayment
    ): Promise<{
        confirmed: boolean;
        transactionHash?: string;
        confirmations?: number;
        error?: string;
    }> {
        try {
            switch (payment.chain) {
                case 'ethereum':
                case 'usdt-erc20':
                    return await MerchantController.checkEthereumPayment(
                        payment
                    );
                case 'bitcoin':
                    return await MerchantController.checkBitcoinPayment(
                        payment
                    );
                case 'solana':
                    return await MerchantController.checkSolanaPayment(payment);
                case 'stellar':
                    return await MerchantController.checkStellarPayment(payment);
                case 'starknet':
                    return await MerchantController.checkStarknetPayment(
                        payment
                    );
                case 'polkadot':
                    return await MerchantController.checkPolkadotPayment(payment);
                default:
                    return { confirmed: false, error: 'Unsupported chain' };
            }
        } catch (error) {
            console.error('Blockchain check error:', error);
            return {
                confirmed: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    // Basic Stellar address validation (G... public keys)
    private static isValidStellarAddress(addr?: string | null): boolean {
        if (!addr || typeof addr !== 'string') return false;
        return /^G[A-Z2-7]{55}$/.test(addr);
    }

    /**
     * Check Polkadot payment by scanning recent blocks for balances.Transfer events
     */
    private static async checkPolkadotPayment(payment: MerchantPayment): Promise<{
        confirmed: boolean;
        transactionHash?: string;
        confirmations?: number;
        error?: string;
    }> {
        try {
            const { decodeAddress } = require('@polkadot/util-crypto');
            const { ApiPromise, WsProvider } = require('@polkadot/api');

            // 0) Fast path via Subscan (optional) if API key provided
            try {
                const SUBSCAN_API_KEY = process.env.SUBSCAN_API_KEY;
                if (SUBSCAN_API_KEY) {
                    const isTestnet = (payment.network || 'mainnet').toLowerCase() === 'testnet';
                    const base = isTestnet ? 'https://paseo.api.subscan.io' : 'https://polkadot.api.subscan.io';
                    const resp = await axios.post(
                        `${base}/api/scan/transfers`,
                        { address: payment.address, direction: 'to', row: 50, page: 0 },
                        { headers: { 'Content-Type': 'application/json', 'X-API-Key': SUBSCAN_API_KEY }, timeout: 6000 }
                    );
                    const items =
                        resp.data &&
                        typeof resp.data === 'object' &&
                        'data' in resp.data &&
                        Array.isArray((resp.data as any).data.transfers)
                            ? (resp.data as any).data.transfers
                            : [];
                    const expectedPlanck = BigInt(Math.round(Number(payment.amount) * 1e10));
                    const tolerance = expectedPlanck / BigInt(100);
                    const minPlanck = expectedPlanck > tolerance ? expectedPlanck - tolerance : expectedPlanck;
                    for (const it of items) {
                        try {
                            const to = it.to || it.to_account || '';
                            if (to !== payment.address) continue;
                            const amtPlanck = it.amount_planck ? BigInt(String(it.amount_planck)) : BigInt(Math.round(Number(it.amount) * 1e10));
                            if (amtPlanck >= minPlanck) {
                                return { confirmed: true, transactionHash: it.hash || it.tx_hash, confirmations: 1 };
                            }
                        } catch {}
                    }
                }
            } catch (e) {
                // ignore Subscan errors and fall back to RPC
            }

            // 1) RPC path with limited window and concurrency
            const wsUrl = (payment.network || 'mainnet').toLowerCase() === 'testnet'
                ? (process.env.POLKADOT_WS_TESTNET || 'wss://pas-rpc.stakeworld.io')
                : (process.env.POLKADOT_WS_MAINNET || 'wss://rpc.polkadot.io');

            const provider = new WsProvider(wsUrl, 2_000);
            const api = await ApiPromise.create({ provider });

            // Decode recipient to AccountId bytes
            const recipientId = decodeAddress(payment.address);

            // Amount in Planck (1 DOT = 10^10 Planck)
            const expectedPlanck = BigInt(Math.round(Number(payment.amount) * 1e10));
            const tolerance = expectedPlanck / BigInt(100); // 1%
            const minPlanck = expectedPlanck > tolerance ? expectedPlanck - tolerance : expectedPlanck;

            // Determine current block and scan back a window
            const header = await api.rpc.chain.getHeader();
            const current = header.number.toNumber();
            const window = Number(process.env.POLKADOT_SCAN_WINDOW || 64); // default: last 64 blocks
            const from = Math.max(1, current - window);
            const blocks: number[] = [];
            for (let n = current; n >= from; n--) blocks.push(n);

            const deadline = Date.now() + Number(process.env.POLKADOT_SCAN_DEADLINE_MS || 8000);
            const maxConcurrency = Math.max(1, Number(process.env.POLKADOT_SCAN_CONCURRENCY || 8));

            const matchBlock = async (n: number) => {
                try {
                    const blockHash = await api.rpc.chain.getBlockHash(n);
                    const events = await api.query.system.events.at(blockHash);
                    for (let idx = 0; idx < events.length; idx++) {
                        const { event, phase } = events[idx] as any;
                        if (event.section !== 'balances') continue;
                        if (event.method !== 'Transfer' && event.method !== 'TransferKeepAlive') continue;
                        const dataAny: any[] = event.data as any[];
                        if (!dataAny || dataAny.length < 3) continue;
                        const to = dataAny[1];
                        const amt = dataAny[2];
                        let toId: Uint8Array;
                        try { toId = (to.toU8a ? to.toU8a() : new Uint8Array(to)) as Uint8Array; } catch { continue; }
                        const same = Buffer.from(toId).equals(Buffer.from(recipientId));
                        if (!same) continue;
                        let amtBig = BigInt(0);
                        try { amtBig = BigInt(amt.toString()); } catch { continue; }
                        if (amtBig >= minPlanck) {
                            let txHashHex: string | undefined;
                            try {
                                if (phase && phase.isApplyExtrinsic) {
                                    const exIndex = phase.asApplyExtrinsic.toNumber();
                                    const block = await api.rpc.chain.getBlock(blockHash);
                                    const ex = block.block.extrinsics[exIndex];
                                    txHashHex = (ex.hash && ex.hash.toHex) ? ex.hash.toHex() : undefined;
                                }
                            } catch {}
                            return { n, hash: txHashHex || blockHash.toString() };
                        }
                    }
                } catch {}
                return null;
            };

            // Process in concurrent batches
            let found: { n: number; hash: string } | null = null;
            for (let i = 0; i < blocks.length && !found; i += maxConcurrency) {
                if (Date.now() > deadline) break;
                const slice = blocks.slice(i, i + maxConcurrency);
                const results = await Promise.all(slice.map(matchBlock));
                found = results.find((r) => r !== null) as any;
            }

            await api.disconnect().catch(() => {});
            if (found) {
                return { confirmed: true, transactionHash: found.hash, confirmations: current - found.n + 1 };
            }
            return { confirmed: false };
        } catch (error) {
            console.error('Polkadot check error:', error);
            return { confirmed: false };
        }
    }

    /**
     * Check Stellar payment using Horizon API
     */
    private static async checkStellarPayment(payment: MerchantPayment): Promise<{
        confirmed: boolean;
        transactionHash?: string;
        confirmations?: number;
    }> {
        try {
            const network = (payment.network || 'mainnet').toLowerCase();
            const horizon =
                network === 'testnet'
                    ? 'https://horizon-testnet.stellar.org'
                    : 'https://horizon.stellar.org';

            const address = payment.address;
            const expectedAmount = (Number(payment.amount) || 0).toString();

            // Fetch payments for the account (limit recent 50)
            const res = await axios.get(
                `${horizon}/accounts/${encodeURIComponent(address)}/payments`,
                {
                    params: { limit: 50, order: 'desc' },
                    timeout: 10000,
                }
            );

            const dataAny: any = res.data || {};
            const records: any[] = Array.isArray(dataAny.records)
                ? dataAny.records
                : Array.isArray(dataAny._embedded?.records)
                ? dataAny._embedded.records
                : [];

            for (const r of records) {
                try {
                    // native XLM payments have asset_type === 'native'
                    const amount = r.amount?.toString();
                    const to = r.to;
                    const txHash = r.transaction_hash || r.hash || r.transaction_hash;

                    if (!amount || !to) continue;
                    if (to !== address) continue;

                    // Compare amounts (allow tiny rounding differences)
                    const a = BigInt(Math.round(Number(amount) * 1e7));
                    const e = BigInt(Math.round(Number(expectedAmount) * 1e7));
                    const tolerance = e / BigInt(100); // 1%
                    if (a + tolerance >= e) {
                        return { confirmed: true, transactionHash: txHash, confirmations: 1 };
                    }
                } catch {
                    continue;
                }
            }

            return { confirmed: false };
        } catch (error) {
            console.error('Stellar check error:', error instanceof Error ? error.message : error);
            return { confirmed: false };
        }
    }

    /**
     * Check Ethereum/ERC20 payment
     */
    private static async checkEthereumPayment(
        payment: MerchantPayment
    ): Promise<{
        confirmed: boolean;
        transactionHash?: string;
        confirmations?: number;
    }> {
        try {
            const network = payment.network?.toLowerCase() || 'mainnet';
            const ethConfig =
                BLOCKCHAIN_APIS.ethereum[
                    network as keyof typeof BLOCKCHAIN_APIS.ethereum
                ];
            const apiKey = ethConfig.apiKey;
            const address = payment.address;

            // Query Etherscan API for transactions
            const response = await axios.get(ethConfig.apiUrl, {
                params: {
                    module: 'account',
                    action: 'txlist',
                    address: address,
                    startblock: 0,
                    endblock: 99999999,
                    sort: 'desc',
                    apikey: apiKey,
                },
                timeout: 10000,
            });

            const data = response.data as { status: string; result: any[] };
            if (data.status === '1' && data.result.length > 0) {
                // Check for incoming transactions matching the amount
                const expectedAmount = (payment.amount * 1e18).toString(); // Convert to wei

                for (const tx of data.result) {
                    if (
                        tx.to.toLowerCase() === address.toLowerCase() &&
                        tx.value === expectedAmount &&
                        parseInt(tx.confirmations) >= 3
                    ) {
                        return {
                            confirmed: true,
                            transactionHash: tx.hash,
                            confirmations: parseInt(tx.confirmations),
                        };
                    }
                }
            }

            return { confirmed: false };
        } catch (error) {
            console.error('Ethereum check error:', error);
            return { confirmed: false };
        }
    }

    /**
     * Check Bitcoin payment
     */
    private static async checkBitcoinPayment(
        payment: MerchantPayment
    ): Promise<{
        confirmed: boolean;
        transactionHash?: string;
        confirmations?: number;
    }> {
        try {
            const address = payment.address;
            const network = (payment.network || 'mainnet').toLowerCase();

            // use Blockstream endpoints for mainnet/testnet
            const blockstreamBase =
                network === 'testnet'
                    ? 'https://blockstream.info/testnet/api'
                    : 'https://blockstream.info/api';

            const expectedSats = BigInt(
                Math.round(Number(payment.amount) * 1e8)
            );

            // debug: show expected sats
            if (process.env.NODE_ENV !== 'production') {
                console.debug('[BTC] checking', {
                    address,
                    network,
                    expectedSats: expectedSats.toString(),
                    paymentAmount: payment.amount,
                });
            }

            // get tip height for confirmations calculation
            let tipHeight: number | null = null;
            try {
                const tipResp = await axios.get(
                    `${blockstreamBase}/blocks/tip/height`,
                    { timeout: 8000 }
                );
                tipHeight = Number(tipResp.data);
            } catch (e) {
                tipHeight = null;
            }

            // helper to inspect a tx object for matching outputs
            const inspectTxForAddress = (tx: any) => {
                const txid = tx.txid ?? tx.id ?? tx.hash ?? tx.tx_hash;
                // Blockstream uses vout array with value (sats) and scriptpubkey_address
                const outputs = Array.isArray(tx.vout)
                    ? tx.vout
                    : Array.isArray(tx.outputs)
                    ? tx.outputs
                    : tx.vout ?? [];

                for (const out of outputs) {
                    const outAddr =
                        out.scriptpubkey_address ??
                        out.address ??
                        out.addr ??
                        null;
                    const value = BigInt(
                        out.value ?? out.amount ?? out.satoshis ?? 0
                    );
                    if (process.env.NODE_ENV !== 'production') {
                        console.debug('[BTC] tx', txid, 'out', {
                            outAddr,
                            value: value.toString(),
                        });
                    }
                    if (outAddr === address && value >= expectedSats) {
                        const blockHeight =
                            tx.status?.block_height ??
                            tx.block_height ??
                            tx.blockheight ??
                            null;
                        const confirmed =
                            blockHeight !== null && blockHeight !== undefined;
                        const confirmations =
                            confirmed && tipHeight !== null
                                ? Math.max(
                                      0,
                                      tipHeight - Number(blockHeight) + 1
                                  )
                                : confirmed
                                ? 1
                                : 0;
                        return {
                            matched: true,
                            confirmed,
                            transactionHash: txid,
                            confirmations,
                        };
                    }
                }
                return { matched: false };
            };

            // fetch confirmed/recent txs
            let txs: any[] = [];
            try {
                const r = await axios.get(
                    `${blockstreamBase}/address/${address}/txs`,
                    { timeout: 10000 }
                );
                txs = Array.isArray(r.data) ? r.data : [];
                if (process.env.NODE_ENV !== 'production') {
                    console.debug(
                        '[BTC] /txs returned count',
                        txs.length,
                        'for',
                        address
                    );
                    if (txs.length > 0)
                        console.debug(
                            '[BTC] sample txid',
                            txs[0].txid ?? txs[0].id ?? txs[0].hash
                        );
                }
            } catch (e) {
                if (process.env.NODE_ENV !== 'production') {
                    console.error(
                        '[BTC] error fetching /txs',
                        e && typeof e === 'object' && 'message' in e
                            ? (e as any).message
                            : e
                    );
                }
                txs = [];
            }

            for (const tx of txs) {
                const result = inspectTxForAddress(tx);
                if (result.matched) {
                    return {
                        confirmed: result.confirmed ?? false,
                        transactionHash: result.transactionHash,
                        confirmations: result.confirmations,
                    };
                }
            }

            // check mempool (unconfirmed) txs
            try {
                const rm = await axios.get(
                    `${blockstreamBase}/address/${address}/txs/mempool`,
                    { timeout: 8000 }
                );
                const memTxs = Array.isArray(rm.data) ? rm.data : [];
                if (process.env.NODE_ENV !== 'production') {
                    console.debug(
                        '[BTC] /txs/mempool returned count',
                        memTxs.length,
                        'for',
                        address
                    );
                }
                for (const tx of memTxs) {
                    const result = inspectTxForAddress(tx);
                    if (result.matched) {
                        return {
                            confirmed: false,
                            transactionHash: result.transactionHash,
                            confirmations: 0,
                        };
                    }
                }
            } catch (err) {
                if (process.env.NODE_ENV !== 'production') {
                    console.error(
                        '[BTC] error fetching mempool',
                        err && typeof err === 'object' && 'message' in err
                            ? (err as any).message
                            : err
                    );
                }
                // ignore mempool errors
            }

            // fallback: if configured API is blockchain.info style, try rawaddr endpoint
            try {
                const cfgUrl =
                    BLOCKCHAIN_APIS.bitcoin[
                        network as keyof typeof BLOCKCHAIN_APIS.bitcoin
                    ].apiUrl || '';
                if (
                    cfgUrl.includes('blockchain.info') ||
                    cfgUrl.includes('blockchain.info/rawaddr')
                ) {
                    const resp = await axios.get(
                        `${cfgUrl.replace(
                            /\/rawaddr\/?$/,
                            ''
                        )}/rawaddr/${address}`,
                        { timeout: 10000 }
                    );
                    const data = resp.data as any;
                    const walletTxs = Array.isArray(data.txs) ? data.txs : [];
                    for (const tx of walletTxs) {
                        for (const out of tx.out || []) {
                            const outAddr = out.addr || out.address;
                            const value = BigInt(out.value ?? 0);
                            if (outAddr === address && value >= expectedSats) {
                                const confirmed = !!tx.block_height;
                                const confirmations = confirmed ? 1 : 0;
                                return {
                                    confirmed,
                                    transactionHash: tx.hash || tx.txid,
                                    confirmations,
                                };
                            }
                        }
                    }
                }
            } catch {
                // ignore fallback errors
            }

            return { confirmed: false };
        } catch (error) {
            console.error('Bitcoin check error:', error);
            return { confirmed: false };
        }
    }

    /**
     * Check Solana payment
     */
    private static async checkSolanaPayment(payment: MerchantPayment): Promise<{
        confirmed: boolean;
        transactionHash?: string;
        confirmations?: number;
    }> {
        const clustersToTry = ['mainnet', 'devnet', 'testnet'];
        try {
            const wallet = payment.address;
            const expectedLamports = BigInt(
                Math.round(Number(payment.amount) * 1e9)
            );
            const preferred = (payment.network || 'mainnet').toLowerCase();

            // Try preferred first, then fallbacks
            const networks = [
                preferred,
                ...clustersToTry.filter((c) => c !== preferred),
            ];

            for (const network of networks) {
                let solConfig: { apiUrl: string } | null = null;
                try {
                    solConfig = getBlockchainConfig('solana', network);
                } catch {
                    continue;
                }
                const rpc = solConfig.apiUrl;

                const fetchSignatures = async (target: string) => {
                    const res = await axios.post(
                        rpc,
                        {
                            jsonrpc: '2.0',
                            id: 1,
                            method: 'getSignaturesForAddress',
                            params: [target, { limit: 50 }],
                        },
                        { timeout: 10000 }
                    );
                    return (res.data as any)?.result ?? [];
                };

                const fetchTransaction = async (sig: string) => {
                    const res = await axios.post(
                        rpc,
                        {
                            jsonrpc: '2.0',
                            id: 1,
                            method: 'getTransaction',
                            params: [
                                sig,
                                {
                                    encoding: 'jsonParsed',
                                    commitment: 'finalized',
                                },
                            ],
                        },
                        { timeout: 10000 }
                    );
                    return (res.data as any)?.result ?? null;
                };

                // Build initial targets: wallet
                const targets = new Set<string>([wallet]);

                // If no signatures on wallet, try discovering token accounts (ATAs)
                const sigsForWallet = await fetchSignatures(wallet).catch(
                    () => []
                );
                if (
                    !Array.isArray(sigsForWallet) ||
                    sigsForWallet.length === 0
                ) {
                    try {
                        const taRes = await axios.post(
                            rpc,
                            {
                                jsonrpc: '2.0',
                                id: 1,
                                method: 'getTokenAccountsByOwner',
                                params: [
                                    wallet,
                                    {
                                        programId:
                                            'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
                                    },
                                    { encoding: 'jsonParsed' },
                                ],
                            },
                            { timeout: 10000 }
                        );
                        const taList = (taRes.data as any)?.result?.value ?? [];
                        for (const ta of taList) {
                            if (ta && ta.pubkey) targets.add(ta.pubkey);
                        }
                    } catch {
                        // ignore token account discovery errors and continue
                    }
                } else {
                    // Add wallet signatures were found; still keep wallet as a target
                }

                if (process.env.NODE_ENV !== 'production') {
                    console.debug(
                        'Solana monitor: trying network',
                        network,
                        'targets',
                        Array.from(targets)
                    );
                }

                // Iterate targets and look for matching transactions
                for (const target of Array.from(targets)) {
                    const sigs = await fetchSignatures(target).catch(() => []);
                    if (process.env.NODE_ENV !== 'production') {
                        console.debug(
                            'Solana monitor: signatures for target',
                            target,
                            sigs.length
                        );
                    }

                    for (const sigObj of sigs) {
                        const sig = sigObj.signature;
                        const tx = await fetchTransaction(sig).catch(
                            () => null
                        );
                        if (!tx || !tx.meta || !tx.transaction) continue;

                        // Normalize account keys
                        const accountKeysRaw =
                            tx.transaction.message.accountKeys || [];
                        const accountKeys: string[] = Array.isArray(
                            accountKeysRaw
                        )
                            ? accountKeysRaw.map((k: any) =>
                                  typeof k === 'string' ? k : k.pubkey
                              )
                            : [];

                        // 1) Check native SOL balance diff for the target
                        const idx = accountKeys.findIndex((k) => k === target);
                        if (
                            idx !== -1 &&
                            tx.meta.preBalances &&
                            tx.meta.postBalances
                        ) {
                            const preBal = BigInt(
                                tx.meta.preBalances[idx] ?? 0
                            );
                            const postBal = BigInt(
                                tx.meta.postBalances[idx] ?? 0
                            );
                            const diff = postBal - preBal;
                            if (process.env.NODE_ENV !== 'production') {
                                console.debug('Solana monitor balance diff', {
                                    network,
                                    sig,
                                    target,
                                    preBal: preBal.toString(),
                                    postBal: postBal.toString(),
                                    diff: diff.toString(),
                                    expected: expectedLamports.toString(),
                                });
                            }
                            if (diff >= expectedLamports) {
                                const status = sigObj.confirmationStatus || '';
                                const confirmations =
                                    status === 'finalized'
                                        ? 32
                                        : status === 'confirmed'
                                        ? 1
                                        : 0;
                                return {
                                    confirmed: true,
                                    transactionHash: sig,
                                    confirmations,
                                };
                            }
                        }

                        // 2) Inspect parsed instructions for system and spl-token transfers
                        try {
                            const instructions =
                                tx.transaction.message.instructions || [];
                            for (const ix of instructions) {
                                // system transfer (native SOL)
                                if (
                                    ix.program === 'system' &&
                                    ix.parsed &&
                                    ix.parsed.type === 'transfer'
                                ) {
                                    const info = ix.parsed.info || {};
                                    const dest = info.destination;
                                    const lamports = BigInt(info.lamports ?? 0);
                                    if (
                                        (dest === target || dest === wallet) &&
                                        lamports >= expectedLamports
                                    ) {
                                        const status =
                                            sigObj.confirmationStatus || '';
                                        const confirmations =
                                            status === 'finalized'
                                                ? 32
                                                : status === 'confirmed'
                                                ? 1
                                                : 0;
                                        return {
                                            confirmed: true,
                                            transactionHash: sig,
                                            confirmations,
                                        };
                                    }
                                }

                                // SPL token transfer (transfer or transferChecked)
                                if (
                                    ix.program === 'spl-token' &&
                                    ix.parsed &&
                                    (ix.parsed.type === 'transfer' ||
                                        ix.parsed.type === 'transferChecked')
                                ) {
                                    const info = ix.parsed.info || {};
                                    const dest = info.destination;
                                    const amountStr =
                                        info.amount ??
                                        info.tokenAmount?.amount ??
                                        null;
                                    if (
                                        (dest === target || dest === wallet) &&
                                        amountStr
                                    ) {
                                        const amountBig = BigInt(amountStr);
                                        if (amountBig > BigInt(0)) {
                                            const status =
                                                sigObj.confirmationStatus || '';
                                            const confirmations =
                                                status === 'finalized'
                                                    ? 32
                                                    : status === 'confirmed'
                                                    ? 1
                                                    : 0;
                                            return {
                                                confirmed: true,
                                                transactionHash: sig,
                                                confirmations,
                                            };
                                        }
                                    }
                                }
                            }
                        } catch {
                            // ignore instruction parse errors for this tx
                        }

                        // 3) Fallback: check token balances arrays (preTokenBalances/postTokenBalances)
                        if (
                            tx.meta.postTokenBalances &&
                            tx.meta.preTokenBalances
                        ) {
                            try {
                                for (
                                    let i = 0;
                                    i < tx.meta.postTokenBalances.length;
                                    i++
                                ) {
                                    const postToken =
                                        tx.meta.postTokenBalances[i];
                                    const preToken =
                                        tx.meta.preTokenBalances[i];
                                    const owner =
                                        postToken && postToken.owner
                                            ? postToken.owner
                                            : null;
                                    if (owner !== wallet && owner !== target)
                                        continue;

                                    const preAmt =
                                        preToken &&
                                        preToken.uiTokenAmount &&
                                        preToken.uiTokenAmount.amount
                                            ? BigInt(
                                                  preToken.uiTokenAmount.amount
                                              )
                                            : BigInt(0);
                                    const postAmt =
                                        postToken &&
                                        postToken.uiTokenAmount &&
                                        postToken.uiTokenAmount.amount
                                            ? BigInt(
                                                  postToken.uiTokenAmount.amount
                                              )
                                            : BigInt(0);
                                    const tokenDiff = postAmt - preAmt;

                                    if (process.env.NODE_ENV !== 'production') {
                                        console.debug(
                                            'Solana monitor token balances',
                                            {
                                                network,
                                                sig,
                                                owner,
                                                preAmt: preAmt.toString(),
                                                postAmt: postAmt.toString(),
                                                tokenDiff: tokenDiff.toString(),
                                            }
                                        );
                                    }

                                    if (tokenDiff > BigInt(0)) {
                                        const status =
                                            sigObj.confirmationStatus || '';
                                        const confirmations =
                                            status === 'finalized'
                                                ? 32
                                                : status === 'confirmed'
                                                ? 1
                                                : 0;
                                        return {
                                            confirmed: true,
                                            transactionHash: sig,
                                            confirmations,
                                        };
                                    }
                                }
                            } catch {
                                // ignore token balance parse errors for this tx
                            }
                        }
                    } // end for sigs
                } // end for targets

                // nothing found on this network — try next network
                if (process.env.NODE_ENV !== 'production') {
                    console.debug(
                        'Solana monitor: no match on network',
                        network
                    );
                }
            } // end for networks

            if (process.env.NODE_ENV !== 'production') {
                console.debug(
                    'Solana monitor debug: no matching tx found for',
                    {
                        address: payment.address,
                        amount: payment.amount,
                        preferredNetwork: payment.network,
                    }
                );
            }

            return { confirmed: false };
        } catch (error) {
            console.error('Solana check error:', error);
            return { confirmed: false };
        }
    }

    /**
     * Check Starknet payment
     */
    // private static async checkStarknetPayment(payment: MerchantPayment): Promise<{
    //     confirmed: boolean;
    //     transactionHash?: string;
    //     confirmations?: number;
    // }> {
    //     try {
    //         // Starknet RPC calls would go here
    //         // This is a placeholder implementation
    //         console.log('Starknet payment checking not fully implemented');
    //         return { confirmed: false };
    //     } catch (error) {
    //         console.error('Starknet check error:', error);
    //         return { confirmed: false };
    //     }
    // }

    // private static async checkStarknetPayment(
    //     payment: MerchantPayment
    // ): Promise<{
    //     confirmed: boolean;
    //     transactionHash?: string;
    //     confirmations?: number;
    // }> {
    //     try {
    //         const network = (payment.network || 'mainnet').toLowerCase();
    //         const apiBase = getBlockchainConfig(
    //             'starknet',
    //             network
    //         ).apiUrl.replace(/\/+$/, '');
    //         const recipientHex = padStarknetAddress(payment.address);
    //         const recipientDec = BigInt(recipientHex).toString();
    //         const expectedAmountBig = BigInt(
    //             Math.floor(Number(payment.amount) * 1e18)
    //         );

    //         // try all known STRK-related token contracts (covers variants)
    //         const contracts = Object.values(STARKNET_TOKEN_CONTRACTS)
    //             .map((c) => c[network as 'mainnet' | 'testnet'])
    //             .filter(Boolean);
    //         if (process.env.NODE_ENV !== 'production') {
    //             console.debug('[STRK] checking', {
    //                 recipientHex,
    //                 recipientDec,
    //                 expectedAmount: expectedAmountBig.toString(),
    //                 contracts,
    //             });
    //         }

    //         const eventsUrl = `${apiBase}/feeder_gateway/get_events`;

    //         const normalizeFelt = (v: any) => {
    //             if (typeof v !== 'string') v = String(v);
    //             if (v.startsWith('0x')) {
    //                 const h = '0x' + v.slice(2).toLowerCase().padStart(64, '0');
    //                 return { hex: h, dec: BigInt(h).toString() };
    //             }
    //             if (/^\d+$/.test(v)) {
    //                 const h = '0x' + BigInt(v).toString(16).padStart(64, '0');
    //                 return { hex: h, dec: v };
    //             }
    //             return { hex: v.toLowerCase(), dec: v };
    //         };

    //         for (const tokenContract of contracts) {
    //             // Try filtered queries first (various key shapes)
    //             const attemptBodies = [
    //                 {
    //                     contract_address: tokenContract,
    //                     from_block: 0,
    //                     to_block: 'latest',
    //                     keys: [null, null, recipientHex],
    //                     page_size: 1000,
    //                 },
    //                 {
    //                     contract_address: tokenContract,
    //                     from_block: 0,
    //                     to_block: 'latest',
    //                     keys: [null, recipientHex],
    //                     page_size: 1000,
    //                 },
    //                 {
    //                     contract_address: tokenContract,
    //                     from_block: 0,
    //                     to_block: 'latest',
    //                     page_size: 1000,
    //                 },
    //             ];

    //             let events: any[] = [];
    //             for (const body of attemptBodies) {
    //                 try {
    //                     const r = await axios.post(eventsUrl, body, {
    //                         timeout: 20000,
    //                     });
    //                     const d = r.data || {};
    //                     events = d.result?.events ?? d.events ?? d ?? [];
    //                     if (Array.isArray(events) && events.length > 0) break;
    //                 } catch (err) {
    //                     // ignore and try next body
    //                     if (process.env.NODE_ENV !== 'production') {
    //                         console.debug('[STRK] get_events attempt failed', {
    //                             tokenContract,
    //                             err: (err as any)?.message ?? err,
    //                         });
    //                     }
    //                 }
    //             }

    //             if (!Array.isArray(events) || events.length === 0) {
    //                 if (process.env.NODE_ENV !== 'production') {
    //                     console.debug(
    //                         '[STRK] no events for contract',
    //                         tokenContract
    //                     );
    //                 }
    //                 continue;
    //             }

    //             for (const ev of events) {
    //                 const keysArr: any[] | undefined =
    //                     ev.keys ?? ev.keys_data ?? ev.keys_arr ?? undefined;
    //                 const dataArr: any[] | undefined =
    //                     ev.data ?? ev.data_arr ?? undefined;
    //                 const txHash =
    //                     ev.transaction_hash ??
    //                     ev.transactionHash ??
    //                     ev.tx_hash ??
    //                     ev.txHash ??
    //                     ev.transaction;

    //                 // locate recipient in keys (any index) or in data[1]
    //                 let matchedRecipient = false;
    //                 if (Array.isArray(keysArr)) {
    //                     for (const k of keysArr) {
    //                         try {
    //                             const n = normalizeFelt(k);
    //                             if (
    //                                 n.hex === recipientHex ||
    //                                 n.dec === recipientDec
    //                             ) {
    //                                 matchedRecipient = true;
    //                                 break;
    //                             }
    //                         } catch {
    //                             /* ignore */
    //                         }
    //                     }
    //                 }
    //                 if (
    //                     !matchedRecipient &&
    //                     Array.isArray(dataArr) &&
    //                     dataArr.length >= 2
    //                 ) {
    //                     try {
    //                         const n = normalizeFelt(dataArr[1]);
    //                         if (
    //                             n.hex === recipientHex ||
    //                             n.dec === recipientDec
    //                         )
    //                             matchedRecipient = true;
    //                     } catch {
    //                         /* ignore */
    //                     }
    //                 }
    //                 if (!matchedRecipient) continue;

    //                 // extract amount (try data entries and last element)
    //                 let amountRaw: any = undefined;
    //                 if (Array.isArray(dataArr) && dataArr.length > 0) {
    //                     // common: amount in data[0] or last
    //                     amountRaw = dataArr[0] ?? dataArr[dataArr.length - 1];
    //                 } else if (Array.isArray(ev.data) && ev.data.length > 0) {
    //                     amountRaw = ev.data[0] ?? ev.data[ev.data.length - 1];
    //                 } else if (Array.isArray(keysArr) && keysArr.length >= 3) {
    //                     // sometimes amount is in keys or other positions — try last key
    //                     amountRaw = keysArr[keysArr.length - 1];
    //                 }
    //                 if (!amountRaw) continue;

    //                 let evAmountBig: bigint;
    //                 try {
    //                     const a = normalizeFelt(amountRaw);
    //                     // prefer decimal value since felts often represent integer decimals
    //                     evAmountBig = BigInt(a.dec);
    //                 } catch {
    //                     try {
    //                         evAmountBig = BigInt(amountRaw);
    //                     } catch {
    //                         continue;
    //                     }
    //                 }

    //                 if (process.env.NODE_ENV !== 'production') {
    //                     console.debug('[STRK] event', {
    //                         tokenContract,
    //                         txHash,
    //                         evAmount: evAmountBig.toString(),
    //                         expected: expectedAmountBig.toString(),
    //                     });
    //                 }

    //                 if (evAmountBig >= expectedAmountBig) {
    //                     return {
    //                         confirmed: true,
    //                         transactionHash: txHash,
    //                         confirmations: 1,
    //                     };
    //                 }
    //             }
    //         }

    //         return { confirmed: false };
    //     } catch (error) {
    //         console.error(
    //             'Starknet check error:',
    //             error instanceof Error ? error.message : error
    //         );
    //         return { confirmed: false };
    //     }
    // }

    /**
 * Check Starknet payment with multiple fallback strategies
 */
private static async checkStarknetPayment(
    payment: MerchantPayment
): Promise<{
    confirmed: boolean;
    transactionHash?: string;
    confirmations?: number;
}> {
    try {
        const network = (payment.network || 'mainnet').toLowerCase();
        const recipientHex = padStarknetAddress(payment.address);
        const recipientDec = BigInt(recipientHex).toString();
        const expectedAmountBig = BigInt(Math.floor(Number(payment.amount) * 1e18));

        if (process.env.NODE_ENV !== 'production') {
            console.log('[STRK] Checking payment:', {
                address: payment.address,
                recipientHex,
                expectedAmount: expectedAmountBig.toString(),
                network,
            });
        }

        // Strategy 1: Try Voyager API (most reliable for testnet/mainnet)
        try {
            const voyagerBase = network === 'testnet' || network === 'sepolia'
                ? 'https://api-testnet.voyager.online/api/v1'
                : 'https://api.voyager.online/api/v1';

            const response = await axios.get(
                `${voyagerBase}/contracts/${recipientHex}/transfers`,
                {
                    params: { ps: 100, p: 1 },
                    timeout: 15000,
                }
            );

            const transfers = (response.data && typeof response.data === 'object' && 'items' in response.data)
                ? (response.data as { items: any[] }).items
                : [];
            if (process.env.NODE_ENV !== 'production') {
                console.log(`[STRK] Voyager returned ${transfers.length} transfers`);
            }

            for (const transfer of transfers) {
                const toAddr = transfer.to?.toLowerCase();
                if (toAddr !== recipientHex.toLowerCase()) continue;

                let transferAmount: bigint;
                try {
                    transferAmount = BigInt(transfer.value || transfer.amount || '0');
                } catch {
                    continue;
                }

                // Allow 1% tolerance for rounding/fees
                const tolerance = expectedAmountBig / BigInt(100);
                const minAmount = expectedAmountBig - tolerance;

                if (process.env.NODE_ENV !== 'production') {
                    console.log('[STRK] Voyager transfer:', {
                        hash: transfer.hash,
                        amount: transferAmount.toString(),
                        expected: expectedAmountBig.toString(),
                        matches: transferAmount >= minAmount,
                    });
                }

                if (transferAmount >= minAmount) {
                    return {
                        confirmed: true,
                        transactionHash: transfer.hash || transfer.transaction_hash,
                        confirmations: 1,
                    };
                }
            }
        } catch (voyagerErr: any) {
            if (process.env.NODE_ENV !== 'production') {
                console.log('[STRK] Voyager API failed:', voyagerErr.message);
            }
        }

        // Strategy 2: Try Feeder Gateway API
        const apiBase = getBlockchainConfig('starknet', network).apiUrl.replace(/\/+$/, '');
        const contracts = Object.values(STARKNET_TOKEN_CONTRACTS)
            .map((c) => c[network as 'mainnet' | 'testnet'])
            .filter(Boolean);

        const eventsUrl = `${apiBase}/feeder_gateway/get_events`;
        const transferEventSelector = '0x99cd8bde557814842a3121e8ddfd433a539b8c9f14bf31ebf108d12e6196e9';

        for (const tokenContract of contracts) {
            try {
                // Query with Transfer event selector and recipient filter
                const response = await axios.post(
                    eventsUrl,
                    {
                        contract_address: tokenContract,
                        from_block: 0,
                        to_block: 'latest',
                        keys: [
                            [transferEventSelector],
                            null, // from (any)
                            recipientHex, // to (our recipient)
                        ],
                        page_size: 100,
                    },
                    {
                        timeout: 20000,
                        headers: { 'Content-Type': 'application/json' },
                    }
                );

                const data: any = response.data || {};
                let events = data.result?.events ?? data.events ?? [];

                // Fallback: try without keys filter if no results
                if (!Array.isArray(events) || events.length === 0) {
                    const fallbackResponse = await axios.post(
                        eventsUrl,
                        {
                            contract_address: tokenContract,
                            from_block: 0,
                            to_block: 'latest',
                            page_size: 1000,
                        },
                        {
                            timeout: 20000,
                            headers: { 'Content-Type': 'application/json' },
                        }
                    );
                    const fallbackData = fallbackResponse.data || {};
                    events = (fallbackData as any).result?.events ?? (fallbackData as any).events ?? [];
                }

                if (process.env.NODE_ENV !== 'production') {
                    console.log(`[STRK] Contract ${tokenContract}: ${events.length} events`);
                }

                if (!Array.isArray(events)) continue;

                // Process each event
                for (const event of events) {
                    const keys = event.keys ?? [];
                    const data = event.data ?? [];
                    const txHash = event.transaction_hash ?? event.transactionHash ?? event.tx_hash;

                    // Check if this is a Transfer event to our recipient
                    if (keys.length < 3) continue;

                    // Normalize the recipient address from keys[2]
                    let eventRecipient: string;
                    try {
                        const raw = typeof keys[2] === 'string' ? keys[2] : String(keys[2]);
                        eventRecipient = padStarknetAddress(raw);
                    } catch {
                        continue;
                    }

                    if (eventRecipient !== recipientHex) continue;

                    // Extract amount from data[0] and data[1] (uint256 representation)
                    if (data.length === 0) continue;

                    let eventAmount: bigint;
                    try {
                        const amountLowStr = typeof data[0] === 'string' ? data[0] : String(data[0]);
                        const amountHighStr = data.length > 1 
                            ? (typeof data[1] === 'string' ? data[1] : String(data[1]))
                            : '0';

                        // Convert to BigInt (handle both hex and decimal)
                        const amountLow = amountLowStr.startsWith('0x')
                            ? BigInt(amountLowStr)
                            : BigInt(amountLowStr);
                        const amountHigh = amountHighStr.startsWith('0x')
                            ? BigInt(amountHighStr)
                            : BigInt(amountHighStr);

                        // Combine low and high parts (uint256)
                        eventAmount = amountLow + (amountHigh << BigInt(128));
                    } catch (err) {
                        if (process.env.NODE_ENV !== 'production') {
                            console.log('[STRK] Failed to parse amount:', err);
                        }
                        continue;
                    }

                    // Check if amount matches (with 1% tolerance)
                    const tolerance = expectedAmountBig / BigInt(100);
                    const minAmount = expectedAmountBig - tolerance;

                    if (process.env.NODE_ENV !== 'production') {
                        console.log('[STRK] Event details:', {
                            txHash,
                            eventAmount: eventAmount.toString(),
                            expectedAmount: expectedAmountBig.toString(),
                            matches: eventAmount >= minAmount,
                        });
                    }

                    if (eventAmount >= minAmount) {
                        return {
                            confirmed: true,
                            transactionHash: txHash,
                            confirmations: 1,
                        };
                    }
                }
            } catch (err: any) {
                if (process.env.NODE_ENV !== 'production') {
                    console.error(`[STRK] Error checking contract ${tokenContract}:`, err.message);
                }
            }
        }

        // Strategy 3: Try Starkscan API as last resort
        try {
            const starkscanBase = network === 'testnet' || network === 'sepolia'
                ? 'https://api-testnet.starkscan.co/api/v0'
                : 'https://api.starkscan.co/api/v0';

            const response = await axios.get(`${starkscanBase}/transactions`, {
                params: {
                    to_address: recipientHex,
                    order_by: 'desc',
                    limit: 50,
                },
                timeout: 15000,
            });

            const txs =
                response.data && typeof response.data === 'object' && 'data' in response.data
                    ? (response.data as { data: any[] }).data
                    : [];
            if (process.env.NODE_ENV !== 'production') {
                console.log(`[STRK] Starkscan returned ${txs.length} transactions`);
            }

            // This is a basic check - you may need to fetch individual tx details
            if (txs.length > 0) {
                // For a more accurate check, you'd need to fetch each transaction
                // and examine its events/transfers
                return {
                    confirmed: false, // Set to true only if you can verify the amount
                };
            }
        } catch (starkscanErr: any) {
            if (process.env.NODE_ENV !== 'production') {
                console.log('[STRK] Starkscan API failed:', starkscanErr.message);
            }
        }

        if (process.env.NODE_ENV !== 'production') {
            console.log('[STRK] No matching payment found');
        }

        return { confirmed: false };
    } catch (error) {
        console.error('[STRK] Check error:', error instanceof Error ? error.message : error);
        return { confirmed: false };
    }
}

/**
 * Check Starknet payment with optimized timeouts and retry logic
 */
// private static async checkStarknetPayment(
//     payment: MerchantPayment
// ): Promise<{
//     confirmed: boolean;
//     transactionHash?: string;
//     confirmations?: number;
// }> {
//     try {
//         const network = (payment.network || 'mainnet').toLowerCase();
//         const recipientHex = padStarknetAddress(payment.address);
//         const expectedAmountBig = BigInt(Math.floor(Number(payment.amount) * 1e18));

//         if (process.env.NODE_ENV !== 'production') {
//             console.log('[STRK] Checking payment:', {
//                 address: payment.address,
//                 recipientHex,
//                 expectedAmount: expectedAmountBig.toString(),
//                 network,
//             });
//         }

//         // Helper function to retry API calls
//         const retryRequest = async (fn: () => Promise<any>, maxRetries = 2): Promise<any> => {
//             for (let i = 0; i <= maxRetries; i++) {
//                 try {
//                     return await fn();
//                 } catch (err: any) {
//                     if (i === maxRetries) throw err;
//                     await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
//                 }
//             }
//         };

//         // Strategy 1: Try Starknet RPC directly (faster than feeder gateway)
//         try {
//             const rpcUrl = network === 'testnet' || network === 'sepolia'
//                 ? 'https://starknet-sepolia.public.blastapi.io/rpc/v0_7'
//                 : 'https://starknet-mainnet.public.blastapi.io/rpc/v0_7';

//             // Get recent blocks to scan
//             const blockResponse = await axios.post(
//                 rpcUrl,
//                 {
//                     jsonrpc: '2.0',
//                     method: 'starknet_blockNumber',
//                     params: [],
//                     id: 1,
//                 },
//                 { timeout: 10000 }
//             );

//             const currentBlock = blockResponse.data?.result || 0;
//             const fromBlock = Math.max(0, currentBlock - 5000); // Check last ~5000 blocks (~17 hours)

//             if (process.env.NODE_ENV !== 'production') {
//                 console.log(`[STRK] Scanning blocks ${fromBlock} to ${currentBlock}`);
//             }

//             // Get events for STRK token contract
//             const strkContract = network === 'testnet' || network === 'sepolia'
//                 ? '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d'
//                 : '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d';

//             const eventsResponse = await retryRequest(() =>
//                 axios.post(
//                     rpcUrl,
//                     {
//                         jsonrpc: '2.0',
//                         method: 'starknet_getEvents',
//                         params: [{
//                             from_block: { block_number: fromBlock },
//                             to_block: { block_number: currentBlock },
//                             address: strkContract,
//                             keys: [
//                                 ['0x99cd8bde557814842a3121e8ddfd433a539b8c9f14bf31ebf108d12e6196e9'], // Transfer selector
//                             ],
//                             chunk_size: 100,
//                         }],
//                         id: 2,
//                     },
//                     { timeout: 30000 }
//                 )
//             );

//             const events = eventsResponse.data?.result?.events || [];
//             if (process.env.NODE_ENV !== 'production') {
//                 console.log(`[STRK] RPC returned ${events.length} events`);
//             }

//             for (const event of events) {
//                 const keys = event.keys ?? [];
//                 const data = event.data ?? [];
//                 const txHash = event.transaction_hash;

//                 if (keys.length < 3 || data.length < 2) continue;

//                 // Check recipient (keys[2])
//                 let eventRecipient: string;
//                 try {
//                     eventRecipient = padStarknetAddress(keys[2]);
//                 } catch {
//                     continue;
//                 }

//                 if (eventRecipient !== recipientHex) continue;

//                 // Parse amount (uint256: low + high << 128)
//                 try {
//                     const amountLow = BigInt(data[0]);
//                     const amountHigh = BigInt(data[1] || '0');
//                     const eventAmount = amountLow + (amountHigh << BigInt(128));

//                     const tolerance = expectedAmountBig / BigInt(100);
//                     const minAmount = expectedAmountBig - tolerance;

//                     if (process.env.NODE_ENV !== 'production') {
//                         console.log('[STRK] RPC event:', {
//                             txHash,
//                             eventAmount: eventAmount.toString(),
//                             expectedAmount: expectedAmountBig.toString(),
//                             matches: eventAmount >= minAmount,
//                         });
//                     }

//                     if (eventAmount >= minAmount) {
//                         return {
//                             confirmed: true,
//                             transactionHash: txHash,
//                             confirmations: 1,
//                         };
//                     }
//                 } catch (err) {
//                     continue;
//                 }
//             }
//         } catch (rpcErr: any) {
//             if (process.env.NODE_ENV !== 'production') {
//                 console.log('[STRK] RPC API failed:', rpcErr.message);
//             }
//         }

//         // Strategy 2: Try Voyager API with retry
//         try {
//             const voyagerBase = network === 'testnet' || network === 'sepolia'
//                 ? 'https://api-testnet.voyager.online/api/v1'
//                 : 'https://api.voyager.online/api/v1';

//             const response = await retryRequest(() =>
//                 axios.get(
//                     `${voyagerBase}/contracts/${recipientHex}/transfers`,
//                     {
//                         params: { ps: 100, p: 1 },
//                         timeout: 30000,
//                     }
//                 )
//             );

//             const transfers = response.data?.items ?? [];
//             if (process.env.NODE_ENV !== 'production') {
//                 console.log(`[STRK] Voyager returned ${transfers.length} transfers`);
//             }

//             for (const transfer of transfers) {
//                 const toAddr = transfer.to?.toLowerCase();
//                 if (toAddr !== recipientHex.toLowerCase()) continue;

//                 let transferAmount: bigint;
//                 try {
//                     transferAmount = BigInt(transfer.value || transfer.amount || '0');
//                 } catch {
//                     continue;
//                 }

//                 const tolerance = expectedAmountBig / BigInt(100);
//                 const minAmount = expectedAmountBig - tolerance;

//                 if (process.env.NODE_ENV !== 'production') {
//                     console.log('[STRK] Voyager transfer:', {
//                         hash: transfer.hash,
//                         amount: transferAmount.toString(),
//                         expected: expectedAmountBig.toString(),
//                         matches: transferAmount >= minAmount,
//                     });
//                 }

//                 if (transferAmount >= minAmount) {
//                     return {
//                         confirmed: true,
//                         transactionHash: transfer.hash || transfer.transaction_hash,
//                         confirmations: 1,
//                     };
//                 }
//             }
//         } catch (voyagerErr: any) {
//             if (process.env.NODE_ENV !== 'production') {
//                 console.log('[STRK] Voyager API failed:', voyagerErr.message);
//             }
//         }

//         // Strategy 3: Try alternative RPC endpoints
//         const alternativeRPCs = network === 'testnet' || network === 'sepolia'
//             ? [
//                 'https://rpc.starknet-testnet.lava.build',
//                 'https://starknet-sepolia.g.alchemy.com/v2/demo',
//             ]
//             : [
//                 'https://rpc.starknet.lava.build',
//                 'https://starknet-mainnet.g.alchemy.com/v2/demo',
//             ];

//         for (const rpcUrl of alternativeRPCs) {
//             try {
//                 const blockResponse = await axios.post(
//                     rpcUrl,
//                     {
//                         jsonrpc: '2.0',
//                         method: 'starknet_blockNumber',
//                         params: [],
//                         id: 1,
//                     },
//                     { timeout: 10000 }
//                 );

//                 const currentBlock = blockResponse.data?.result || 0;
//                 const fromBlock = Math.max(0, currentBlock - 5000);

//                 const strkContract = '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d';

//                 const eventsResponse = await axios.post(
//                     rpcUrl,
//                     {
//                         jsonrpc: '2.0',
//                         method: 'starknet_getEvents',
//                         params: [{
//                             from_block: { block_number: fromBlock },
//                             to_block: { block_number: currentBlock },
//                             address: strkContract,
//                             keys: [
//                                 ['0x99cd8bde557814842a3121e8ddfd433a539b8c9f14bf31ebf108d12e6196e9'],
//                             ],
//                             chunk_size: 100,
//                         }],
//                         id: 2,
//                     },
//                     { timeout: 30000 }
//                 );

//                 const events = eventsResponse.data?.result?.events || [];
//                 if (process.env.NODE_ENV !== 'production') {
//                     console.log(`[STRK] Alternative RPC (${rpcUrl}) returned ${events.length} events`);
//                 }

//                 for (const event of events) {
//                     const keys = event.keys ?? [];
//                     const data = event.data ?? [];
//                     const txHash = event.transaction_hash;

//                     if (keys.length < 3 || data.length < 2) continue;

//                     let eventRecipient: string;
//                     try {
//                         eventRecipient = padStarknetAddress(keys[2]);
//                     } catch {
//                         continue;
//                     }

//                     if (eventRecipient !== recipientHex) continue;

//                     try {
//                         const amountLow = BigInt(data[0]);
//                         const amountHigh = BigInt(data[1] || '0');
//                         const eventAmount = amountLow + (amountHigh << BigInt(128));

//                         const tolerance = expectedAmountBig / BigInt(100);
//                         const minAmount = expectedAmountBig - tolerance;

//                         if (eventAmount >= minAmount) {
//                             return {
//                                 confirmed: true,
//                                 transactionHash: txHash,
//                                 confirmations: 1,
//                             };
//                         }
//                     } catch {
//                         continue;
//                     }
//                 }

//                 // If we got here, this RPC worked but no matching tx found
//                 break;
//             } catch (err: any) {
//                 if (process.env.NODE_ENV !== 'production') {
//                     console.log(`[STRK] Alternative RPC ${rpcUrl} failed:`, err.message);
//                 }
//                 continue;
//             }
//         }

//         if (process.env.NODE_ENV !== 'production') {
//             console.log('[STRK] No matching payment found after checking all strategies');
//         }

//         return { confirmed: false };
//     } catch (error) {
//         console.error('[STRK] Check error:', error instanceof Error ? error.message : error);
//         return { confirmed: false };
//     }
// }

    /**
     * Get payment statistics for the merchant
     */
    static async getPaymentStats(req: AuthRequest, res: Response) {
        try {
            const userId = req.user!.id;
            const paymentRepo = AppDataSource.getRepository(MerchantPayment);

            const [
                totalPayments,
                pendingPayments,
                completedPayments,
                cancelledPayments,
            ] = await Promise.all([
                paymentRepo.count({ where: { userId } }),
                paymentRepo.count({
                    where: { userId, status: MerchantPaymentStatus.PENDING },
                }),
                paymentRepo.count({
                    where: { userId, status: MerchantPaymentStatus.COMPLETED },
                }),
                paymentRepo.count({
                    where: { userId, status: MerchantPaymentStatus.CANCELLED },
                }),
            ]);

            // Calculate total amount by status
            const payments = await paymentRepo.find({ where: { userId } });
            const totalAmount = payments
                .filter((p) => p.status === MerchantPaymentStatus.COMPLETED)
                .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

            res.json({
                stats: {
                    total: totalPayments,
                    pending: pendingPayments,
                    completed: completedPayments,
                    cancelled: cancelledPayments,
                    totalAmount,
                },
            });
        } catch (error) {
            console.error('Get payment stats error:', error);
            res.status(500).json({
                error: 'Failed to fetch payment statistics',
            });
        }
    }
}
