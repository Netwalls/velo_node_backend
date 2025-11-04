import { ConversionService } from './conversionService';
import { AppDataSource } from '../config/database_migration';
import { User } from '../entities/User';
import { MerchantPayment } from '../entities/MerchantPayment';
import { MerchantPaymentStatus } from '../entities/MerchantPayment';
import axios from 'axios';
import { RpcProvider, uint256 } from 'starknet';
import { UserAddress } from '../entities/UserAddress';
import { Transaction } from '../entities/Transaction';
import { ChainType } from '../types';

const STELLAR_HORIZON_MAIN = 'https://horizon.stellar.org';
const STELLAR_HORIZON_TEST = 'https://horizon-testnet.stellar.org';


/**
 * PaymentMonitoringService handles automatic detection of incoming payments
 * and triggers USDT conversions. In production, this would integrate with
 * blockchain monitoring services or payment providers.
 */
export class PaymentMonitoringService {
    private static isRunning = false;
    private static monitoringInterval: NodeJS.Timeout | null = null;

    /**
     * Start monitoring for incoming payments
     */
    static start(): void {
        if (this.isRunning) {
            console.log('Payment monitoring is already running');
            return;
        }

        this.isRunning = true;
        console.log('Starting payment monitoring service...');

        // In production, this would be replaced with webhook endpoints
        // from blockchain monitoring services like Moralis, Alchemy, etc.
        this.monitoringInterval = setInterval(async () => {
            await this.checkForIncomingPayments();
        }, 30000); // Check every 30 seconds

        console.log('Payment monitoring service started');
    }

    /**
     * Stop monitoring for incoming payments
     */
    static stop(): void {
        if (!this.isRunning) {
            console.log('Payment monitoring is not running');
            return;
        }

        this.isRunning = false;
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }

        console.log('Payment monitoring service stopped');
    }

    /**
     * Check for incoming payments across all supported blockchains
     * In production, this would be replaced with real blockchain monitoring
     */
    private static async checkForIncomingPayments(): Promise<void> {
        try {
            console.log('Checking for incoming payments...');

            const merchantPaymentRepo =
                AppDataSource.getRepository(MerchantPayment);
            const pendingPayments = await merchantPaymentRepo.find({
                where: { status: MerchantPaymentStatus.PENDING },
            });

            for (const payment of pendingPayments) {
                if (!payment.chain || !payment.network || !payment.address)
                    continue;

                const detected = await checkBlockchainForDeposit(
                    payment.chain,
                    payment.network,
                    payment.address,
                    Number(payment.amount)
                );

                if (
                    detected &&
                    detected.txHash &&
                    detected.confirmations >= 1
                ) {
                    payment.status = MerchantPaymentStatus.COMPLETED;
                    payment.txHash = detected.txHash;
                    payment.completedAt = new Date();
                    await merchantPaymentRepo.save(payment);
                    console.log(
                        `Merchant payment ${payment.id} marked as completed.`
                    );
                }
            }

            // Additionally scan for general incoming deposits (non-QR) for supported chains
            try {
                await this.scanAllAddressesForDeposits();
            } catch (scanErr) {
                console.error('Address scan for deposits failed:', scanErr);
            }
        } catch (error) {
            console.error('Error checking for incoming payments:', error);
        }
    }

    /**
     * Scan all user Stellar addresses for recent incoming payments and process any new ones.
     * This is a lightweight scan (limit recent 20 payments per address) and dedupes by txHash.
     */
    private static async scanStellarAddressesForDeposits(): Promise<void> {
        try {
            const addrRepo = AppDataSource.getRepository(UserAddress);
            const txRepo = AppDataSource.getRepository(Transaction);

            // Fetch all stellar addresses
            const stellarAddresses = await addrRepo.find({ where: { chain: ChainType.STELLAR } });
            for (const addr of stellarAddresses) {
                try {
                    const horizon = (addr.network || 'mainnet').toLowerCase() === 'testnet'
                        ? STELLAR_HORIZON_TEST
                        : STELLAR_HORIZON_MAIN;

                    const url = `${horizon}/accounts/${encodeURIComponent(addr.address)}/payments`;
                    const resp = await require('axios').get(url, { params: { limit: 20, order: 'desc' }, timeout: 10000 });
                    const dataAny: any = resp.data || {};
                    const records: any[] = Array.isArray(dataAny.records)
                        ? dataAny.records
                        : Array.isArray(dataAny._embedded?.records)
                        ? dataAny._embedded.records
                        : [];

                    for (const r of records) {
                        try {
                            const txHash = r.transaction_hash || r.hash || r.transaction_hash;
                            if (!txHash) continue;

                            // Only process incoming to this address
                            const to = r.to;
                            if (!to || to !== addr.address) continue;

                            // Skip if we've already recorded this txHash
                            const existing = await txRepo.findOne({ where: { txHash } });
                            if (existing) continue;

                            const amount = Number(r.amount || 0);
                            if (!amount || amount <= 0) continue;

                            // Build IncomingPayment object and process it
                            const incoming: IncomingPayment = {
                                txHash,
                                fromAddress: r.from || '',
                                toAddress: addr.address,
                                amount,
                                currency: 'xlm',
                                confirmations: 1,
                                timestamp: new Date(r.created_at || Date.now()),
                                network: addr.network || 'mainnet',
                            };

                            // Process the incoming payment (this will create conversion and a receive Transaction)
                            await this.processIncomingPayment(incoming);
                        } catch (recErr) {
                            console.debug('Error processing stellar payment record:', recErr);
                            continue;
                        }
                    }
                } catch (err: any) {
                    // Log and continue with other addresses
                    console.debug(`Stellar scan failed for ${addr.address}:`, err && err.message ? err.message : String(err));
                }
            }
        } catch (error) {
            console.error('scanStellarAddressesForDeposits error:', error);
            throw error;
        }
    }

    /**
     * Generic scanner for all user addresses across chains.
     * Calls checkBlockchainForDeposit with amount=0 to detect any incoming transactions
     * and processes them (with deduplication by txHash).
     */
    private static async scanAllAddressesForDeposits(): Promise<void> {
        try {
            const addrRepo = AppDataSource.getRepository(UserAddress);
            const txRepo = AppDataSource.getRepository(Transaction);

            // Fetch all addresses (limit to active chains)
            const allAddresses = await addrRepo.find();
            for (const a of allAddresses) {
                try {
                    const chain = a.chain as string;
                    const network = a.network || 'mainnet';

                    // Call with amount = 0 to detect any incoming tx (function returns first matching tx)
                    const detected = await checkBlockchainForDeposit(chain, network, a.address, 0);
                    if (!detected || !detected.txHash) continue;

                    // Skip if already recorded
                    const already = await txRepo.findOne({ where: { txHash: detected.txHash } });
                    if (already) continue;

                    // Build incoming payment object and process
                    const incoming: IncomingPayment = {
                        txHash: detected.txHash,
                        fromAddress: '',
                        toAddress: a.address,
                        amount: detected.amount ? Number(detected.amount) : 0,
                        currency: chain,
                        confirmations: detected.confirmations || 1,
                        timestamp: new Date(),
                        network: network,
                    };

                    await this.processIncomingPayment(incoming);
                } catch (addrErr) {
                    const _e: any = addrErr;
                    console.debug('Address scan error for', a.address, _e && _e.message ? _e.message : String(_e));
                }
            }
        } catch (error) {
            console.error('scanAllAddressesForDeposits error:', error);
            throw error;
        }
    }

    /**
     * Process a detected incoming payment
     */
    static async processIncomingPayment(
        payment: IncomingPayment
    ): Promise<void> {
        try {
            console.log(`Processing incoming payment:`, payment);

            // Verify the payment is valid and confirmed
            if (!(await this.validatePayment(payment))) {
                console.log(
                    `Payment validation failed for transaction ${payment.txHash}`
                );
                return;
            }

            // Find the user by wallet address
            const user = await this.findUserByAddress(payment.toAddress);
            if (!user) {
                console.log(`No user found for address ${payment.toAddress}`);
                return;
            }

            // Process automatic conversion to USDT
            const conversion =
                await ConversionService.processAutomaticConversion(
                    user.id!,
                    payment.currency,
                    payment.amount,
                    payment.fromAddress,
                    payment.txHash
                );

            console.log(`Automatic conversion initiated:`, {
                conversionId: conversion.id,
                user: user.email,
                amount: payment.amount,
                currency: payment.currency,
            });

            // Record a receive transaction so admin stats and user history include the incoming payment
            try {
                const txRepo = AppDataSource.getRepository(Transaction);
                await txRepo.save({
                    userId: user.id!,
                    type: 'receive',
                    amount: payment.amount,
                    chain: (payment.currency || '').toString().toLowerCase(),
                    network: payment.network || undefined,
                    toAddress: payment.toAddress,
                    fromAddress: payment.fromAddress || '',
                    txHash: payment.txHash || '',
                    status: 'confirmed',
                    createdAt: new Date(),
                });
            } catch (txErr) {
                console.error('Failed to record receive transaction:', txErr);
            }
        } catch (error) {
            console.error('Error processing incoming payment:', error);
        }
    }

    /**
     * Validate that a payment is legitimate and confirmed
     */
    private static async validatePayment(
        payment: IncomingPayment
    ): Promise<boolean> {
        try {
            // In production, implement proper validation:
            // 1. Verify transaction exists on blockchain
            // 2. Check minimum confirmations
            // 3. Verify amount and addresses
            // 4. Check for double-spending
            // 5. Validate transaction status

            // For now, basic validation
            return (
                payment.amount > 0 &&
                !!payment.currency &&
                !!payment.txHash &&
                !!payment.fromAddress &&
                !!payment.toAddress &&
                payment.confirmations >=
                    this.getMinConfirmations(payment.currency)
            );
        } catch (error) {
            console.error('Payment validation error:', error);
            return false;
        }
    }

    /**
     * Find user by their wallet address
     */
    private static async findUserByAddress(
        address: string
    ): Promise<User | null> {
        try {
            const userRepository = AppDataSource.getRepository(User);
            return await userRepository
                .createQueryBuilder('user')
                .leftJoinAndSelect('user.addresses', 'address')
                .where('address.address = :address', { address })
                .getOne();
        } catch (error) {
            console.error('Error finding user by address:', error);
            return null;
        }
    }

    /**
     * Get minimum confirmations required for each currency
     */
    private static getMinConfirmations(currency: string): number {
        const minConfirmations: Record<string, number> = {
            BTC: 3,
            ETH: 12,
            USDT: 12,
            USDC: 12,
            SOL: 32,
            STRK: 1,
        };

        return minConfirmations[currency.toUpperCase()] || 6;
    }

    /**
     * Get current monitoring status
     */
    static getStatus(): MonitoringStatus {
        return {
            isRunning: this.isRunning,
            startTime: this.isRunning ? new Date() : null,
            supportedCurrencies: ['BTC', 'ETH', 'USDT', 'USDC', 'SOL', 'STRK'],
            checkInterval: 30000,
        };
    }

    /**
     * Manual payment detection (for testing/simulation)
     */
    static async simulatePaymentDetection(
        payment: IncomingPayment
    ): Promise<void> {
        console.log('Simulating payment detection:', payment);
        await this.processIncomingPayment(payment);
    }
}

/**
 * Interface for incoming payment data
 */
export interface IncomingPayment {
    txHash: string;
    fromAddress: string;
    toAddress: string;
    amount: number;
    currency: string;
    confirmations: number;
    blockHeight?: number;
    timestamp: Date;
    network?: string;
}

/**
 * Interface for monitoring service status
 */
export interface MonitoringStatus {
    isRunning: boolean;
    startTime: Date | null;
    supportedCurrencies: string[];
    checkInterval: number;
}

// You need to implement checkBlockchainForDeposit for each chain/network.

/**
 * Checks the Ethereum blockchain for a deposit to the given address.
 * Returns { txHash, confirmations } if found, or null if not found.
 * Only ETH mainnet/testnet is implemented here for demo.
 */
async function checkBlockchainForDeposit(
    chain: string,
    network: string,
    address: string,
    amount: number
): Promise<{ txHash: string; confirmations: number; amount?: number } | null> {
    // ETHEREUM (ETH)
    if (chain.toLowerCase() === 'ethereum' || chain.toLowerCase() === 'eth') {
        const apiKey = process.env.ETHERSCAN_API_KEY;
        if (!apiKey) {
            console.error('ETHERSCAN_API_KEY not set');
            return null;
        }
        const baseUrl =
            network === 'mainnet'
                ? 'https://api.etherscan.io'
                : 'https://api-sepolia.etherscan.io';
        try {
            const url = `${baseUrl}/api?module=account&action=txlist&address=${address}&sort=desc&apikey=${apiKey}`;
            const { data } = await axios.get(url);
            const ethData = data as { status: string; result: any[] };
            if (ethData.status !== '1' || !Array.isArray(ethData.result))
                return null;
            const requiredWei = BigInt(Math.floor(Number(amount) * 1e18));
            for (const tx of ethData.result) {
                if (
                    tx.to &&
                    tx.to.toLowerCase() === address.toLowerCase() &&
                    BigInt(tx.value) >= requiredWei
                ) {
                    const valueNum = Number(tx.value) / 1e18;
                    return {
                        txHash: tx.hash,
                        confirmations: Number(tx.confirmations),
                        amount: valueNum,
                    };
                }
            }
            return null;
        } catch (error) {
            console.error('Error checking Ethereum deposit:', error);
            return null;
        }
    }

    // BITCOIN (BTC)
    if (chain.toLowerCase() === 'bitcoin' || chain.toLowerCase() === 'btc') {
        const baseUrl =
            network === 'mainnet'
                ? 'https://blockstream.info/api'
                : 'https://blockstream.info/testnet/api';
        try {
            const url = `${baseUrl}/address/${address}/txs`;
            const { data } = await axios.get(url);
            const txs = data as any[];
            const requiredSats = Math.floor(amount * 1e8);
            for (const tx of txs) {
                for (const vout of tx.vout) {
                    if (
                        vout.scriptpubkey_address === address &&
                        Number(vout.value) >= requiredSats
                    ) {
                        return {
                            txHash: tx.txid,
                            confirmations: tx.status.confirmed ? 1 : 0,
                            amount: Number(vout.value) / 1e8,
                        };
                    }
                }
            }
            return null;
        } catch (error) {
            console.error('Error checking Bitcoin deposit:', error);
            return null;
        }
    }

    // SOLANA (SOL)
    if (chain.toLowerCase() === 'solana' || chain.toLowerCase() === 'sol') {
        const endpoint =
            network === 'mainnet'
                ? 'https://api.mainnet-beta.solana.com'
                : 'https://api.devnet.solana.com';
        try {
            const body = {
                jsonrpc: '2.0',
                id: 1,
                method: 'getSignaturesForAddress',
                params: [address, { limit: 10 }],
            };
            const { data } = await axios.post(endpoint, body);
            const solanaData = data as { result: any[] };
            if (!solanaData.result) return null;
            for (const sig of solanaData.result) {
                const txBody = {
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'getTransaction',
                    params: [sig.signature, { encoding: 'json' }],
                };
                const txData = await axios.post(endpoint, txBody);
                const txInfo = (txData.data as { result: any }).result;
                if (!txInfo) continue;
                // Find the index of your address in accountKeys
                const accountKeys =
                    txInfo.transaction?.message?.accountKeys || [];
                const idx = accountKeys.findIndex(
                    (k: any) =>
                        (typeof k === 'string' ? k : k.pubkey) === address
                );
                if (idx === -1) continue;
                // Compare balance difference for your address
                const preBalances = txInfo.meta?.preBalances;
                const postBalances = txInfo.meta?.postBalances;
                if (
                    preBalances &&
                    postBalances &&
                    typeof preBalances[idx] === 'number' &&
                    typeof postBalances[idx] === 'number'
                ) {
                    const diff = postBalances[idx] - preBalances[idx];
                    if (diff >= Math.floor(amount * 1e9)) {
                        return {
                            txHash: sig.signature,
                            confirmations:
                                sig.confirmationStatus === 'finalized' ? 1 : 0,
                            amount: diff / 1e9,
                        };
                    }
                }
            }
            return null;
        } catch (error) {
            console.error('Error checking Solana deposit:', error);
            return null;
        }
    }

//     // STARKNET (STRK)
//    if (chain.toLowerCase() === 'strk' || chain.toLowerCase() === 'starknet') {
//         try {
//             const alchemyKey = process.env.ALCHEMY_STARKNET_KEY;
//         if (!alchemyKey) {
//             console.error('ALCHEMY_STARKNET_KEY not set');
//             return null;
//         }
//             const nodeUrl =
//                 network === 'mainnet'
//                 ? `https://starknet-mainnet.g.alchemy.com/v2/${alchemyKey}`
//                 : `https://starknet-sepolia.g.alchemy.com/v2/${alchemyKey}`;

//             const provider = new RpcProvider({ nodeUrl });
//             const paddedAddress = padStarknetAddress(address);
//             const strkTokenAddress = '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d';

//             const result = await provider.callContract({
//                 contractAddress: strkTokenAddress,
//                 entrypoint: 'balanceOf',
//                 calldata: [paddedAddress]
//             });
//             // result is [low, high]
//             const balance = uint256.uint256ToBN({ low: result[0], high: result[1] });
//             const requiredWei = BigInt(Math.floor(Number(amount) * 1e18));
//             if (balance >= requiredWei) {
//                 return {
//                     txHash: '', // Not available from balance check
//                     confirmations: 1,
//                 };
//             }
//             return null;
//         } catch (error) {
//             console.error('Error checking Starknet deposit:', error);
//             return null;
//         }
//     }




    // USDT ERC20 (Ethereum)
    if (
        chain.toLowerCase() === 'usdterc20' ||
        (chain.toLowerCase() === 'usdt' &&
            network.toLowerCase().includes('erc20'))
    ) {
        const apiKey = process.env.ETHERSCAN_API_KEY;
        if (!apiKey) {
            console.error('ETHERSCAN_API_KEY not set');
            return null;
        }
        const baseUrl =
            network === 'mainnet'
                ? 'https://api.etherscan.io'
                : 'https://api-sepolia.etherscan.io';
        const usdtContract = '0xdAC17F958D2ee523a2206206994597C13D831ec7'; // Mainnet USDT contract
        try {
            const url = `${baseUrl}/api?module=account&action=tokentx&contractaddress=${usdtContract}&address=${address}&sort=desc&apikey=${apiKey}`;
            const { data } = await axios.get(url);
            const tokenTxData = data as { status: string; result: any[] };
            if (
                tokenTxData.status !== '1' ||
                !Array.isArray(tokenTxData.result)
            )
                return null;
            const requiredAmount = BigInt(Math.floor(amount * 1e6)); // USDT has 6 decimals
            for (const tx of tokenTxData.result) {
                if (
                    tx.to &&
                    tx.to.toLowerCase() === address.toLowerCase() &&
                    BigInt(tx.value) >= requiredAmount
                ) {
                    const val = Number(tx.value) / 1e6; // USDT 6 decimals
                    return {
                        txHash: tx.hash,
                        confirmations: Number(tx.confirmations),
                        amount: val,
                    };
                }
            }
            return null;
        } catch (error) {
            console.error('Error checking USDT ERC20 deposit:', error);
            return null;
        }
    }

    // USDT TRC20 (Tron)
    if (
        chain.toLowerCase() === 'usdttrc20' ||
        (chain.toLowerCase() === 'usdt' &&
            network.toLowerCase().includes('trc20'))
    ) {
        const usdtContract = 'TXLAQ63Xg1NAzckPwKHvzw7CSEmLMEqcdj'; // Mainnet USDT contract
        try {
            const url = `https://api.trongrid.io/v1/accounts/${address}/transactions/trc20?limit=20&contract_address=${usdtContract}`;
            const { data } = await axios.get(url);
            const trc20Data = data as { data: any[] };
            if (!trc20Data.data || !Array.isArray(trc20Data.data)) return null;
            const requiredAmount = BigInt(Math.floor(amount * 1e6)); // USDT has 6 decimals
            for (const tx of trc20Data.data) {
                if (
                    tx.to &&
                    tx.to.toLowerCase() === address.toLowerCase() &&
                    BigInt(tx.value) >= requiredAmount
                ) {
                    const val = Number(tx.value) / 1e6;
                    return {
                        txHash: tx.transaction_id,
                        confirmations: tx.confirmations || 1,
                        amount: val,
                    };
                }
            }
            return null;
        } catch (error) {
            console.error('Error checking USDT TRC20 deposit:', error);
            return null;
        }
    }

    // If chain/network not supported
    return null;
}

// Utility to pad Starknet address to 64 hex digits after 0x
function padStarknetAddress(address: string): string {
    if (!address.startsWith('0x')) return address;
    const hex = address.slice(2).padStart(64, '0');
    return '0x' + hex;
}
