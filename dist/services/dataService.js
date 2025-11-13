"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.dataService = exports.DataService = void 0;
const database_1 = require("../config/database");
const DataPurchase_1 = require("../entities/DataPurchase");
const nellobytesService_1 = __importStar(require("./nellobytesService"));
const validators_1 = require("./blockchain/validators");
const exchangeRateService_1 = require("./exchangeRateService");
class DataService {
    constructor() {
        // Security constants
        this.MIN_DATA_AMOUNT = 50;
        this.MAX_DATA_AMOUNT = 200000;
        this.AMOUNT_TOLERANCE_PERCENT = 1.0; // 1% tolerance
        this.PURCHASE_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes
        // Data plans cache
        this.dataPlansCache = {};
        this.plansCacheTimestamp = 0;
        this.CACHE_DURATION_MS = 6 * 60 * 60 * 1000; // 6 hours
        this.dataPurchaseRepo = null;
    }
    getRepository() {
        if (!this.dataPurchaseRepo) {
            this.dataPurchaseRepo = database_1.AppDataSource.getRepository(DataPurchase_1.DataPurchase);
        }
        return this.dataPurchaseRepo;
    }
    /**
     * Fetch and cache data plans from Nellobytes API
     */
    async refreshDataPlans() {
        const now = Date.now();
        // Check if cache is still valid
        if (this.plansCacheTimestamp && (now - this.plansCacheTimestamp) < this.CACHE_DURATION_MS) {
            console.log('📋 Using cached data plans');
            return;
        }
        try {
            console.log('📋 Fetching fresh data plans from Nellobytes API...');
            // Fetch all plans
            const allPlans = await nellobytesService_1.default.fetchDataPlans();
            // Group plans by network
            this.dataPlansCache = {
                [DataPurchase_1.MobileNetwork.MTN]: allPlans.filter(p => p.plan_network === '01'),
                [DataPurchase_1.MobileNetwork.GLO]: allPlans.filter(p => p.plan_network === '02'),
                [DataPurchase_1.MobileNetwork.ETISALAT]: allPlans.filter(p => p.plan_network === '03'),
                [DataPurchase_1.MobileNetwork.AIRTEL]: allPlans.filter(p => p.plan_network === '04'),
            };
            this.plansCacheTimestamp = now;
            console.log('✅ Data plans cached successfully:', {
                mtn: this.dataPlansCache[DataPurchase_1.MobileNetwork.MTN]?.length || 0,
                glo: this.dataPlansCache[DataPurchase_1.MobileNetwork.GLO]?.length || 0,
                '9mobile': this.dataPlansCache[DataPurchase_1.MobileNetwork.ETISALAT]?.length || 0,
                airtel: this.dataPlansCache[DataPurchase_1.MobileNetwork.AIRTEL]?.length || 0,
            });
        }
        catch (error) {
            console.error('❌ Failed to fetch data plans:', error.message);
            // If cache is empty, throw error. Otherwise, use stale cache
            if (Object.keys(this.dataPlansCache).length === 0) {
                throw new Error('Failed to load data plans. Please try again later.');
            }
            console.warn('⚠️ Using stale cache due to API error');
        }
    }
    /**
     * SECURE: Process data purchase with comprehensive validation
     */
    async processDataPurchase(userId, purchaseData) {
        console.log(`📄 Processing data purchase for user ${userId}:`, purchaseData);
        let dataPurchase = null;
        try {
            // 1. Refresh data plans cache if needed
            await this.refreshDataPlans();
            // 2. Get and validate the selected data plan
            const plan = await this.getDataPlanById(purchaseData.mobileNetwork, purchaseData.dataplanId);
            if (!plan) {
                throw new Error(`Invalid data plan selected: ${purchaseData.dataplanId}`);
            }
            console.log(`📱 Selected plan: ${plan.plan_name} - ${plan.plan_amount}`);
            // 3. Parse the plan amount from Nellobytes
            const planAmount = (0, nellobytesService_1.parsePriceString)(plan.plan_amount);
            console.log(`💰 Plan price: ₦${planAmount}`);
            // 4. Validate that user's amount matches plan amount
            if (Math.abs(purchaseData.amount - planAmount) > 0.01) {
                throw new Error(`Amount mismatch: Expected ₦${planAmount} for selected plan, but received ₦${purchaseData.amount}`);
            }
            // 5. Comprehensive input validation
            this.validatePurchaseData(purchaseData, planAmount);
            // 6. Check transaction hash uniqueness
            await this.checkTransactionHashUniqueness(purchaseData.transactionHash);
            // 7. Convert fiat amount to crypto amount (using user's amount)
            const expectedCryptoAmount = await this.convertFiatToCrypto(purchaseData.amount, purchaseData.chain);
            // 8. Get the company's wallet address
            const receivingWallet = this.getBlockchainWallet(purchaseData.chain);
            console.log(`💰 Expected: ${expectedCryptoAmount} ${purchaseData.chain} to ${receivingWallet}`);
            // 9. Create pending purchase record
            dataPurchase = new DataPurchase_1.DataPurchase();
            dataPurchase.user_id = userId;
            dataPurchase.network = purchaseData.mobileNetwork;
            dataPurchase.blockchain = purchaseData.chain;
            dataPurchase.crypto_amount = expectedCryptoAmount;
            dataPurchase.crypto_currency = purchaseData.chain.toUpperCase();
            dataPurchase.fiat_amount = purchaseData.amount;
            dataPurchase.phone_number = purchaseData.phoneNumber;
            dataPurchase.transaction_hash = purchaseData.transactionHash;
            dataPurchase.status = DataPurchase_1.DataPurchaseStatus.PROCESSING;
            dataPurchase.plan_name = plan.plan_name;
            dataPurchase.dataplan_id = plan.dataplan_id;
            await this.getRepository().save(dataPurchase);
            // 10. Validate the blockchain transaction with amount tolerance
            console.log(`🔍 Validating ${purchaseData.chain} transaction: ${purchaseData.transactionHash}`);
            const isValid = await this.validateBlockchainTransaction(purchaseData.chain, purchaseData.transactionHash, expectedCryptoAmount, receivingWallet);
            if (!isValid) {
                await this.markPurchaseFailed(dataPurchase, "Transaction validation failed");
                throw new Error("Transaction validation failed. Please check the transaction details.");
            }
            console.log(`✅ Transaction validated! Proceeding to data delivery...`);
            // 11. Process data with Nellobytesystems (NO AMOUNT, just dataplan_id)
            const providerResult = await this.processDataWithNellobytes(dataPurchase);
            // 12. Mark as completed ONLY if provider succeeded
            dataPurchase.status = DataPurchase_1.DataPurchaseStatus.COMPLETED;
            dataPurchase.provider_reference = providerResult.orderid;
            dataPurchase.metadata = {
                providerResponse: providerResult,
                processedAt: new Date().toISOString(),
                planDetails: {
                    name: plan.plan_name,
                    amount: plan.plan_amount,
                    validity: plan.month_validate,
                },
                security: {
                    validatedAt: new Date().toISOString(),
                    amountTolerance: this.AMOUNT_TOLERANCE_PERCENT,
                },
            };
            await this.getRepository().save(dataPurchase);
            console.log(`🎉 Data delivered! ${plan.plan_name} to ${purchaseData.phoneNumber}`);
            return {
                success: true,
                message: `Data purchase successful! ${plan.plan_name} delivered to ${purchaseData.phoneNumber}`,
                data: {
                    purchaseId: dataPurchase.id,
                    planName: plan.plan_name,
                    planAmount: plan.plan_amount,
                    validity: plan.month_validate,
                    network: purchaseData.mobileNetwork,
                    phoneNumber: purchaseData.phoneNumber,
                    providerReference: providerResult.orderid,
                    cryptoAmount: expectedCryptoAmount,
                    cryptoCurrency: purchaseData.chain.toUpperCase(),
                    deliveredAt: new Date(),
                },
            };
        }
        catch (error) {
            console.error("❌ Data purchase failed:", error);
            // If we created a purchase record but failed later, update its status
            if (dataPurchase && dataPurchase.id) {
                await this.markPurchaseFailed(dataPurchase, error.message);
                // Initiate refund for blockchain-validated but provider-failed transactions
                if (dataPurchase.status === DataPurchase_1.DataPurchaseStatus.PROCESSING) {
                    await this.initiateRefund(dataPurchase, error.message);
                }
            }
            throw error;
        }
    }
    /**
     * Process data with Nellobytesystems with proper error handling
     * NOTE: We send dataplan_id, NOT amount
     */
    async processDataWithNellobytes(purchase) {
        try {
            console.log(`📞 Calling Nellobytes API for ${purchase.plan_name} to ${purchase.phone_number}`);
            const providerResult = await nellobytesService_1.default.purchaseDataBundle(purchase.network, purchase.dataplan_id, // Send dataplan_id, not amount
            purchase.phone_number, `VELO_DATA_${purchase.id}_${Date.now()}`);
            console.log(`📞 Nellobytes API response:`, providerResult);
            // ✅ CHECK FOR SUCCESS
            if ((0, nellobytesService_1.isSuccessfulResponse)(providerResult) || providerResult.status === 'ORDER_RECEIVED') {
                console.log(`✅ Nellobytes order successful: ${providerResult.orderid}`);
                return providerResult;
            }
            else {
                const errorMessage = this.mapNellobytesError(providerResult.statuscode, providerResult.status);
                console.error(`❌ Nellobytes API error: ${providerResult.statuscode} - ${providerResult.status}`);
                throw new Error(errorMessage);
            }
        }
        catch (error) {
            console.error(`❌ Nellobytes API call failed:`, error.message);
            if (error.message.includes('Nellobytes:')) {
                throw error;
            }
            throw new Error(`Nellobytes: ${error.message}`);
        }
    }
    /**
     * Map Nellobytes error codes to user-friendly messages
     */
    mapNellobytesError(statusCode, status) {
        const errorMap = {
            'INVALID_CREDENTIALS': 'Nellobytes: Invalid API credentials. Please contact support.',
            'MISSING_CREDENTIALS': 'Nellobytes: API credentials missing. Please contact support.',
            'INVALID_PRODUCT_CODE': 'Nellobytes: Invalid data plan selected.',
            'INVALID_DATAPLAN': 'Nellobytes: Invalid data plan selected.',
            'INVALID_RECIPIENT': 'Nellobytes: Invalid phone number format.',
            'SERVICE_TEMPORARILY_UNAVAIALBLE': 'Nellobytes: Service temporarily unavailable. Please try again later.',
            'INSUFFICIENT_APIBALANCE': 'Nellobytes: Insufficient provider balance. Please try again later.',
        };
        if (errorMap[status]) {
            return errorMap[status];
        }
        if (statusCode !== '100' && statusCode !== '200') {
            return `Nellobytes: Service error (Code: ${statusCode}) - ${status}`;
        }
        return `Nellobytes: ${status}`;
    }
    /**
     * Initiate refund when data delivery fails
     */
    async initiateRefund(purchase, reason) {
        try {
            console.log(`💸 Initiating refund for purchase ${purchase.id}: ${reason}`);
            purchase.metadata = {
                ...purchase.metadata,
                refund: {
                    initiated: true,
                    reason: reason,
                    initiatedAt: new Date().toISOString(),
                    amount: purchase.crypto_amount,
                    currency: purchase.crypto_currency,
                    status: 'pending'
                }
            };
            await this.getRepository().save(purchase);
            console.log(`✅ Refund initiated for ${purchase.crypto_amount} ${purchase.crypto_currency}`);
        }
        catch (error) {
            console.error('❌ Refund initiation failed:', error);
        }
    }
    /**
     * Get data plan by ID
     */
    async getDataPlanById(network, dataplanId) {
        await this.refreshDataPlans();
        const plans = this.dataPlansCache[network];
        if (!plans)
            return null;
        return plans.find(plan => plan.dataplan_id === dataplanId) || null;
    }
    /**
     * SECURITY: Comprehensive input validation
     */
    validatePurchaseData(purchaseData, planAmount) {
        const { type, amount, chain, phoneNumber, mobileNetwork, transactionHash } = purchaseData;
        // Type validation
        if (type !== "data") {
            throw new Error("Invalid purchase type");
        }
        // Amount validation
        if (typeof amount !== "number" || isNaN(amount)) {
            throw new Error("Amount must be a valid number");
        }
        if (amount < this.MIN_DATA_AMOUNT) {
            throw new Error(`Minimum data amount is ${this.MIN_DATA_AMOUNT} NGN`);
        }
        if (amount > this.MAX_DATA_AMOUNT) {
            throw new Error(`Maximum data amount is ${this.MAX_DATA_AMOUNT} NGN`);
        }
        // Phone number validation (Nigeria)
        const phoneRegex = /^234[7-9][0-9]{9}$/;
        if (!phoneRegex.test(phoneNumber)) {
            throw new Error("Invalid Nigerian phone number format. Use 234XXXXXXXXXX");
        }
        // Network validation
        if (!Object.values(DataPurchase_1.MobileNetwork).includes(mobileNetwork)) {
            throw new Error(`Invalid mobile network. Supported: ${Object.values(DataPurchase_1.MobileNetwork).join(", ")}`);
        }
        // Blockchain validation
        if (!Object.values(DataPurchase_1.Blockchain).includes(chain)) {
            throw new Error(`Unsupported blockchain. Supported: ${Object.values(DataPurchase_1.Blockchain).join(", ")}`);
        }
        // Transaction hash validation
        if (!transactionHash || typeof transactionHash !== "string") {
            throw new Error("Valid transaction hash is required");
        }
        if (transactionHash.length < 10) {
            throw new Error("Invalid transaction hash format");
        }
        console.log("✅ Input validation passed");
    }
    /**
     * SECURITY: Check transaction hash uniqueness
     */
    async checkTransactionHashUniqueness(transactionHash) {
        const existingPurchase = await this.getRepository().findOne({
            where: { transaction_hash: transactionHash },
        });
        if (existingPurchase) {
            this.logSecurityEvent("DUPLICATE_TRANSACTION_HASH", { transactionHash });
            throw new Error("This transaction has already been used for another purchase");
        }
        console.log("✅ Transaction hash is unique");
    }
    /**
     * SECURITY: Enhanced blockchain validation with amount tolerance
     */
    async validateBlockchainTransaction(blockchain, transactionHash, expectedAmount, expectedToAddress) {
        const tolerance = expectedAmount * (this.AMOUNT_TOLERANCE_PERCENT / 100);
        const minAllowedAmount = expectedAmount - tolerance;
        const maxAllowedAmount = expectedAmount + tolerance;
        console.log(`   Amount range: ${minAllowedAmount} - ${maxAllowedAmount} ${blockchain}`);
        try {
            switch (blockchain) {
                case DataPurchase_1.Blockchain.ETHEREUM:
                    return await validators_1.blockchainValidator.validateEthereumTransaction(transactionHash, expectedToAddress, minAllowedAmount, maxAllowedAmount);
                case DataPurchase_1.Blockchain.BITCOIN:
                    return await validators_1.blockchainValidator.validateBitcoinTransaction(transactionHash, expectedToAddress, minAllowedAmount, maxAllowedAmount);
                case DataPurchase_1.Blockchain.SOLANA:
                    return await validators_1.blockchainValidator.validateSolanaTransaction(transactionHash, expectedToAddress, minAllowedAmount, maxAllowedAmount);
                case DataPurchase_1.Blockchain.STELLAR:
                    return await validators_1.blockchainValidator.validateStellarTransaction(transactionHash, expectedToAddress, minAllowedAmount, maxAllowedAmount);
                case DataPurchase_1.Blockchain.POLKADOT:
                    return await validators_1.blockchainValidator.validatePolkadotTransaction(transactionHash, expectedToAddress, minAllowedAmount, maxAllowedAmount);
                case DataPurchase_1.Blockchain.STARKNET:
                    return await validators_1.blockchainValidator.validateStarknetTransaction(transactionHash, expectedToAddress, minAllowedAmount, maxAllowedAmount);
                case DataPurchase_1.Blockchain.USDT_ERC20:
                    return await validators_1.blockchainValidator.validateUsdtTransaction(transactionHash, expectedToAddress, minAllowedAmount, maxAllowedAmount);
                default:
                    return false;
            }
        }
        catch (error) {
            console.error(`Blockchain validation error:`, error);
            return false;
        }
    }
    /**
     * SECURITY: Mark purchase as failed
     */
    async markPurchaseFailed(purchase, reason) {
        purchase.status = DataPurchase_1.DataPurchaseStatus.FAILED;
        purchase.metadata = {
            ...purchase.metadata,
            error: reason,
            failedAt: new Date().toISOString(),
        };
        await this.getRepository().save(purchase);
        this.logSecurityEvent("PURCHASE_FAILED", {
            purchaseId: purchase.id,
            reason,
            userId: purchase.user_id,
        });
    }
    /**
     * SECURITY: Log security events
     */
    async logSecurityEvent(event, details) {
        console.warn(`🔒 SECURITY EVENT: ${event}`, {
            timestamp: new Date().toISOString(),
            event,
            details,
            service: "DataService",
        });
    }
    /**
     * Get company's wallet address
     */
    getBlockchainWallet(blockchain) {
        const walletMap = {
            [DataPurchase_1.Blockchain.ETHEREUM]: process.env.ETHEREUM_TESTNET_TREASURY,
            [DataPurchase_1.Blockchain.BITCOIN]: process.env.BITCOIN_TESTNET_TREASURY,
            [DataPurchase_1.Blockchain.SOLANA]: process.env.SOLANA_TESTNET_TREASURY,
            [DataPurchase_1.Blockchain.STELLAR]: process.env.STELLAR_TESTNET_TREASURY,
            [DataPurchase_1.Blockchain.POLKADOT]: process.env.POLKADOT_TESTNET_TREASURY,
            [DataPurchase_1.Blockchain.STARKNET]: process.env.STARKNET_TESTNET_TREASURY,
            [DataPurchase_1.Blockchain.USDT_ERC20]: process.env.USDT_TESTNET_TREASURY,
        };
        const walletAddress = walletMap[blockchain];
        if (!walletAddress) {
            throw new Error(`Wallet not configured for blockchain: ${blockchain}`);
        }
        return walletAddress;
    }
    /**
     * Convert fiat to crypto
     */
    async convertFiatToCrypto(fiatAmount, blockchain) {
        try {
            const cryptoMap = {
                [DataPurchase_1.Blockchain.ETHEREUM]: "eth",
                [DataPurchase_1.Blockchain.BITCOIN]: "btc",
                [DataPurchase_1.Blockchain.SOLANA]: "sol",
                [DataPurchase_1.Blockchain.STELLAR]: "xlm",
                [DataPurchase_1.Blockchain.POLKADOT]: "dot",
                [DataPurchase_1.Blockchain.STARKNET]: "strk",
                [DataPurchase_1.Blockchain.USDT_ERC20]: "usdt",
            };
            const cryptoId = cryptoMap[blockchain];
            const cryptoAmount = await exchangeRateService_1.exchangeRateService.convertFiatToCrypto(fiatAmount, cryptoId);
            console.log(`💰 Exchange rate: ${fiatAmount} NGN = ${cryptoAmount} ${cryptoId.toUpperCase()}`);
            return cryptoAmount;
        }
        catch (error) {
            console.error("❌ Exchange rate failed:", error.message);
            return this.getMockCryptoAmount(fiatAmount, blockchain);
        }
    }
    getMockCryptoAmount(fiatAmount, blockchain) {
        const mockRates = {
            [DataPurchase_1.Blockchain.ETHEREUM]: 2000000,
            [DataPurchase_1.Blockchain.BITCOIN]: 60000000,
            [DataPurchase_1.Blockchain.SOLANA]: 269800,
            [DataPurchase_1.Blockchain.STELLAR]: 500,
            [DataPurchase_1.Blockchain.POLKADOT]: 10000,
            [DataPurchase_1.Blockchain.STARKNET]: 2000,
            [DataPurchase_1.Blockchain.USDT_ERC20]: 1500,
        };
        const cryptoAmount = fiatAmount / mockRates[blockchain];
        return Math.round(cryptoAmount * 100000000) / 100000000;
    }
    /**
     * Get available data plans for a network (from cache or API)
     */
    async getDataPlans(network) {
        await this.refreshDataPlans();
        return this.dataPlansCache[network] || [];
    }
    /**
     * Force refresh data plans from API
     */
    async forceRefreshDataPlans() {
        this.plansCacheTimestamp = 0; // Invalidate cache
        await this.refreshDataPlans();
    }
    /**
     * Get user's data purchase history
     */
    async getUserDataHistory(userId, limit = 10) {
        return await this.getRepository().find({
            where: { user_id: userId },
            order: { created_at: "DESC" },
            take: limit,
        });
    }
    /**
     * Get expected crypto amount for a data plan
     */
    async getExpectedCryptoAmount(dataplanId, network, chain) {
        const plan = await this.getDataPlanById(network, dataplanId);
        if (!plan) {
            throw new Error('Invalid data plan selected');
        }
        const planAmount = (0, nellobytesService_1.parsePriceString)(plan.plan_amount);
        const cryptoAmount = await this.convertFiatToCrypto(planAmount, chain);
        return {
            cryptoAmount,
            cryptoCurrency: chain.toUpperCase(),
            fiatAmount: planAmount,
            chain,
            planDetails: {
                id: plan.dataplan_id,
                name: plan.plan_name,
                amount: plan.plan_amount,
                validity: plan.month_validate,
            },
            tolerancePercent: this.AMOUNT_TOLERANCE_PERCENT,
            instructions: `Send approximately ${cryptoAmount} ${chain.toUpperCase()} to complete the data purchase`,
        };
    }
    getSupportedBlockchains() {
        return Object.values(DataPurchase_1.Blockchain).map((chain) => ({
            chain: chain,
            symbol: chain.toUpperCase(),
            name: chain.charAt(0).toUpperCase() + chain.slice(1).replace("_", " "),
        }));
    }
    getSupportedNetworks() {
        return Object.values(DataPurchase_1.MobileNetwork).map((network) => ({
            value: network,
            label: network.toUpperCase(),
            name: network.charAt(0).toUpperCase() + network.slice(1),
        }));
    }
    getSecurityLimits() {
        return {
            minDataAmount: this.MIN_DATA_AMOUNT,
            maxDataAmount: this.MAX_DATA_AMOUNT,
            amountTolerancePercent: this.AMOUNT_TOLERANCE_PERCENT,
            purchaseExpiryMinutes: this.PURCHASE_EXPIRY_MS / (60 * 1000),
        };
    }
    async getUserPurchaseStats(userId) {
        const history = await this.getUserDataHistory(userId, 1000);
        return {
            totalPurchases: history.length,
            totalSpent: history.reduce((sum, purchase) => sum + parseFloat(purchase.fiat_amount.toString()), 0),
            successfulPurchases: history.filter((p) => p.status === DataPurchase_1.DataPurchaseStatus.COMPLETED).length,
            averagePurchase: history.length > 0
                ? history.reduce((sum, purchase) => sum + parseFloat(purchase.fiat_amount.toString()), 0) / history.length
                : 0,
        };
    }
}
exports.DataService = DataService;
exports.dataService = new DataService();
//# sourceMappingURL=dataService.js.map