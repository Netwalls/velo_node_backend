// import { Request, Response } from 'express';
// import { AppDataSource } from '../config/database';
// import {
//     MerchantPayment,
//     MerchantPaymentStatus,
// } from '../entities/MerchantPayment';
// import { Notification } from '../entities/Notification';
// import { NotificationType } from '../types/index';
// import { AuthRequest } from '../types';
// import axios from 'axios';

// // Validation helpers
// function isValidEthAddress(address: string): boolean {
//     return /^0x[a-fA-F0-9]{40}$/.test(address);
// }

// function isValidBtcAddress(address: string): boolean {
//     return /^[13mn2][a-zA-Z0-9]{25,39}$/.test(address);
// }

// function isValidSolAddress(address: string): boolean {
//     return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
// }

// function isValidStrkAddress(address: string): boolean {
//     return /^0x[a-fA-F0-9]{63,64}$/.test(address);
// }

// // Blockchain API helpers with mainnet/testnet support
// interface BlockchainConfig {
//     apiUrl: string;
//     apiKey?: string;
//     explorerUrl?: string;
// }

// const BLOCKCHAIN_APIS = {
//     ethereum: {
//         mainnet: {
//             apiUrl: 'https://api.etherscan.io/api',
//             apiKey: process.env.ETHERSCAN_API_KEY || '',
//             explorerUrl: 'https://etherscan.io',
//         },
//         testnet: {
//             apiUrl: 'https://api-sepolia.etherscan.io/api',
//             apiKey: process.env.ETHERSCAN_API_KEY || '',
//             explorerUrl: 'https://sepolia.etherscan.io',
//         },
//     },
//     bitcoin: {
//         mainnet: {
//             apiUrl: 'https://blockchain.info/rawaddr',
//             explorerUrl: 'https://blockchain.info',
//         },
//         testnet: {
//             apiUrl: 'https://blockstream.info/testnet/api/address',
//             explorerUrl: 'https://blockstream.info/testnet',
//         },
//     },
//     solana: {
//         mainnet: {
//             apiUrl: 'https://api.mainnet-beta.solana.com',
//             explorerUrl: 'https://explorer.solana.com',
//         },
//         testnet: {
//             apiUrl: 'https://api.testnet.solana.com',
//             explorerUrl: 'https://explorer.solana.com/?cluster=testnet',
//         },
//         devnet: {
//             apiUrl: 'https://api.devnet.solana.com',
//             explorerUrl: 'https://explorer.solana.com/?cluster=devnet',
//         },
//     },
//     starknet: {
//         mainnet: {
//             apiUrl: 'https://alpha-mainnet.starknet.io',
//             explorerUrl: 'https://starkscan.co',
//         },
//         testnet: {
//             apiUrl: 'https://alpha4.starknet.io',
//             explorerUrl: 'https://testnet.starkscan.co',
//         },
//     },
// };

// function getBlockchainConfig(chain: string, network: string): BlockchainConfig {
//     const normalizedNetwork = network?.toLowerCase() || 'mainnet';
//     const chainConfig = BLOCKCHAIN_APIS[chain as keyof typeof BLOCKCHAIN_APIS];
    
//     if (!chainConfig) {
//         throw new Error(`Unsupported chain: ${chain}`);
//     }

//     if (chain === 'usdt-erc20') {
//         return BLOCKCHAIN_APIS.ethereum[normalizedNetwork as keyof typeof BLOCKCHAIN_APIS.ethereum];
//     }

//     const config = chainConfig[normalizedNetwork as keyof typeof chainConfig];
    
//     if (!config) {
//         throw new Error(`Unsupported network ${normalizedNetwork} for chain ${chain}`);
//     }

//     return config;
// }

// export class MerchantController {
//     /**
//      * Create a new payment request with QR code support
//      */
//     static async createPayment(req: AuthRequest, res: Response) {
//         try {
//             const {
//                 amount,
//                 chain,
//                 network,
//                 ethAddress,
//                 btcAddress,
//                 solAddress,
//                 strkAddress,
//                 usdtErc20Address,
//                 usdtTrc20Address,
//                 description,
//             } = req.body;
//             const userId = req.user!.id;

//             // Validate required fields
//             if (!amount || amount <= 0) {
//                 return res.status(400).json({ error: 'Valid amount is required' });
//             }

//             if (!chain) {
//                 return res.status(400).json({ error: 'Chain is required' });
//             }

//             // Determine the address based on chain
//             const address =
//                 ethAddress ||
//                 btcAddress ||
//                 solAddress ||
//                 strkAddress ||
//                 usdtErc20Address ||
//                 usdtTrc20Address;

//             if (!address) {
//                 return res.status(400).json({
//                     error: 'At least one address must be provided for the selected chain',
//                 });
//             }

//             // Validate address format based on chain
//             const validations: Record<string, () => boolean> = {
//                 bitcoin: () => isValidBtcAddress(address),
//                 ethereum: () => isValidEthAddress(address),
//                 solana: () => isValidSolAddress(address),
//                 starknet: () => isValidStrkAddress(address),
//                 'usdt-erc20': () => isValidEthAddress(address),
//                 'usdt-trc20': () => isValidBtcAddress(address),
//             };

//             if (validations[chain] && !validations[chain]()) {
//                 return res.status(400).json({
//                     error: `Invalid ${chain} address format`,
//                 });
//             }

//             const paymentRepo = AppDataSource.getRepository(MerchantPayment);

//             // Create payment request
//             const payment = paymentRepo.create({
//                 userId,
//                 amount,
//                 chain,
//                 network: network || 'mainnet',
//                 ethAddress,
//                 btcAddress,
//                 solAddress,
//                 strkAddress,
//                 usdtErc20Address,
//                 usdtTrc20Address,
//                 address,
//                 status: MerchantPaymentStatus.PENDING,
//                 description: description || `Payment request for ${amount} ${chain.toUpperCase()}`,
//             });

//             await paymentRepo.save(payment);

//             // Create notification
//             await AppDataSource.getRepository(Notification).save({
//                 userId,
//                 type: NotificationType.QR_PAYMENT_CREATED,
//                 title: 'QR Payment Created',
//                 message: `You created a QR payment request for ${amount} ${chain.toUpperCase()}`,
//                 details: {
//                     amount,
//                     chain,
//                     network: payment.network,
//                     paymentId: payment.id,
//                     address,
//                 },
//                 isRead: false,
//                 createdAt: new Date(),
//             });

//             res.status(201).json({
//                 message: 'Payment request created successfully',
//                 payment: {
//                     id: payment.id,
//                     amount: payment.amount,
//                     chain: payment.chain,
//                     network: payment.network,
//                     address: payment.address,
//                     status: payment.status,
//                     createdAt: payment.createdAt,
//                     qrData: `${chain}:${address}?amount=${amount}`,
//                 },
//             });
//         } catch (error) {
//             console.error('Create payment error:', error);
//             res.status(500).json({ error: 'Failed to create payment request' });
//         }
//     }

//     /**
//      * Get all payment requests for the merchant
//      */
//     static async getPayments(req: AuthRequest, res: Response) {
//         try {
//             const userId = req.user!.id;
//             const { status, chain, limit = 50, offset = 0 } = req.query;

//             const paymentRepo = AppDataSource.getRepository(MerchantPayment);

//             // Build query
//             const queryBuilder = paymentRepo
//                 .createQueryBuilder('payment')
//                 .where('payment.userId = :userId', { userId })
//                 .orderBy('payment.createdAt', 'DESC')
//                 .skip(Number(offset))
//                 .take(Number(limit));

//             // Filter by status if provided
//             if (status) {
//                 queryBuilder.andWhere('payment.status = :status', { status });
//             }

//             // Filter by chain if provided
//             if (chain) {
//                 queryBuilder.andWhere('payment.chain = :chain', { chain });
//             }

//             const [payments, total] = await queryBuilder.getManyAndCount();

//             res.json({
//                 payments,
//                 pagination: {
//                     total,
//                     limit: Number(limit),
//                     offset: Number(offset),
//                     hasMore: total > Number(offset) + Number(limit),
//                 },
//             });
//         } catch (error) {
//             console.error('Get payments error:', error);
//             res.status(500).json({ error: 'Failed to fetch payments' });
//         }
//     }

//     /**
//      * Get a single payment by ID
//      */
//     static async getPaymentById(req: AuthRequest, res: Response) {
//         try {
//             const userId = req.user!.id;
//             const { id } = req.params;

//             const paymentRepo = AppDataSource.getRepository(MerchantPayment);

//             const payment = await paymentRepo.findOne({
//                 where: { id, userId },
//             });

//             if (!payment) {
//                 return res.status(404).json({ error: 'Payment not found' });
//             }

//             res.json({ payment });
//         } catch (error) {
//             console.error('Get payment by ID error:', error);
//             res.status(500).json({ error: 'Failed to fetch payment' });
//         }
//     }

//     /**
//      * Cancel a payment by ID
//      */
//     static async cancelPayment(req: AuthRequest, res: Response) {
//         try {
//             const userId = req.user!.id;
//             const { id } = req.params;

//             const paymentRepo = AppDataSource.getRepository(MerchantPayment);

//             const payment = await paymentRepo.findOne({
//                 where: { id, userId },
//             });

//             if (!payment) {
//                 return res.status(404).json({ error: 'Payment not found' });
//             }

//             // Only pending payments can be cancelled
//             if (payment.status !== MerchantPaymentStatus.PENDING) {
//                 return res.status(400).json({
//                     error: `Cannot cancel payment with status: ${payment.status}`,
//                 });
//             }

//             payment.status = MerchantPaymentStatus.CANCELLED;
//             payment.updatedAt = new Date();
//             await paymentRepo.save(payment);

//             // Create notification
//             await AppDataSource.getRepository(Notification).save({
//                 userId,
//                 type: NotificationType.QR_PAYMENT_CREATED,
//                 title: 'Payment Cancelled',
//                 message: `Payment request #${payment.id} has been cancelled`,
//                 details: {
//                     paymentId: payment.id,
//                     amount: payment.amount,
//                     chain: payment.chain,
//                 },
//                 isRead: false,
//                 createdAt: new Date(),
//             });

//             res.json({
//                 message: 'Payment cancelled successfully',
//                 payment,
//             });
//         } catch (error) {
//             console.error('Cancel payment error:', error);
//             res.status(500).json({ error: 'Failed to cancel payment' });
//         }
//     }

//     /**
//      * Monitor a specific payment for blockchain confirmations
//      */
//     static async monitorPayment(req: AuthRequest, res: Response) {
//         try {
//             const userId = req.user!.id;
//             const { id } = req.params;

//             const paymentRepo = AppDataSource.getRepository(MerchantPayment);

//             const payment = await paymentRepo.findOne({
//                 where: { id, userId },
//             });

//             if (!payment) {
//                 return res.status(404).json({ error: 'Payment not found' });
//             }

//             // Check blockchain for payment
//             const blockchainStatus = await MerchantController.checkBlockchainPayment(payment);

//             // Update payment if confirmed
//             if (blockchainStatus.confirmed && payment.status === MerchantPaymentStatus.PENDING) {
//                 payment.status = MerchantPaymentStatus.COMPLETED;
//                 payment.transactionHash = blockchainStatus.transactionHash;
//                 payment.updatedAt = new Date();
//                 await paymentRepo.save(payment);

//                 // Create notification
//                 await AppDataSource.getRepository(Notification).save({
//                     userId,
//                     type: NotificationType.QR_PAYMENT_CREATED,
//                     title: 'Payment Completed',
//                     message: `Payment #${payment.id} has been confirmed on the blockchain`,
//                     details: {
//                         paymentId: payment.id,
//                         amount: payment.amount,
//                         chain: payment.chain,
//                         transactionHash: blockchainStatus.transactionHash,
//                     },
//                     isRead: false,
//                     createdAt: new Date(),
//                 });
//             }

//             res.json({
//                 payment,
//                 blockchainStatus,
//             });
//         } catch (error) {
//             console.error('Monitor payment error:', error);
//             res.status(500).json({ error: 'Failed to monitor payment' });
//         }
//     }

//     /**
//      * Monitor all pending payments (can be called by a cron job)
//      */
//     static async monitorAllPendingPayments(req: Request, res: Response) {
//         try {
//             const paymentRepo = AppDataSource.getRepository(MerchantPayment);

//             // Get all pending payments
//             const pendingPayments = await paymentRepo.find({
//                 where: { status: MerchantPaymentStatus.PENDING },
//             });

//             const results = [];

//             for (const payment of pendingPayments) {
//                 try {
//                     const blockchainStatus = await MerchantController.checkBlockchainPayment(payment);

//                     if (blockchainStatus.confirmed) {
//                         payment.status = MerchantPaymentStatus.COMPLETED;
//                         payment.transactionHash = blockchainStatus.transactionHash;
//                         payment.updatedAt = new Date();
//                         await paymentRepo.save(payment);

//                         // Create notification
//                         await AppDataSource.getRepository(Notification).save({
//                             userId: payment.userId,
//                             type: NotificationType.QR_PAYMENT_CREATED,
//                             title: 'Payment Completed',
//                             message: `Payment #${payment.id} has been confirmed`,
//                             details: {
//                                 paymentId: payment.id,
//                                 amount: payment.amount,
//                                 chain: payment.chain,
//                                 transactionHash: blockchainStatus.transactionHash,
//                             },
//                             isRead: false,
//                             createdAt: new Date(),
//                         });

//                         results.push({
//                             paymentId: payment.id,
//                             status: 'completed',
//                             transactionHash: blockchainStatus.transactionHash,
//                         });
//                     }
//                 } catch (error) {
//                     console.error(`Error monitoring payment ${payment.id}:`, error);
//                     results.push({
//                         paymentId: payment.id,
//                         status: 'error',
//                         error: error instanceof Error ? error.message : 'Unknown error',
//                     });
//                 }
//             }

//             res.json({
//                 message: `Monitored ${pendingPayments.length} pending payments`,
//                 checked: pendingPayments.length,
//                 completed: results.filter(r => r.status === 'completed').length,
//                 results,
//             });
//         } catch (error) {
//             console.error('Monitor all pending payments error:', error);
//             res.status(500).json({ error: 'Failed to monitor pending payments' });
//         }
//     }

//     /**
//      * Check blockchain for payment confirmation
//      * This is a helper method that queries blockchain APIs
//      */
//     private static async checkBlockchainPayment(payment: MerchantPayment): Promise<{
//         confirmed: boolean;
//         transactionHash?: string;
//         confirmations?: number;
//         error?: string;
//     }> {
//         try {
//             switch (payment.chain) {
//                 case 'ethereum':
//                 case 'usdt-erc20':
//                     return await MerchantController.checkEthereumPayment(payment);
//                 case 'bitcoin':
//                     return await MerchantController.checkBitcoinPayment(payment);
//                 case 'solana':
//                     return await MerchantController.checkSolanaPayment(payment);
//                 case 'starknet':
//                     return await MerchantController.checkStarknetPayment(payment);
//                 default:
//                     return { confirmed: false, error: 'Unsupported chain' };
//             }
//         } catch (error) {
//             console.error('Blockchain check error:', error);
//             return {
//                 confirmed: false,
//                 error: error instanceof Error ? error.message : 'Unknown error',
//             };
//         }
//     }

//     /**
//      * Check Ethereum/ERC20 payment
//      */
//     private static async checkEthereumPayment(payment: MerchantPayment): Promise<{
//         confirmed: boolean;
//         transactionHash?: string;
//         confirmations?: number;
//     }> {
//         try {
//             const apiKey = BLOCKCHAIN_APIS.ethereum.apiKey;
//             const address = payment.address;

//             // Query Etherscan API for transactions
//             const response = await axios.get(BLOCKCHAIN_APIS.ethereum.apiUrl, {
//                 params: {
//                     module: 'account',
//                     action: 'txlist',
//                     address: address,
//                     startblock: 0,
//                     endblock: 99999999,
//                     sort: 'desc',
//                     apikey: apiKey,
//                 },
//                 timeout: 10000,
//             });

//             if (response.data.status === '1' && response.data.result.length > 0) {
//                 // Check for incoming transactions matching the amount
//                 const expectedAmount = (payment.amount * 1e18).toString(); // Convert to wei

//                 for (const tx of response.data.result) {
//                     if (
//                         tx.to.toLowerCase() === address.toLowerCase() &&
//                         tx.value === expectedAmount &&
//                         parseInt(tx.confirmations) >= 3
//                     ) {
//                         return {
//                             confirmed: true,
//                             transactionHash: tx.hash,
//                             confirmations: parseInt(tx.confirmations),
//                         };
//                     }
//                 }
//             }

//             return { confirmed: false };
//         } catch (error) {
//             console.error('Ethereum check error:', error);
//             return { confirmed: false };
//         }
//     }

//     /**
//      * Check Bitcoin payment
//      */
//     private static async checkBitcoinPayment(payment: MerchantPayment): Promise<{
//         confirmed: boolean;
//         transactionHash?: string;
//         confirmations?: number;
//     }> {
//         try {
//             const address = payment.address;
//             const response = await axios.get(`${BLOCKCHAIN_APIS.bitcoin.apiUrl}/${address}`, {
//                 timeout: 10000,
//             });

//             if (response.data && response.data.txs) {
//                 const expectedAmount = payment.amount * 1e8; // Convert to satoshis

//                 for (const tx of response.data.txs) {
//                     for (const output of tx.out) {
//                         if (
//                             output.addr === address &&
//                             output.value >= expectedAmount &&
//                             (tx.block_height ? response.data.n_tx - tx.block_height >= 3 : false)
//                         ) {
//                             return {
//                                 confirmed: true,
//                                 transactionHash: tx.hash,
//                                 confirmations: response.data.n_tx - tx.block_height,
//                             };
//                         }
//                     }
//                 }
//             }

//             return { confirmed: false };
//         } catch (error) {
//             console.error('Bitcoin check error:', error);
//             return { confirmed: false };
//         }
//     }

//     /**
//      * Check Solana payment
//      */
//     private static async checkSolanaPayment(payment: MerchantPayment): Promise<{
//         confirmed: boolean;
//         transactionHash?: string;
//         confirmations?: number;
//     }> {
//         try {
//             const address = payment.address;

//             // Query Solana RPC
//             const response = await axios.post(
//                 BLOCKCHAIN_APIS.solana.apiUrl,
//                 {
//                     jsonrpc: '2.0',
//                     id: 1,
//                     method: 'getSignaturesForAddress',
//                     params: [address, { limit: 10 }],
//                 },
//                 { timeout: 10000 }
//             );

//             if (response.data.result && response.data.result.length > 0) {
//                 // Check each transaction
//                 for (const sig of response.data.result) {
//                     const txResponse = await axios.post(
//                         BLOCKCHAIN_APIS.solana.apiUrl,
//                         {
//                             jsonrpc: '2.0',
//                             id: 1,
//                             method: 'getTransaction',
//                             params: [sig.signature, { encoding: 'json' }],
//                         },
//                         { timeout: 10000 }
//                     );

//                     if (
//                         txResponse.data.result &&
//                         txResponse.data.result.meta.postBalances[0] >=
//                             payment.amount * 1e9 // Convert to lamports
//                     ) {
//                         return {
//                             confirmed: true,
//                             transactionHash: sig.signature,
//                             confirmations: sig.confirmationStatus === 'finalized' ? 32 : 0,
//                         };
//                     }
//                 }
//             }

//             return { confirmed: false };
//         } catch (error) {
//             console.error('Solana check error:', error);
//             return { confirmed: false };
//         }
//     }

//     /**
//      * Check Starknet payment
//      */
//     private static async checkStarknetPayment(payment: MerchantPayment): Promise<{
//         confirmed: boolean;
//         transactionHash?: string;
//         confirmations?: number;
//     }> {
//         try {
//             // Starknet RPC calls would go here
//             // This is a placeholder implementation
//             console.log('Starknet payment checking not fully implemented');
//             return { confirmed: false };
//         } catch (error) {
//             console.error('Starknet check error:', error);
//             return { confirmed: false };
//         }
//     }

//     /**
//      * Get payment statistics for the merchant
//      */
//     static async getPaymentStats(req: AuthRequest, res: Response) {
//         try {
//             const userId = req.user!.id;
//             const paymentRepo = AppDataSource.getRepository(MerchantPayment);

//             const [
//                 totalPayments,
//                 pendingPayments,
//                 completedPayments,
//                 cancelledPayments,
//             ] = await Promise.all([
//                 paymentRepo.count({ where: { userId } }),
//                 paymentRepo.count({
//                     where: { userId, status: MerchantPaymentStatus.PENDING },
//                 }),
//                 paymentRepo.count({
//                     where: { userId, status: MerchantPaymentStatus.COMPLETED },
//                 }),
//                 paymentRepo.count({
//                     where: { userId, status: MerchantPaymentStatus.CANCELLED },
//                 }),
//             ]);

//             // Calculate total amount by status
//             const payments = await paymentRepo.find({ where: { userId } });
//             const totalAmount = payments
//                 .filter(p => p.status === MerchantPaymentStatus.COMPLETED)
//                 .reduce((sum, p) => sum + p.amount, 0);

//             res.json({
//                 stats: {
//                     total: totalPayments,
//                     pending: pendingPayments,
//                     completed: completedPayments,
//                     cancelled: cancelledPayments,
//                     totalAmount,
//                 },
//             });
//         } catch (error) {
//             console.error('Get payment stats error:', error);
//             res.status(500).json({ error: 'Failed to fetch payment statistics' });
//         }
//     }
// }