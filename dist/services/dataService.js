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
const notificationService_1 = require("./notificationService");
const types_1 = require("../types");
const DataPurchase_1 = require("../entities/DataPurchase");
const nellobytesService_1 = __importStar(require("./nellobytesService"));
const purchaseUtils_1 = require("../utils/purchaseUtils");
class DataService {
    constructor() {
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
        if (this.plansCacheTimestamp &&
            now - this.plansCacheTimestamp < this.CACHE_DURATION_MS) {
            console.log("📋 Using cached data plans");
            return;
        }
        try {
            console.log("📋 Fetching fresh data plans from Nellobytes API...");
            const allPlans = await nellobytesService_1.default.fetchDataPlans();
            this.dataPlansCache = {
                [purchaseUtils_1.MobileNetwork.MTN]: allPlans.filter((p) => p.plan_network === "01"),
                [purchaseUtils_1.MobileNetwork.GLO]: allPlans.filter((p) => p.plan_network === "02"),
                [purchaseUtils_1.MobileNetwork.ETISALAT]: allPlans.filter((p) => p.plan_network === "03"),
                [purchaseUtils_1.MobileNetwork.AIRTEL]: allPlans.filter((p) => p.plan_network === "04"),
            };
            this.plansCacheTimestamp = now;
            console.log("✅ Data plans cached successfully:", {
                mtn: this.dataPlansCache[purchaseUtils_1.MobileNetwork.MTN]?.length || 0,
                glo: this.dataPlansCache[purchaseUtils_1.MobileNetwork.GLO]?.length || 0,
                "9mobile": this.dataPlansCache[purchaseUtils_1.MobileNetwork.ETISALAT]?.length || 0,
                airtel: this.dataPlansCache[purchaseUtils_1.MobileNetwork.AIRTEL]?.length || 0,
            });
        }
        catch (error) {
            console.error("❌ Failed to fetch data plans:", error.message);
            if (Object.keys(this.dataPlansCache).length === 0) {
                throw new Error("Failed to load data plans. Please try again later.");
            }
            console.warn("⚠️ Using stale cache due to API error");
        }
    }
    /**
     * Process data purchase with comprehensive validation
     */
    async processDataPurchase(userId, purchaseData) {
        console.log(`📄 Processing data purchase for user ${userId}:`, purchaseData);
        let dataPurchase = null;
        try {
            // 1. Refresh data plans cache
            await this.refreshDataPlans();
            // 2. Get and validate the selected data plan
            const plan = await this.getDataPlanById(purchaseData.mobileNetwork, purchaseData.dataplanId);
            if (!plan) {
                throw new Error(`Invalid data plan selected: ${purchaseData.dataplanId}`);
            }
            console.log(`📱 Selected plan: ${plan.plan_name} - ${plan.plan_amount}`);
            // 3. Parse the plan amount
            const planAmount = (0, nellobytesService_1.parsePriceString)(plan.plan_amount);
            console.log(`💰 Plan price: ₦${planAmount}`);
            // 4. Validate that user's amount matches plan amount
            if (Math.abs(purchaseData.amount - planAmount) > 0.01) {
                throw new Error(`Amount mismatch: Expected ₦${planAmount} for selected plan, but received ₦${purchaseData.amount}`);
            }
            // 5. Validate inputs
            this.validatePurchaseData(purchaseData, planAmount);
            // 6. Check transaction hash uniqueness (only checks COMPLETED purchases)
            await (0, purchaseUtils_1.checkTransactionHashUniqueness)(purchaseData.transactionHash);
            // 7. Convert fiat to crypto
            const expectedCryptoAmount = await (0, purchaseUtils_1.convertFiatToCrypto)(purchaseData.amount, purchaseData.chain);
            // 8. Get receiving wallet
            const receivingWallet = (0, purchaseUtils_1.getBlockchainWallet)(purchaseData.chain);
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
            // 10. Validate blockchain transaction
            console.log(`🔍 Validating ${purchaseData.chain} transaction: ${purchaseData.transactionHash}`);
            const isValid = await (0, purchaseUtils_1.validateBlockchainTransaction)(purchaseData.chain, purchaseData.transactionHash, expectedCryptoAmount, receivingWallet);
            if (!isValid) {
                await this.markPurchaseFailed(dataPurchase, "Transaction validation failed");
                throw new Error("Transaction validation failed. Please check the transaction details.");
            }
            console.log(`✅ Transaction validated! Proceeding to data delivery...`);
            // 11. Process data with Nellobytes
            const providerResult = await this.processDataWithNellobytes(dataPurchase);
            // 12. Mark as COMPLETED only if Nellobytes succeeded (transaction is now "used")
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
                    amountTolerance: purchaseUtils_1.SECURITY_CONSTANTS.AMOUNT_TOLERANCE_PERCENT,
                },
            };
            await this.getRepository().save(dataPurchase);
            // Mark transaction as used (for logging)
            (0, purchaseUtils_1.markTransactionAsUsed)(dataPurchase.id, "data");
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
            if (dataPurchase && dataPurchase.id) {
                await this.markPurchaseFailed(dataPurchase, error.message);
                if (dataPurchase.status === DataPurchase_1.DataPurchaseStatus.PROCESSING) {
                    await (0, purchaseUtils_1.initiateRefund)(dataPurchase, this.getRepository(), dataPurchase.crypto_amount, dataPurchase.crypto_currency, error.message, dataPurchase.id);
                }
            }
            throw error;
        }
    }
    /**
     * Process data with Nellobytesystems
     */
    async processDataWithNellobytes(purchase) {
        try {
            console.log(`📞 Calling Nellobytes API for ${purchase.plan_name} to ${purchase.phone_number}`);
            const providerResult = await nellobytesService_1.default.purchaseDataBundle(purchase.network, purchase.dataplan_id, purchase.phone_number, `VELO_DATA_${purchase.id}_${Date.now()}`);
            console.log(`📞 Nellobytes API response:`, providerResult);
            if ((0, nellobytesService_1.isSuccessfulResponse)(providerResult) ||
                providerResult.status === "ORDER_RECEIVED") {
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
            if (error.message.includes("Nellobytes:")) {
                throw error;
            }
            throw new Error(`Nellobytes: ${error.message}`);
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
        return plans.find((plan) => plan.dataplan_id === dataplanId) || null;
    }
    /**
     * Validate purchase data
     */
    validatePurchaseData(purchaseData, planAmount) {
        const { type, amount, chain, phoneNumber, mobileNetwork, transactionHash } = purchaseData;
        // Type validation
        if (type !== "data") {
            throw new Error("Invalid purchase type");
        }
        // Network validation
        if (!Object.values(purchaseUtils_1.MobileNetwork).includes(mobileNetwork)) {
            throw new Error(`Invalid mobile network. Supported: ${Object.values(purchaseUtils_1.MobileNetwork).join(", ")}`);
        }
        // Common validation
        (0, purchaseUtils_1.validateCommonInputs)({
            phoneNumber,
            chain,
            transactionHash,
            amount,
            minAmount: purchaseUtils_1.SECURITY_CONSTANTS.MIN_DATA_AMOUNT,
            maxAmount: purchaseUtils_1.SECURITY_CONSTANTS.MAX_DATA_AMOUNT,
        });
        console.log("✅ Input validation passed");
    }
    /**
     * Mark purchase as failed
     */
    async markPurchaseFailed(purchase, reason) {
        purchase.status = DataPurchase_1.DataPurchaseStatus.FAILED;
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
            await notificationService_1.NotificationService.notifyPurchaseFailed(purchase.user_id, types_1.NotificationType.DATA_PURCHASE, reason, { purchaseId: purchase.id });
        }
        catch (err) {
            console.warn('Failed to send purchase failed notification:', err);
        }
    }
    // ========== PUBLIC UTILITY METHODS ==========
    async getDataPlans(network) {
        await this.refreshDataPlans();
        return this.dataPlansCache[network] || [];
    }
    async forceRefreshDataPlans() {
        this.plansCacheTimestamp = 0;
        await this.refreshDataPlans();
    }
    async getUserDataHistory(userId, limit = 10) {
        return await this.getRepository().find({
            where: { user_id: userId },
            order: { created_at: "DESC" },
            take: limit,
        });
    }
    async getExpectedCryptoAmount(dataplanId, network, chain) {
        const plan = await this.getDataPlanById(network, dataplanId);
        if (!plan) {
            throw new Error("Invalid data plan selected");
        }
        const planAmount = (0, nellobytesService_1.parsePriceString)(plan.plan_amount);
        const cryptoAmount = await (0, purchaseUtils_1.convertFiatToCrypto)(planAmount, chain);
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
            tolerancePercent: purchaseUtils_1.SECURITY_CONSTANTS.AMOUNT_TOLERANCE_PERCENT,
            instructions: `Send approximately ${cryptoAmount} ${chain.toUpperCase()} to complete the data purchase`,
        };
    }
    getSupportedBlockchains() {
        return (0, purchaseUtils_1.getSupportedBlockchains)();
    }
    getSupportedNetworks() {
        return (0, purchaseUtils_1.getSupportedNetworks)();
    }
    getSecurityLimits() {
        return (0, purchaseUtils_1.getSecurityLimits)().data;
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