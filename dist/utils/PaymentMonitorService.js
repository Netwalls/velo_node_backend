"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentMonitorService = void 0;
// services/PaymentMonitorService.ts
const database_1 = require("../config/database");
const MerchantPayment_1 = require("../entities/MerchantPayment");
const Notification_1 = require("../entities/Notification");
const index_1 = require("../types/index");
const axios_1 = __importDefault(require("axios"));
class PaymentMonitorService {
    constructor() {
        this.monitoringIntervals = new Map();
        // Configuration for different blockchain APIs
        this.blockchainConfigs = {
            ethereum: {
                apiUrl: process.env.ETHERSCAN_API_URL || 'https://api.etherscan.io/api',
                apiKey: process.env.ETHERSCAN_API_KEY,
            },
            bitcoin: {
                apiUrl: process.env.BLOCKCYPHER_API_URL || 'https://api.blockcypher.com/v1/btc/main',
            },
            solana: {
                apiUrl: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
            },
            starknet: {
                apiUrl: process.env.STARKNET_API_URL || 'https://alpha-mainnet.starknet.io',
            },
        };
    }
    /**
     * Start monitoring a payment
     */
    async startMonitoring(paymentId) {
        const paymentRepo = database_1.AppDataSource.getRepository(MerchantPayment_1.MerchantPayment);
        const payment = await paymentRepo.findOne({ where: { id: paymentId } });
        if (!payment) {
            throw new Error('Payment not found');
        }
        if (payment.status !== MerchantPayment_1.MerchantPaymentStatus.PENDING) {
            return; // Already completed or failed
        }
        // Check every 30 seconds
        const interval = setInterval(async () => {
            await this.checkPaymentStatus(paymentId);
        }, 30000);
        this.monitoringIntervals.set(paymentId, interval);
        // Also check immediately
        await this.checkPaymentStatus(paymentId);
    }
    /**
     * Stop monitoring a payment
     */
    stopMonitoring(paymentId) {
        const interval = this.monitoringIntervals.get(paymentId);
        if (interval) {
            clearInterval(interval);
            this.monitoringIntervals.delete(paymentId);
        }
    }
    /**
     * Check payment status on the blockchain
     */
    async checkPaymentStatus(paymentId) {
        const paymentRepo = database_1.AppDataSource.getRepository(MerchantPayment_1.MerchantPayment);
        const payment = await paymentRepo.findOne({ where: { id: paymentId } });
        if (!payment || payment.status !== MerchantPayment_1.MerchantPaymentStatus.PENDING) {
            this.stopMonitoring(paymentId);
            return;
        }
        try {
            let isConfirmed = false;
            let txHash = '';
            switch (payment.chain?.toLowerCase()) {
                case 'ethereum':
                    ({ isConfirmed, txHash } = await this.checkEthereumPayment(payment));
                    break;
                case 'bitcoin':
                    ({ isConfirmed, txHash } = await this.checkBitcoinPayment(payment));
                    break;
                case 'solana':
                    ({ isConfirmed, txHash } = await this.checkSolanaPayment(payment));
                    break;
                case 'starknet':
                    ({ isConfirmed, txHash } = await this.checkStarknetPayment(payment));
                    break;
                default:
                    console.warn(`Unsupported chain: ${payment.chain}`);
                    return;
            }
            if (isConfirmed) {
                await this.markPaymentComplete(payment, txHash);
            }
        }
        catch (error) {
            console.error(`Error checking payment ${paymentId}:`, error);
        }
    }
    /**
     * Check Ethereum payment using Etherscan API
     */
    async checkEthereumPayment(payment) {
        const config = this.blockchainConfigs.ethereum;
        const address = payment.ethAddress || payment.usdtErc20Address;
        if (!address) {
            return { isConfirmed: false, txHash: '' };
        }
        try {
            // Get normal transactions
            const response = await axios_1.default.get(config.apiUrl, {
                params: {
                    module: 'account',
                    action: 'txlist',
                    address: address,
                    startblock: 0,
                    endblock: 99999999,
                    sort: 'desc',
                    apikey: config.apiKey,
                },
            });
            const data = response.data;
            if (data.status === '1' && data.result.length > 0) {
                const recentTxs = data.result;
                for (const tx of recentTxs) {
                    const txValue = parseFloat(tx.value) / 1e18; // Convert from Wei to ETH
                    const expectedAmount = parseFloat(payment.amount.toString());
                    // Check if transaction matches our payment criteria
                    if (tx.to.toLowerCase() === address.toLowerCase() &&
                        Math.abs(txValue - expectedAmount) < 0.0001 && // Allow small tolerance
                        tx.isError === '0' &&
                        parseInt(tx.confirmations) >= 3 // Wait for 3 confirmations
                    ) {
                        return { isConfirmed: true, txHash: tx.hash };
                    }
                }
            }
            // Check ERC20 token transfers for USDT
            if (payment.usdtErc20Address) {
                const tokenResponse = await axios_1.default.get(config.apiUrl, {
                    params: {
                        module: 'account',
                        action: 'tokentx',
                        address: address,
                        startblock: 0,
                        endblock: 99999999,
                        sort: 'desc',
                        apikey: config.apiKey,
                    },
                });
                const tokenData = tokenResponse.data;
                if (tokenData.status === '1' && tokenData.result.length > 0) {
                    const recentTokenTxs = tokenData.result;
                    for (const tx of recentTokenTxs) {
                        const txValue = parseFloat(tx.value) / Math.pow(10, parseInt(tx.tokenDecimal));
                        const expectedAmount = parseFloat(payment.amount.toString());
                        if (tx.to.toLowerCase() === address.toLowerCase() &&
                            Math.abs(txValue - expectedAmount) < 0.01 &&
                            parseInt(tx.confirmations) >= 3) {
                            return { isConfirmed: true, txHash: tx.hash };
                        }
                    }
                }
            }
        }
        catch (error) {
            console.error('Ethereum payment check error:', error);
        }
        return { isConfirmed: false, txHash: '' };
    }
    /**
     * Check Bitcoin payment using BlockCypher API
     */
    async checkBitcoinPayment(payment) {
        const config = this.blockchainConfigs.bitcoin;
        const address = payment.btcAddress;
        if (!address) {
            return { isConfirmed: false, txHash: '' };
        }
        try {
            const response = await axios_1.default.get(`${config.apiUrl}/addrs/${address}/full`);
            const data = response.data;
            if (data.txs && data.txs.length > 0) {
                const expectedAmount = parseFloat(payment.amount.toString()) * 1e8; // Convert BTC to satoshis
                for (const tx of data.txs) {
                    // Check outputs for payment to our address
                    for (const output of tx.outputs) {
                        if (output.addresses &&
                            output.addresses.includes(address) &&
                            Math.abs(output.value - expectedAmount) < 10000 && // Tolerance of 0.0001 BTC
                            tx.confirmations >= 1) {
                            return { isConfirmed: true, txHash: tx.hash };
                        }
                    }
                }
            }
        }
        catch (error) {
            console.error('Bitcoin payment check error:', error);
        }
        return { isConfirmed: false, txHash: '' };
    }
    /**
     * Check Solana payment using Solana RPC
     */
    async checkSolanaPayment(payment) {
        const config = this.blockchainConfigs.solana;
        const address = payment.solAddress;
        if (!address) {
            return { isConfirmed: false, txHash: '' };
        }
        try {
            const response = await axios_1.default.post(config.apiUrl, {
                jsonrpc: '2.0',
                id: 1,
                method: 'getSignaturesForAddress',
                params: [address, { limit: 10 }],
            });
            const solanaData = response.data;
            if (solanaData.result && solanaData.result.length > 0) {
                const expectedAmount = parseFloat(payment.amount.toString()) * 1e9; // Convert SOL to lamports
                for (const sig of (solanaData.result ?? [])) {
                    // Get transaction details
                    const txResponse = await axios_1.default.post(config.apiUrl, {
                        jsonrpc: '2.0',
                        id: 1,
                        method: 'getTransaction',
                        params: [sig.signature, { encoding: 'json' }],
                    });
                    const tx = txResponse.data.result;
                    if (tx && tx.meta && !tx.meta.err) {
                        // Check post balances for payment amount
                        const postBalance = tx.meta.postBalances[0];
                        const preBalance = tx.meta.preBalances[0];
                        const diff = postBalance - preBalance;
                        if (Math.abs(diff - expectedAmount) < 1000000) { // Tolerance
                            return { isConfirmed: true, txHash: sig.signature };
                        }
                    }
                }
            }
        }
        catch (error) {
            console.error('Solana payment check error:', error);
        }
        return { isConfirmed: false, txHash: '' };
    }
    /**
     * Check Starknet payment
     */
    async checkStarknetPayment(payment) {
        // Implement Starknet-specific logic
        // This is a placeholder - you'll need to use Starknet SDK or API
        return { isConfirmed: false, txHash: '' };
    }
    /**
     * Mark payment as complete
     */
    async markPaymentComplete(payment, txHash) {
        const paymentRepo = database_1.AppDataSource.getRepository(MerchantPayment_1.MerchantPayment);
        payment.status = MerchantPayment_1.MerchantPaymentStatus.COMPLETED;
        payment.txHash = txHash;
        payment.completedAt = new Date();
        await paymentRepo.save(payment);
        // Create notification
        await database_1.AppDataSource.getRepository(Notification_1.Notification).save({
            userId: payment.userId,
            type: index_1.NotificationType.QR_PAYMENT_COMPLETED,
            title: 'Payment Received',
            message: `Payment of ${payment.amount} ${payment.chain?.toUpperCase()} has been confirmed`,
            details: {
                amount: payment.amount,
                chain: payment.chain,
                txHash: txHash,
                paymentId: payment.id,
            },
            isRead: false,
            createdAt: new Date(),
        });
        // Stop monitoring this payment
        this.stopMonitoring(payment.id);
        console.log(`Payment ${payment.id} marked as complete. TxHash: ${txHash}`);
    }
    /**
     * Monitor all pending payments (call this on app startup)
     */
    async monitorAllPendingPayments() {
        const paymentRepo = database_1.AppDataSource.getRepository(MerchantPayment_1.MerchantPayment);
        const pendingPayments = await paymentRepo.find({
            where: { status: MerchantPayment_1.MerchantPaymentStatus.PENDING },
        });
        console.log(`Starting monitoring for ${pendingPayments.length} pending payments`);
        for (const payment of pendingPayments) {
            await this.startMonitoring(payment.id);
        }
    }
    /**
     * Cleanup - stop all monitoring
     */
    cleanup() {
        for (const [paymentId] of this.monitoringIntervals) {
            this.stopMonitoring(paymentId);
        }
    }
}
exports.PaymentMonitorService = PaymentMonitorService;
//# sourceMappingURL=PaymentMonitorService.js.map