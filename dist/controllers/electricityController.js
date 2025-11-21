"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.electricityController = exports.ElectricityController = exports.electricityPurchaseRateLimiter = void 0;
const electricityService_1 = require("../services/electricityService");
const ElectricityPurchase_1 = require("../entities/ElectricityPurchase");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
exports.electricityPurchaseRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 3, // Maximum 3 purchases per minute per IP
    message: {
        success: false,
        message: 'Too many purchase attempts. Please try again in a minute.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
class ElectricityController {
    /**
     * SECURE: Process electricity payment with rate limiting
     */
    async processElectricityPayment(req, res) {
        try {
            const { type, amount, chain, company, meterType, meterNumber, phoneNumber, transactionHash } = req.body;
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }
            // Validate required fields
            if (!amount || !chain || !company || !meterType || !meterNumber || !phoneNumber || !transactionHash) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields: amount, chain, company, meterType, meterNumber, phoneNumber, transactionHash'
                });
            }
            const result = await electricityService_1.electricityService.processElectricityPayment(userId, {
                type: type || 'electricity',
                amount: parseFloat(amount),
                chain,
                company,
                meterType,
                meterNumber,
                phoneNumber,
                transactionHash
            });
            res.json(result);
        }
        catch (error) {
            console.error('Electricity payment error:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to process electricity payment'
            });
        }
    }
    /**
     * Verify meter number before payment
     */
    /**
  * Verify meter number before payment
  */
    async verifyMeterNumber(req, res) {
        try {
            const { company, meterNumber } = req.query;
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }
            if (!company || !meterNumber) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required parameters: company, meterNumber'
                });
            }
            // Validate company
            if (!Object.values(ElectricityPurchase_1.ElectricityCompany).includes(company)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid company. Supported: ${Object.values(ElectricityPurchase_1.ElectricityCompany).join(', ')}`
                });
            }
            const result = await electricityService_1.electricityService.verifyMeterNumber(company, meterNumber);
            const customerName = result.customer_name || "Customer information not available";
            // FIXED: Return the service result directly instead of wrapping it
            res.json(result);
        }
        catch (error) {
            console.error('Meter verification error:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to verify meter number'
            });
        }
    }
    /**
     * Get expected crypto amount for display
     */
    async getExpectedAmount(req, res) {
        try {
            const { amount, chain } = req.query;
            const fiatAmount = parseFloat(amount);
            if (!amount || !chain) {
                return res.status(400).json({
                    success: false,
                    message: "Missing amount or chain parameters",
                });
            }
            const result = await electricityService_1.electricityService.getExpectedCryptoAmount(fiatAmount, chain);
            res.json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                message: error.message,
            });
        }
    }
    /**
     * Get user's electricity payment history
     */
    async getUserElectricityHistory(req, res) {
        try {
            const userId = req.user?.id;
            const limit = parseInt(req.query.limit) || 10;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: "Authentication required",
                });
            }
            const history = await electricityService_1.electricityService.getUserElectricityHistory(userId, limit);
            res.json({
                success: true,
                message: "Electricity history retrieved successfully",
                data: history.map(purchase => ({
                    id: purchase.id,
                    company: purchase.company,
                    companyCode: purchase.company_code,
                    meterType: purchase.meter_type,
                    meterNumber: purchase.meter_number,
                    amount: purchase.fiat_amount,
                    phoneNumber: purchase.phone_number,
                    status: purchase.status,
                    blockchain: purchase.blockchain,
                    cryptoAmount: purchase.crypto_amount,
                    cryptoCurrency: purchase.crypto_currency,
                    transactionHash: purchase.transaction_hash,
                    providerReference: purchase.provider_reference,
                    meterToken: purchase.meter_token,
                    createdAt: purchase.created_at,
                    updatedAt: purchase.updated_at
                }))
            });
        }
        catch (error) {
            console.error("Electricity history retrieval error:", error);
            res.status(500).json({
                success: false,
                message: error.message || "Failed to retrieve electricity history",
            });
        }
    }
    /**
     * Get supported options (blockchains, companies, meter types)
     */
    async getSupportedOptions(req, res) {
        try {
            const blockchains = electricityService_1.electricityService.getSupportedBlockchains();
            const companies = electricityService_1.electricityService.getSupportedCompanies();
            const meterTypes = electricityService_1.electricityService.getSupportedMeterTypes();
            res.json({
                success: true,
                message: "Supported options retrieved successfully",
                data: {
                    blockchains,
                    companies,
                    meterTypes,
                    currencies: ["NGN"],
                },
            });
        }
        catch (error) {
            console.error("Supported options retrieval error:", error);
            res.status(500).json({
                success: false,
                message: error.message || "Failed to retrieve supported options",
            });
        }
    }
    /**
     * Get specific electricity payment details
     */
    async getElectricityPayment(req, res) {
        try {
            const { purchaseId } = req.params;
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: "Authentication required",
                });
            }
            const history = await electricityService_1.electricityService.getUserElectricityHistory(userId, 100);
            const purchase = history.find((p) => p.id === purchaseId);
            if (!purchase) {
                return res.status(404).json({
                    success: false,
                    message: "Electricity payment not found",
                });
            }
            res.json({
                success: true,
                message: "Electricity payment retrieved successfully",
                data: {
                    id: purchase.id,
                    company: purchase.company,
                    companyCode: purchase.company_code,
                    meterType: purchase.meter_type,
                    meterTypeCode: purchase.meter_type_code,
                    meterNumber: purchase.meter_number,
                    amount: purchase.fiat_amount,
                    phoneNumber: purchase.phone_number,
                    status: purchase.status,
                    blockchain: purchase.blockchain,
                    cryptoAmount: purchase.crypto_amount,
                    cryptoCurrency: purchase.crypto_currency,
                    transactionHash: purchase.transaction_hash,
                    providerReference: purchase.provider_reference,
                    meterToken: purchase.meter_token,
                    metadata: purchase.metadata,
                    createdAt: purchase.created_at,
                    updatedAt: purchase.updated_at
                },
            });
        }
        catch (error) {
            console.error("Electricity payment retrieval error:", error);
            res.status(500).json({
                success: false,
                message: error.message || "Failed to retrieve electricity payment",
            });
        }
    }
    /**
     * Get user purchase statistics
     */
    async getUserPurchaseStats(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: "Authentication required",
                });
            }
            const stats = await electricityService_1.electricityService.getUserPurchaseStats(userId);
            res.json({
                success: true,
                message: "Purchase statistics retrieved successfully",
                data: stats,
            });
        }
        catch (error) {
            console.error("Purchase stats retrieval error:", error);
            res.status(500).json({
                success: false,
                message: error.message || "Failed to retrieve purchase statistics",
            });
        }
    }
    /**
     * Get security limits
     */
    async getSecurityLimits(req, res) {
        try {
            const limits = electricityService_1.electricityService.getSecurityLimits();
            res.json({
                success: true,
                message: "Security limits retrieved successfully",
                data: limits,
            });
        }
        catch (error) {
            console.error("Security limits retrieval error:", error);
            res.status(500).json({
                success: false,
                message: error.message || "Failed to retrieve security limits",
            });
        }
    }
}
exports.ElectricityController = ElectricityController;
exports.electricityController = new ElectricityController();
//# sourceMappingURL=electricityController.js.map