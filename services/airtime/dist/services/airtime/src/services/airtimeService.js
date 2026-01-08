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
exports.airtimeService = exports.AirtimeService = void 0;
const database_1 = require("../config/database");
const AirtimePurchase_1 = require("../entities/AirtimePurchase");
const nellobytesService_1 = require("./nellobytesService");
const purchaseUtils_1 = require("../utils/purchaseUtils");
class AirtimeService {
    constructor() {
        this.airtimePurchaseRepo = null;
        this.airtimePurchaseRepo = null;
    }
    getRepository() {
        if (!this.airtimePurchaseRepo) {
            this.airtimePurchaseRepo = database_1.AppDataSource.getRepository(AirtimePurchase_1.AirtimePurchase);
        }
        return this.airtimePurchaseRepo;
    }
    async processAirtimePurchase(userId, purchaseData) {
        console.log(`🔄 Processing airtime purchase for user ${userId}:`, purchaseData);
        let airtimePurchase = null;
        try {
            this.validatePurchaseData(purchaseData);
            await (0, purchaseUtils_1.checkTransactionHashUniqueness)(purchaseData.transactionHash);
            const expectedCryptoAmount = await (0, purchaseUtils_1.convertFiatToCrypto)(purchaseData.amount, purchaseData.chain);
            const receivingWallet = (0, purchaseUtils_1.getBlockchainWallet)(purchaseData.chain);
            console.log(`💰 Expected: ${expectedCryptoAmount} ${purchaseData.chain} to ${receivingWallet}`);
            airtimePurchase = new AirtimePurchase_1.AirtimePurchase();
            airtimePurchase.user_id = userId;
            airtimePurchase.network = purchaseData.mobileNetwork;
            airtimePurchase.blockchain = purchaseData.chain;
            airtimePurchase.crypto_amount = expectedCryptoAmount;
            airtimePurchase.crypto_currency = purchaseData.chain.toUpperCase();
            airtimePurchase.fiat_amount = purchaseData.amount;
            airtimePurchase.phone_number = purchaseData.phoneNumber;
            airtimePurchase.transaction_hash = purchaseData.transactionHash;
            airtimePurchase.status = AirtimePurchase_1.AirtimePurchaseStatus.PROCESSING;
            await this.getRepository().save(airtimePurchase);
            console.log(`🔍 Validating ${purchaseData.chain} transaction: ${purchaseData.transactionHash}`);
            const isValid = await (0, purchaseUtils_1.validateBlockchainTransaction)(purchaseData.chain, purchaseData.transactionHash, expectedCryptoAmount, receivingWallet);
            if (!isValid) {
                await this.markPurchaseFailed(airtimePurchase, "Transaction validation failed");
                throw new Error("Transaction validation failed. Please check the transaction details.");
            }
            console.log(`✅ Transaction validated! Proceeding to airtime delivery...`);
            const providerResult = await this.processAirtimeWithNellobytes(airtimePurchase);
            airtimePurchase.status = AirtimePurchase_1.AirtimePurchaseStatus.COMPLETED;
            airtimePurchase.provider_reference = providerResult.orderid;
            airtimePurchase.metadata = {
                providerResponse: providerResult,
                processedAt: new Date().toISOString(),
                security: {
                    validatedAt: new Date().toISOString(),
                    amountTolerance: purchaseUtils_1.SECURITY_CONSTANTS.AMOUNT_TOLERANCE_PERCENT,
                },
            };
            await this.getRepository().save(airtimePurchase);
            (0, purchaseUtils_1.markTransactionAsUsed)(airtimePurchase.id, "airtime");
            console.log(`🎉 Airtime delivered! ${purchaseData.amount} NGN to ${purchaseData.phoneNumber}`);
            return {
                success: true,
                message: `Airtime purchase successful! ${purchaseData.amount} NGN ${purchaseData.mobileNetwork.toUpperCase()} airtime delivered to ${purchaseData.phoneNumber}`,
                data: {
                    purchaseId: airtimePurchase.id,
                    airtimeAmount: purchaseData.amount,
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
            console.error("❌ Airtime purchase failed:", error);
            if (airtimePurchase && airtimePurchase.id) {
                await this.markPurchaseFailed(airtimePurchase, error.message);
                if (airtimePurchase.status === AirtimePurchase_1.AirtimePurchaseStatus.PROCESSING) {
                    await (0, purchaseUtils_1.initiateRefund)(airtimePurchase, this.getRepository(), airtimePurchase.crypto_amount, airtimePurchase.crypto_currency, error.message, airtimePurchase.id);
                }
            }
            throw error;
        }
    }
    async processAirtimeWithNellobytes(purchase) {
        try {
            console.log(`📞 Calling Nellobytes API for ${purchase.fiat_amount} NGN ${purchase.network} to ${purchase.phone_number}`);
            // Dynamic import to avoid circular dep if any, but regular import is fine
            const { default: nellobytesService } = await Promise.resolve().then(() => __importStar(require("./nellobytesService")));
            const providerResult = await nellobytesService.purchaseAirtimeSimple(purchase.network, purchase.fiat_amount, purchase.phone_number, `VELO_${purchase.id}_${Date.now()}`);
            console.log(`📞 Nellobytes API response:`, providerResult);
            if ((0, nellobytesService_1.isSuccessfulResponse)(providerResult) ||
                providerResult.status === "ORDER_RECEIVED") {
                console.log(`✅ Nellobytes order successful: ${providerResult.orderid}`);
                return providerResult;
            }
            else {
                throw new Error(`Nellobytes API error: ${providerResult.statuscode} - ${providerResult.status}`);
            }
        }
        catch (error) {
            console.error(`❌ Nellobytes API call failed:`, error.message);
            if (error.message.includes("Nellobytes:")) {
                throw error;
            }
            throw new Error(`Nellobytes: ${error.message}`);
        }
    }
    validatePurchaseData(purchaseData) {
        const { type, amount, chain, phoneNumber, mobileNetwork, transactionHash } = purchaseData;
        if (type !== "airtime") {
            throw new Error("Invalid purchase type");
        }
        if (!Object.values(purchaseUtils_1.MobileNetwork).includes(mobileNetwork)) {
            throw new Error(`Invalid mobile network. Supported: ${Object.values(purchaseUtils_1.MobileNetwork).join(", ")}`);
        }
        (0, purchaseUtils_1.validateCommonInputs)({
            phoneNumber,
            chain,
            transactionHash,
            amount,
            minAmount: purchaseUtils_1.SECURITY_CONSTANTS.MIN_AIRTIME_AMOUNT,
            maxAmount: purchaseUtils_1.SECURITY_CONSTANTS.MAX_AIRTIME_AMOUNT,
        });
        console.log("✅ Input validation passed");
    }
    async markPurchaseFailed(purchase, reason) {
        purchase.status = AirtimePurchase_1.AirtimePurchaseStatus.FAILED;
        purchase.metadata = {
            ...purchase.metadata,
            error: reason,
            failedAt: new Date().toISOString(),
            security: {
                validationFailed: true,
                failedAt: new Date().toISOString(),
            },
        };
        await this.getRepository().save(purchase);
        (0, purchaseUtils_1.logSecurityEvent)("PURCHASE_FAILED", {
            purchaseId: purchase.id,
            reason,
            userId: purchase.user_id,
            fiatAmount: purchase.fiat_amount,
            cryptoAmount: purchase.crypto_amount,
            network: purchase.network,
        });
    }
    async getUserAirtimeHistory(userId, limit = 10) {
        return await this.getRepository().find({
            where: { user_id: userId },
            order: { created_at: "DESC" },
            take: limit,
        });
    }
    async getExpectedCryptoAmount(fiatAmount, chain) {
        if (fiatAmount < purchaseUtils_1.SECURITY_CONSTANTS.MIN_AIRTIME_AMOUNT ||
            fiatAmount > purchaseUtils_1.SECURITY_CONSTANTS.MAX_AIRTIME_AMOUNT) {
            throw new Error(`Amount must be between ${purchaseUtils_1.SECURITY_CONSTANTS.MIN_AIRTIME_AMOUNT} and ${purchaseUtils_1.SECURITY_CONSTANTS.MAX_AIRTIME_AMOUNT} NGN`);
        }
        const cryptoAmount = await (0, purchaseUtils_1.convertFiatToCrypto)(fiatAmount, chain);
        return {
            cryptoAmount,
            cryptoCurrency: chain.toUpperCase(),
            fiatAmount,
            chain,
            minAmount: purchaseUtils_1.SECURITY_CONSTANTS.MIN_AIRTIME_AMOUNT,
            maxAmount: purchaseUtils_1.SECURITY_CONSTANTS.MAX_AIRTIME_AMOUNT,
            tolerancePercent: purchaseUtils_1.SECURITY_CONSTANTS.AMOUNT_TOLERANCE_PERCENT,
            instructions: `Send approximately ${cryptoAmount} ${chain.toUpperCase()} from your wallet to complete the airtime purchase`,
        };
    }
    getSupportedBlockchains() {
        return (0, purchaseUtils_1.getSupportedBlockchains)();
    }
    getSupportedNetworks() {
        return (0, purchaseUtils_1.getSupportedNetworks)();
    }
    getSecurityLimits() {
        return (0, purchaseUtils_1.getSecurityLimits)().airtime;
    }
}
exports.AirtimeService = AirtimeService;
exports.airtimeService = new AirtimeService();
