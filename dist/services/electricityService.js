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
const notificationService_1 = require("./notificationService");
const types_1 = require("../types");
const ElectricityPurchase_1 = require("../entities/ElectricityPurchase");
const nellobytesService_1 = __importStar(require("./nellobytesService"));
const purchaseUtils_1 = require("../utils/purchaseUtils");
class ElectricityService {
    constructor() {
        // Company mappings
        this.COMPANY_MAP = {
            [ElectricityPurchase_1.ElectricityCompany.EKO_ELECTRIC]: {
                id: "01",
                name: "Eko Electric - EKEDC (PHCN)",
                code: "01",
                minAmount: 1000,
                maxAmount: 200000,
            },
            [ElectricityPurchase_1.ElectricityCompany.IKEJA_ELECTRIC]: {
                id: "02",
                name: "Ikeja Electric - IKEDC (PHCN)",
                code: "02",
                minAmount: 1000,
                maxAmount: 200000,
            },
            [ElectricityPurchase_1.ElectricityCompany.ABUJA_ELECTRIC]: {
                id: "03",
                name: "Abuja Electric - AEDC",
                code: "03",
                minAmount: 1000,
                maxAmount: 200000,
            },
            [ElectricityPurchase_1.ElectricityCompany.KANO_ELECTRIC]: {
                id: "04",
                name: "Kano Electric - KEDC",
                code: "04",
                minAmount: 1000,
                maxAmount: 200000,
            },
            [ElectricityPurchase_1.ElectricityCompany.PORTHARCOURT_ELECTRIC]: {
                id: "05",
                name: "Portharcourt Electric - PHEDC",
                code: "05",
                minAmount: 1000,
                maxAmount: 200000,
            },
            [ElectricityPurchase_1.ElectricityCompany.JOS_ELECTRIC]: {
                id: "06",
                name: "Jos Electric - JEDC",
                code: "06",
                minAmount: 1000,
                maxAmount: 200000,
            },
            [ElectricityPurchase_1.ElectricityCompany.IBADAN_ELECTRIC]: {
                id: "07",
                name: "Ibadan Electric - IBEDC",
                code: "07",
                minAmount: 2000,
                maxAmount: 200000,
            },
            [ElectricityPurchase_1.ElectricityCompany.KADUNA_ELECTRIC]: {
                id: "08",
                name: "Kaduna Electric - KAEDC",
                code: "08",
                minAmount: 1000,
                maxAmount: 200000,
            },
            [ElectricityPurchase_1.ElectricityCompany.ENUGU_ELECTRIC]: {
                id: "09",
                name: "ENUGU Electric - EEDC",
                code: "09",
                minAmount: 1000,
                maxAmount: 200000,
            },
            [ElectricityPurchase_1.ElectricityCompany.BENIN_ELECTRIC]: {
                id: "10",
                name: "BENIN Electric - BEDC",
                code: "10",
                minAmount: 1000,
                maxAmount: 200000,
            },
            [ElectricityPurchase_1.ElectricityCompany.YOLA_ELECTRIC]: {
                id: "11",
                name: "YOLA Electric - YEDC",
                code: "11",
                minAmount: 1000,
                maxAmount: 200000,
            },
            [ElectricityPurchase_1.ElectricityCompany.ABA_ELECTRIC]: {
                id: "12",
                name: "ABA Electric - APLE",
                code: "12",
                minAmount: 1000,
                maxAmount: 200000,
            },
        };
        this.electricityPurchaseRepo = null;
    }
    getRepository() {
        if (!this.electricityPurchaseRepo) {
            this.electricityPurchaseRepo =
                database_1.AppDataSource.getRepository(ElectricityPurchase_1.ElectricityPurchase);
        }
        return this.electricityPurchaseRepo;
    }
    /**
     * Process electricity payment with comprehensive validation
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
            // 2. Validate inputs
            this.validatePurchaseData(purchaseData, companyConfig);
            // 3. Verify meter number (optional - can be done before payment)
            await this.verifyMeterNumber(purchaseData.company, purchaseData.meterNumber);
            // 4. Check transaction hash uniqueness (only checks COMPLETED purchases)
            await (0, purchaseUtils_1.checkTransactionHashUniqueness)(purchaseData.transactionHash);
            // 5. Convert fiat to crypto
            const expectedCryptoAmount = await (0, purchaseUtils_1.convertFiatToCrypto)(purchaseData.amount, purchaseData.chain);
            // 6. Get receiving wallet
            const receivingWallet = (0, purchaseUtils_1.getBlockchainWallet)(purchaseData.chain);
            console.log(`💰 Expected: ${expectedCryptoAmount} ${purchaseData.chain} to ${receivingWallet}`);
            // 7. Create pending purchase record
            electricityPurchase = new ElectricityPurchase_1.ElectricityPurchase();
            electricityPurchase.user_id = userId;
            electricityPurchase.company = purchaseData.company;
            electricityPurchase.company_code = companyConfig.code;
            electricityPurchase.meter_type = purchaseData.meterType;
            electricityPurchase.meter_type_code =
                purchaseData.meterType === ElectricityPurchase_1.MeterType.PREPAID ? "01" : "02";
            electricityPurchase.meter_number = purchaseData.meterNumber;
            electricityPurchase.phone_number = purchaseData.phoneNumber;
            electricityPurchase.blockchain = purchaseData.chain;
            electricityPurchase.crypto_amount = expectedCryptoAmount;
            electricityPurchase.crypto_currency = purchaseData.chain.toUpperCase();
            electricityPurchase.fiat_amount = purchaseData.amount;
            electricityPurchase.transaction_hash = purchaseData.transactionHash;
            electricityPurchase.status = ElectricityPurchase_1.ElectricityPurchaseStatus.PROCESSING;
            await this.getRepository().save(electricityPurchase);
            // 8. Validate blockchain transaction
            console.log(`🔍 Validating ${purchaseData.chain} transaction: ${purchaseData.transactionHash}`);
            const isValid = await (0, purchaseUtils_1.validateBlockchainTransaction)(purchaseData.chain, purchaseData.transactionHash, expectedCryptoAmount, receivingWallet);
            if (!isValid) {
                await this.markPurchaseFailed(electricityPurchase, "Transaction validation failed");
                throw new Error("Transaction validation failed. Please check the transaction details.");
            }
            console.log(`✅ Transaction validated! Proceeding to electricity payment...`);
            // 9. Process electricity payment with Nellobytes
            const providerResult = await this.processElectricityWithNellobytes(electricityPurchase);
            // 10. Mark as COMPLETED only if Nellobytes succeeded (transaction is now "used")
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
                    amountTolerance: purchaseUtils_1.SECURITY_CONSTANTS.AMOUNT_TOLERANCE_PERCENT,
                },
            };
            await this.getRepository().save(electricityPurchase);
            // Mark transaction as used (for logging)
            (0, purchaseUtils_1.markTransactionAsUsed)(electricityPurchase.id, "electricity");
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
            if (electricityPurchase && electricityPurchase.id) {
                await this.markPurchaseFailed(electricityPurchase, error.message);
                if (electricityPurchase.status === ElectricityPurchase_1.ElectricityPurchaseStatus.PROCESSING) {
                    await (0, purchaseUtils_1.initiateRefund)(electricityPurchase, this.getRepository(), electricityPurchase.crypto_amount, electricityPurchase.crypto_currency, error.message, electricityPurchase.id);
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
            const providerResult = await nellobytesService_1.default.purchaseElectricity(purchase.company_code, purchase.meter_type_code, purchase.meter_number, purchase.phone_number, purchase.fiat_amount);
            console.log(`📞 Nellobytes API response:`, providerResult);
            if ((0, nellobytesService_1.isSuccessfulResponse)(providerResult)) {
                console.log(`✅ Nellobytes order successful: ${providerResult.orderid}`);
                return providerResult;
            }
            else {
                const errorMessage = (0, purchaseUtils_1.mapNellobytesError)(providerResult.statuscode, providerResult.status || "");
                console.error(`❌ Nellobytes API error: ${providerResult.statuscode} - ${providerResult.status}`);
                throw new Error(errorMessage);
            }
        }
        catch (error) {
            console.error(`❌ Nellobytes API call failed:`, error.message);
            throw error;
        }
    }
    /**
     * Verify meter number before payment
     */
    async verifyMeterNumber(company, meterNumber) {
        try {
            const companyConfig = this.COMPANY_MAP[company];
            console.log(`🔍 Verifying meter number: ${meterNumber} for ${companyConfig.name}`);
            const result = await nellobytesService_1.default.verifyElectricityMeter(companyConfig.code, meterNumber);
            console.log("✅ Meter verification raw result:", result);
            const isValid = result.status === "00" || result.statuscode === "00";
            if (!isValid) {
                return {
                    success: false,
                    message: `Invalid meter number for ${companyConfig.name}`,
                    data: {
                        valid: false,
                        meterNumber,
                        company: companyConfig.name,
                        details: result,
                    },
                };
            }
            const customerName = result.customer_name || "Customer information not available";
            return {
                success: true,
                message: "Meter number verified successfully",
                data: {
                    valid: true,
                    meterNumber,
                    company: companyConfig.name,
                    customerName: customerName,
                    details: result,
                },
            };
        }
        catch (error) {
            console.error(`❌ Meter verification failed:`, error.message);
            return {
                success: false,
                message: `Meter verification failed: ${error.message}`,
                data: null,
            };
        }
    }
    /**
     * Validate purchase data
     */
    validatePurchaseData(purchaseData, companyConfig) {
        const { type, amount, chain, company, meterType, meterNumber, phoneNumber, transactionHash, } = purchaseData;
        // Type validation
        if (type !== "electricity") {
            throw new Error("Invalid purchase type");
        }
        // Company validation
        if (!Object.values(ElectricityPurchase_1.ElectricityCompany).includes(company)) {
            throw new Error(`Invalid electricity company. Supported: ${Object.values(ElectricityPurchase_1.ElectricityCompany).join(", ")}`);
        }
        // Meter type validation
        if (!Object.values(ElectricityPurchase_1.MeterType).includes(meterType)) {
            throw new Error(`Invalid meter type. Supported: ${Object.values(ElectricityPurchase_1.MeterType).join(", ")}`);
        }
        // Meter number validation
        if (!meterNumber || typeof meterNumber !== "string") {
            throw new Error("Valid meter number is required");
        }
        if (meterNumber.length < 10 || meterNumber.length > 13) {
            throw new Error("Meter number must be between 10 and 13 digits");
        }
        // Common validation (amount, phone, chain, txHash)
        (0, purchaseUtils_1.validateCommonInputs)({
            phoneNumber,
            chain,
            transactionHash,
            amount,
            minAmount: companyConfig.minAmount,
            maxAmount: companyConfig.maxAmount,
        });
        console.log("✅ Input validation passed");
    }
    /**
     * Mark purchase as failed
     */
    async markPurchaseFailed(purchase, reason) {
        purchase.status = ElectricityPurchase_1.ElectricityPurchaseStatus.FAILED;
        purchase.metadata = {
            ...purchase.metadata,
            error: reason,
            failedAt: new Date().toISOString(),
        };
        await this.getRepository().save(purchase);
        (0, purchaseUtils_1.logSecurityEvent)("PURCHASE_FAILED", {
            purchaseId: purchase.id,
            reason,
            userId: purchase.user_id,
        });
        // Notify user about failure
        try {
            await notificationService_1.NotificationService.notifyPurchaseFailed(purchase.user_id, types_1.NotificationType.UTILITY_PAYMENT, reason, { purchaseId: purchase.id });
        }
        catch (err) {
            console.warn('Failed to send purchase failed notification:', err);
        }
    }
    // ========== PUBLIC UTILITY METHODS ==========
    async getUserElectricityHistory(userId, limit = 10) {
        return await this.getRepository().find({
            where: { user_id: userId },
            order: { created_at: "DESC" },
            take: limit,
        });
    }
    async getExpectedCryptoAmount(amount, chain) {
        if (amount < purchaseUtils_1.SECURITY_CONSTANTS.MIN_ELECTRICITY_AMOUNT ||
            amount > purchaseUtils_1.SECURITY_CONSTANTS.MAX_ELECTRICITY_AMOUNT) {
            throw new Error(`Amount must be between ₦${purchaseUtils_1.SECURITY_CONSTANTS.MIN_ELECTRICITY_AMOUNT} and ₦${purchaseUtils_1.SECURITY_CONSTANTS.MAX_ELECTRICITY_AMOUNT}`);
        }
        const cryptoAmount = await (0, purchaseUtils_1.convertFiatToCrypto)(amount, chain);
        return {
            cryptoAmount,
            cryptoCurrency: chain.toUpperCase(),
            fiatAmount: amount,
            chain,
            minAmount: purchaseUtils_1.SECURITY_CONSTANTS.MIN_ELECTRICITY_AMOUNT,
            maxAmount: purchaseUtils_1.SECURITY_CONSTANTS.MAX_ELECTRICITY_AMOUNT,
            tolerancePercent: purchaseUtils_1.SECURITY_CONSTANTS.AMOUNT_TOLERANCE_PERCENT,
            instructions: `Send approximately ${cryptoAmount} ${chain.toUpperCase()} to complete the electricity payment`,
        };
    }
    getSupportedBlockchains() {
        return (0, purchaseUtils_1.getSupportedBlockchains)();
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
            code: type === ElectricityPurchase_1.MeterType.PREPAID ? "01" : "02",
        }));
    }
    getSecurityLimits() {
        return (0, purchaseUtils_1.getSecurityLimits)().electricity;
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