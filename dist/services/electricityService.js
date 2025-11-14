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
exports.electricityService = exports.ElectricityService = void 0;
const database_1 = require("../config/database");
const ElectricityPurchase_1 = require("../entities/ElectricityPurchase");
const nellobytesService_1 = __importStar(require("./nellobytesService"));
const validators_1 = require("./blockchain/validators");
const exchangeRateService_1 = require("./exchangeRateService");
class ElectricityService {
    constructor() {
        // Security constants
        this.MIN_ELECTRICITY_AMOUNT = 1000;
        this.MAX_ELECTRICITY_AMOUNT = 200000;
        this.AMOUNT_TOLERANCE_PERCENT = 1.0; // 1% tolerance
        this.PURCHASE_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes
        // Company mappings
        this.COMPANY_MAP = {
            [ElectricityPurchase_1.ElectricityCompany.EKO_ELECTRIC]: {
                id: '01',
                name: 'Eko Electric - EKEDC (PHCN)',
                code: '01',
                minAmount: 1000,
                maxAmount: 200000
            },
            [ElectricityPurchase_1.ElectricityCompany.IKEJA_ELECTRIC]: {
                id: '02',
                name: 'Ikeja Electric - IKEDC (PHCN)',
                code: '02',
                minAmount: 1000,
                maxAmount: 200000
            },
            [ElectricityPurchase_1.ElectricityCompany.ABUJA_ELECTRIC]: {
                id: '03',
                name: 'Abuja Electric - AEDC',
                code: '03',
                minAmount: 1000,
                maxAmount: 200000
            },
            [ElectricityPurchase_1.ElectricityCompany.KANO_ELECTRIC]: {
                id: '04',
                name: 'Kano Electric - KEDC',
                code: '04',
                minAmount: 1000,
                maxAmount: 200000
            },
            [ElectricityPurchase_1.ElectricityCompany.PORTHARCOURT_ELECTRIC]: {
                id: '05',
                name: 'Portharcourt Electric - PHEDC',
                code: '05',
                minAmount: 1000,
                maxAmount: 200000
            },
            [ElectricityPurchase_1.ElectricityCompany.JOS_ELECTRIC]: {
                id: '06',
                name: 'Jos Electric - JEDC',
                code: '06',
                minAmount: 1000,
                maxAmount: 200000
            },
            [ElectricityPurchase_1.ElectricityCompany.IBADAN_ELECTRIC]: {
                id: '07',
                name: 'Ibadan Electric - IBEDC',
                code: '07',
                minAmount: 2000,
                maxAmount: 200000
            },
            [ElectricityPurchase_1.ElectricityCompany.KADUNA_ELECTRIC]: {
                id: '08',
                name: 'Kaduna Electric - KAEDC',
                code: '08',
                minAmount: 1000,
                maxAmount: 200000
            },
            [ElectricityPurchase_1.ElectricityCompany.ENUGU_ELECTRIC]: {
                id: '09',
                name: 'ENUGU Electric - EEDC',
                code: '09',
                minAmount: 1000,
                maxAmount: 200000
            },
            [ElectricityPurchase_1.ElectricityCompany.BENIN_ELECTRIC]: {
                id: '10',
                name: 'BENIN Electric - BEDC',
                code: '10',
                minAmount: 1000,
                maxAmount: 200000
            },
            [ElectricityPurchase_1.ElectricityCompany.YOLA_ELECTRIC]: {
                id: '11',
                name: 'YOLA Electric - YEDC',
                code: '11',
                minAmount: 1000,
                maxAmount: 200000
            },
            [ElectricityPurchase_1.ElectricityCompany.ABA_ELECTRIC]: {
                id: '12',
                name: 'ABA Electric - APLE',
                code: '12',
                minAmount: 1000,
                maxAmount: 200000
            }
        };
        this.electricityPurchaseRepo = null;
    }
    getRepository() {
        if (!this.electricityPurchaseRepo) {
            this.electricityPurchaseRepo = database_1.AppDataSource.getRepository(ElectricityPurchase_1.ElectricityPurchase);
        }
        return this.electricityPurchaseRepo;
    }
    /**
     * SECURE: Process electricity payment with comprehensive validation
     */
    async processElectricityPayment(userId, purchaseData) {
        console.log(`📄 Processing electricity payment for user ${userId}:`, purchaseData);
        let electricityPurchase = null;
        try {
            // 1. Get company configuration
            const companyConfig = this.COMPANY_MAP[purchaseData.company];
            if (!companyConfig) {
                throw new Error(`Invalid electricity company: ${purchaseData.company}`);
            }
            console.log(`⚡ Company: ${companyConfig.name}`);
            // 2. Comprehensive input validation
            this.validatePurchaseData(purchaseData, companyConfig);
            // 3. Verify meter number (optional - can be done before payment)
            // await this.verifyMeterNumber(purchaseData.company, purchaseData.meterNumber);
            // 4. Check transaction hash uniqueness
            await this.checkTransactionHashUniqueness(purchaseData.transactionHash);
            // 5. Convert fiat amount to crypto amount
            const expectedCryptoAmount = await this.convertFiatToCrypto(purchaseData.amount, purchaseData.chain);
            // 6. Get the company's wallet address
            const receivingWallet = this.getBlockchainWallet(purchaseData.chain);
            console.log(`💰 Expected: ${expectedCryptoAmount} ${purchaseData.chain} to ${receivingWallet}`);
            // 7. Create pending purchase record
            electricityPurchase = new ElectricityPurchase_1.ElectricityPurchase();
            electricityPurchase.user_id = userId;
            electricityPurchase.company = purchaseData.company;
            electricityPurchase.company_code = companyConfig.code;
            electricityPurchase.meter_type = purchaseData.meterType;
            electricityPurchase.meter_type_code = purchaseData.meterType === ElectricityPurchase_1.MeterType.PREPAID ? '01' : '02';
            electricityPurchase.meter_number = purchaseData.meterNumber;
            electricityPurchase.phone_number = purchaseData.phoneNumber;
            electricityPurchase.blockchain = purchaseData.chain;
            electricityPurchase.crypto_amount = expectedCryptoAmount;
            electricityPurchase.crypto_currency = purchaseData.chain.toUpperCase();
            electricityPurchase.fiat_amount = purchaseData.amount;
            electricityPurchase.transaction_hash = purchaseData.transactionHash;
            electricityPurchase.status = ElectricityPurchase_1.ElectricityPurchaseStatus.PROCESSING;
            await this.getRepository().save(electricityPurchase);
            // 8. Validate the blockchain transaction with amount tolerance
            console.log(`🔍 Validating ${purchaseData.chain} transaction: ${purchaseData.transactionHash}`);
            const isValid = await this.validateBlockchainTransaction(purchaseData.chain, purchaseData.transactionHash, expectedCryptoAmount, receivingWallet);
            if (!isValid) {
                await this.markPurchaseFailed(electricityPurchase, "Transaction validation failed");
                throw new Error("Transaction validation failed. Please check the transaction details.");
            }
            console.log(`✅ Transaction validated! Proceeding to electricity payment...`);
            // 9. Process electricity payment with Nellobytesystems
            const providerResult = await this.processElectricityWithNellobytes(electricityPurchase);
            // 10. Mark as completed ONLY if provider succeeded
            electricityPurchase.status = ElectricityPurchase_1.ElectricityPurchaseStatus.COMPLETED;
            electricityPurchase.provider_reference = providerResult.orderid;
            electricityPurchase.meter_token = providerResult.metertoken;
            electricityPurchase.metadata = {
                providerResponse: providerResult,
                processedAt: new Date().toISOString(),
                companyDetails: {
                    name: companyConfig.name,
                    code: companyConfig.code,
                },
                security: {
                    validatedAt: new Date().toISOString(),
                    amountTolerance: this.AMOUNT_TOLERANCE_PERCENT,
                },
            };
            await this.getRepository().save(electricityPurchase);
            console.log(`🎉 Electricity payment successful! Token: ${providerResult.metertoken}`);
            return {
                success: true,
                message: `Electricity payment successful! ₦${purchaseData.amount} paid to ${companyConfig.name}`,
                data: {
                    purchaseId: electricityPurchase.id,
                    amount: purchaseData.amount,
                    company: companyConfig.name,
                    meterNumber: purchaseData.meterNumber,
                    meterType: purchaseData.meterType,
                    meterToken: providerResult.metertoken,
                    providerReference: providerResult.orderid,
                    cryptoAmount: expectedCryptoAmount,
                    cryptoCurrency: purchaseData.chain.toUpperCase(),
                    processedAt: new Date(),
                },
            };
        }
        catch (error) {
            console.error("❌ Electricity payment failed:", error);
            // If we created a purchase record but failed later, update its status
            if (electricityPurchase && electricityPurchase.id) {
                await this.markPurchaseFailed(electricityPurchase, error.message);
                // Initiate refund for blockchain-validated but provider-failed transactions
                if (electricityPurchase.status === ElectricityPurchase_1.ElectricityPurchaseStatus.PROCESSING) {
                    await this.initiateRefund(electricityPurchase, error.message);
                }
            }
            throw error;
        }
    }
    /**
     * Process electricity payment with Nellobytesystems
     */
    async processElectricityWithNellobytes(purchase) {
        try {
            console.log(`📞 Calling Nellobytes API for ₦${purchase.fiat_amount} electricity payment`);
            console.log(`   Company: ${purchase.company_code}, Meter: ${purchase.meter_number}`);
            const providerResult = await nellobytesService_1.default.purchaseElectricity(purchase.company_code, purchase.meter_type_code, purchase.meter_number, purchase.phone_number, purchase.fiat_amount, `VELO_ELEC_${purchase.id}_${Date.now()}`);
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
     * Verify meter number before payment (optional)
     */
    async verifyMeterNumber(company, meterNumber) {
        try {
            const companyConfig = this.COMPANY_MAP[company];
            console.log(`🔍 Verifying meter number: ${meterNumber} for ${companyConfig.name}`);
            const result = await nellobytesService_1.default.verifyElectricityMeter(companyConfig.code, meterNumber);
            console.log(`✅ Meter verification result:`, result);
            return {
                valid: (0, nellobytesService_1.isSuccessfulResponse)(result),
                meterNumber: meterNumber,
                company: companyConfig.name,
                details: result
            };
        }
        catch (error) {
            console.error(`❌ Meter verification failed:`, error.message);
            throw new Error(`Meter verification failed: ${error.message}`);
        }
    }
    /**
     * Map Nellobytes error codes to user-friendly messages
     */
    mapNellobytesError(statusCode, status) {
        const errorMap = {
            'INVALID_CREDENTIALS': 'Nellobytes: Invalid API credentials. Please contact support.',
            'MISSING_CREDENTIALS': 'Nellobytes: API credentials missing. Please contact support.',
            'INVALID_METER_NUMBER': 'Nellobytes: Invalid meter number.',
            'INVALID_AMOUNT': 'Nellobytes: Invalid amount specified.',
            'MINIMUM_AMOUNT': 'Nellobytes: Amount below minimum for this company.',
            'INVALID_COMPANY': 'Nellobytes: Invalid electricity company.',
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
     * Initiate refund when payment fails
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
     * SECURITY: Comprehensive input validation
     */
    validatePurchaseData(purchaseData, companyConfig) {
        const { type, amount, chain, company, meterType, meterNumber, phoneNumber, transactionHash } = purchaseData;
        // Type validation
        if (type !== "electricity") {
            throw new Error("Invalid purchase type");
        }
        // Amount validation
        if (typeof amount !== "number" || isNaN(amount)) {
            throw new Error("Amount must be a valid number");
        }
        if (amount < companyConfig.minAmount) {
            throw new Error(`Minimum amount for ${companyConfig.name} is ₦${companyConfig.minAmount}`);
        }
        if (amount > companyConfig.maxAmount) {
            throw new Error(`Maximum amount for ${companyConfig.name} is ₦${companyConfig.maxAmount}`);
        }
        // Meter number validation
        if (!meterNumber || typeof meterNumber !== "string") {
            throw new Error("Valid meter number is required");
        }
        if (meterNumber.length < 10 || meterNumber.length > 13) {
            throw new Error("Meter number must be between 10 and 13 digits");
        }
        // Phone number validation (Nigeria)
        const phoneRegex = /^234[7-9][0-9]{9}$/;
        if (!phoneRegex.test(phoneNumber)) {
            throw new Error("Invalid Nigerian phone number format. Use 234XXXXXXXXXX");
        }
        // Company validation
        if (!Object.values(ElectricityPurchase_1.ElectricityCompany).includes(company)) {
            throw new Error(`Invalid electricity company. Supported: ${Object.values(ElectricityPurchase_1.ElectricityCompany).join(", ")}`);
        }
        // Meter type validation
        if (!Object.values(ElectricityPurchase_1.MeterType).includes(meterType)) {
            throw new Error(`Invalid meter type. Supported: ${Object.values(ElectricityPurchase_1.MeterType).join(", ")}`);
        }
        // Blockchain validation
        if (!Object.values(ElectricityPurchase_1.Blockchain).includes(chain)) {
            throw new Error(`Unsupported blockchain. Supported: ${Object.values(ElectricityPurchase_1.Blockchain).join(", ")}`);
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
                case ElectricityPurchase_1.Blockchain.ETHEREUM:
                    return await validators_1.blockchainValidator.validateEthereumTransaction(transactionHash, expectedToAddress, minAllowedAmount, maxAllowedAmount);
                case ElectricityPurchase_1.Blockchain.BITCOIN:
                    return await validators_1.blockchainValidator.validateBitcoinTransaction(transactionHash, expectedToAddress, minAllowedAmount, maxAllowedAmount);
                case ElectricityPurchase_1.Blockchain.SOLANA:
                    return await validators_1.blockchainValidator.validateSolanaTransaction(transactionHash, expectedToAddress, minAllowedAmount, maxAllowedAmount);
                case ElectricityPurchase_1.Blockchain.STELLAR:
                    return await validators_1.blockchainValidator.validateStellarTransaction(transactionHash, expectedToAddress, minAllowedAmount, maxAllowedAmount);
                case ElectricityPurchase_1.Blockchain.POLKADOT:
                    return await validators_1.blockchainValidator.validatePolkadotTransaction(transactionHash, expectedToAddress, minAllowedAmount, maxAllowedAmount);
                case ElectricityPurchase_1.Blockchain.STARKNET:
                    return await validators_1.blockchainValidator.validateStarknetTransaction(transactionHash, expectedToAddress, minAllowedAmount, maxAllowedAmount);
                case ElectricityPurchase_1.Blockchain.USDT_ERC20:
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
        purchase.status = ElectricityPurchase_1.ElectricityPurchaseStatus.FAILED;
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
            service: "ElectricityService",
        });
    }
    /**
     * Get company's wallet address
     */
    getBlockchainWallet(blockchain) {
        const walletMap = {
            [ElectricityPurchase_1.Blockchain.ETHEREUM]: process.env.ETHEREUM_TESTNET_TREASURY,
            [ElectricityPurchase_1.Blockchain.BITCOIN]: process.env.BITCOIN_TESTNET_TREASURY,
            [ElectricityPurchase_1.Blockchain.SOLANA]: process.env.SOLANA_TESTNET_TREASURY,
            [ElectricityPurchase_1.Blockchain.STELLAR]: process.env.STELLAR_TESTNET_TREASURY,
            [ElectricityPurchase_1.Blockchain.POLKADOT]: process.env.POLKADOT_TESTNET_TREASURY,
            [ElectricityPurchase_1.Blockchain.STARKNET]: process.env.STARKNET_TESTNET_TREASURY,
            [ElectricityPurchase_1.Blockchain.USDT_ERC20]: process.env.USDT_TESTNET_TREASURY,
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
                [ElectricityPurchase_1.Blockchain.ETHEREUM]: "eth",
                [ElectricityPurchase_1.Blockchain.BITCOIN]: "btc",
                [ElectricityPurchase_1.Blockchain.SOLANA]: "sol",
                [ElectricityPurchase_1.Blockchain.STELLAR]: "xlm",
                [ElectricityPurchase_1.Blockchain.POLKADOT]: "dot",
                [ElectricityPurchase_1.Blockchain.STARKNET]: "strk",
                [ElectricityPurchase_1.Blockchain.USDT_ERC20]: "usdt",
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
            [ElectricityPurchase_1.Blockchain.ETHEREUM]: 2000000,
            [ElectricityPurchase_1.Blockchain.BITCOIN]: 60000000,
            [ElectricityPurchase_1.Blockchain.SOLANA]: 269800,
            [ElectricityPurchase_1.Blockchain.STELLAR]: 500,
            [ElectricityPurchase_1.Blockchain.POLKADOT]: 10000,
            [ElectricityPurchase_1.Blockchain.STARKNET]: 2000,
            [ElectricityPurchase_1.Blockchain.USDT_ERC20]: 1500,
        };
        const cryptoAmount = fiatAmount / mockRates[blockchain];
        return Math.round(cryptoAmount * 100000000) / 100000000;
    }
    /**
     * Get user's electricity payment history
     */
    async getUserElectricityHistory(userId, limit = 10) {
        return await this.getRepository().find({
            where: { user_id: userId },
            order: { created_at: "DESC" },
            take: limit,
        });
    }
    /**
     * Get expected crypto amount
     */
    async getExpectedCryptoAmount(amount, chain) {
        // Validate amount first
        if (amount < this.MIN_ELECTRICITY_AMOUNT || amount > this.MAX_ELECTRICITY_AMOUNT) {
            throw new Error(`Amount must be between ₦${this.MIN_ELECTRICITY_AMOUNT} and ₦${this.MAX_ELECTRICITY_AMOUNT}`);
        }
        const cryptoAmount = await this.convertFiatToCrypto(amount, chain);
        return {
            cryptoAmount,
            cryptoCurrency: chain.toUpperCase(),
            fiatAmount: amount,
            chain,
            minAmount: this.MIN_ELECTRICITY_AMOUNT,
            maxAmount: this.MAX_ELECTRICITY_AMOUNT,
            tolerancePercent: this.AMOUNT_TOLERANCE_PERCENT,
            instructions: `Send approximately ${cryptoAmount} ${chain.toUpperCase()} to complete the electricity payment`,
        };
    }
    getSupportedBlockchains() {
        return Object.values(ElectricityPurchase_1.Blockchain).map((chain) => ({
            chain: chain,
            symbol: chain.toUpperCase(),
            name: chain.charAt(0).toUpperCase() + chain.slice(1).replace("_", " "),
        }));
    }
    getSupportedCompanies() {
        return Object.entries(this.COMPANY_MAP).map(([key, config]) => ({
            value: key,
            label: config.name,
            code: config.code,
            minAmount: config.minAmount,
            maxAmount: config.maxAmount,
        }));
    }
    getSupportedMeterTypes() {
        return Object.values(ElectricityPurchase_1.MeterType).map((type) => ({
            value: type,
            label: type.charAt(0).toUpperCase() + type.slice(1),
            code: type === ElectricityPurchase_1.MeterType.PREPAID ? '01' : '02',
        }));
    }
    getSecurityLimits() {
        return {
            minElectricityAmount: this.MIN_ELECTRICITY_AMOUNT,
            maxElectricityAmount: this.MAX_ELECTRICITY_AMOUNT,
            amountTolerancePercent: this.AMOUNT_TOLERANCE_PERCENT,
            purchaseExpiryMinutes: this.PURCHASE_EXPIRY_MS / (60 * 1000),
        };
    }
    async getUserPurchaseStats(userId) {
        const history = await this.getUserElectricityHistory(userId, 1000);
        return {
            totalPurchases: history.length,
            totalSpent: history.reduce((sum, purchase) => sum + parseFloat(purchase.fiat_amount.toString()), 0),
            successfulPurchases: history.filter((p) => p.status === ElectricityPurchase_1.ElectricityPurchaseStatus.COMPLETED).length,
            averagePurchase: history.length > 0
                ? history.reduce((sum, purchase) => sum + parseFloat(purchase.fiat_amount.toString()), 0) / history.length
                : 0,
        };
    }
}
exports.ElectricityService = ElectricityService;
exports.electricityService = new ElectricityService();
//# sourceMappingURL=electricityService.js.map