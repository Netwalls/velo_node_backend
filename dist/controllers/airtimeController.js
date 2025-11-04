"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.airtimeController = exports.AirtimeController = exports.purchaseRateLimiter = void 0;
const airtimeService_1 = require("../services/airtimeService");
const AirtimePurchase_1 = require("../entities/AirtimePurchase");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
exports.purchaseRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 3, // Maximum 3 purchases per minute per IP
    message: {
        success: false,
        message: 'Too many purchase attempts. Please try again in a minute.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
class AirtimeController {
    /**
     * SECURE: Process airtime purchase with rate limiting
     */
    async processAirtimePurchase(req, res) {
        try {
            const { type, amount, chain, phoneNumber, mobileNetwork, transactionHash } = req.body;
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }
            const result = await airtimeService_1.airtimeService.processAirtimePurchase(userId, {
                type,
                amount: parseFloat(amount),
                chain,
                phoneNumber,
                mobileNetwork,
                transactionHash
            });
            res.json(result);
        }
        catch (error) {
            console.error('Airtime purchase error:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to process airtime purchase'
            });
        }
    }
    /**
     * Get expected crypto amount for display (optional)
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
            const result = await airtimeService_1.airtimeService.getExpectedCryptoAmount(fiatAmount, chain);
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
     * Get user's airtime purchase history
     */
    async getUserAirtimeHistory(req, res) {
        try {
            const userId = req.user?.id;
            const limit = parseInt(req.query.limit) || 10;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: "Authentication required",
                });
            }
            const history = await airtimeService_1.airtimeService.getUserAirtimeHistory(userId, limit);
            res.json({
                success: true,
                message: "Airtime history retrieved successfully",
                data: history,
            });
        }
        catch (error) {
            console.error("Airtime history retrieval error:", error);
            res.status(500).json({
                success: false,
                message: error.message || "Failed to retrieve airtime history",
            });
        }
    }
    /**
     * Get supported blockchains and networks
     */
    async getSupportedOptions(req, res) {
        try {
            const blockchains = airtimeService_1.airtimeService.getSupportedBlockchains();
            res.json({
                success: true,
                message: "Supported options retrieved successfully",
                data: {
                    blockchains,
                    networks: Object.values(AirtimePurchase_1.MobileNetwork),
                    currencies: ["NGN"], // You can expand this later
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
     * Get specific airtime purchase details
     */
    async getAirtimePurchase(req, res) {
        try {
            const { purchaseId } = req.params;
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: "Authentication required",
                });
            }
            // Since we don't have a direct method, we'll get from history and filter
            const history = await airtimeService_1.airtimeService.getUserAirtimeHistory(userId, 50);
            const purchase = history.find((p) => p.id === purchaseId);
            if (!purchase) {
                return res.status(404).json({
                    success: false,
                    message: "Airtime purchase not found",
                });
            }
            res.json({
                success: true,
                message: "Airtime purchase retrieved successfully",
                data: purchase,
            });
        }
        catch (error) {
            console.error("Airtime purchase retrieval error:", error);
            res.status(500).json({
                success: false,
                message: error.message || "Failed to retrieve airtime purchase",
            });
        }
    }
}
exports.AirtimeController = AirtimeController;
exports.airtimeController = new AirtimeController();
//# sourceMappingURL=airtimeController.js.map