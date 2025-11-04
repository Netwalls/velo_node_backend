"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dataController = exports.DataController = exports.dataPurchaseRateLimiter = void 0;
const dataService_1 = require("../services/dataService");
const DataPurchase_1 = require("../entities/DataPurchase");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
exports.dataPurchaseRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 3, // Maximum 3 purchases per minute per IP
    message: {
        success: false,
        message: 'Too many purchase attempts. Please try again in a minute.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
class DataController {
    /**
     * SECURE: Process data purchase with rate limiting
     * Payload includes amount for blockchain validation
     */
    async processDataPurchase(req, res) {
        try {
            const { type, dataplanId, amount, chain, phoneNumber, mobileNetwork, transactionHash } = req.body;
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }
            // Validate required fields
            if (!dataplanId || !amount || !chain || !phoneNumber || !mobileNetwork || !transactionHash) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields: dataplanId, amount, chain, phoneNumber, mobileNetwork, transactionHash'
                });
            }
            const result = await dataService_1.dataService.processDataPurchase(userId, {
                type: type || 'data',
                dataplanId,
                amount: parseFloat(amount),
                chain,
                phoneNumber,
                mobileNetwork,
                transactionHash
            });
            res.json(result);
        }
        catch (error) {
            console.error('Data purchase error:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to process data purchase'
            });
        }
    }
    /**
     * Get available data plans for a network
     */
    async getDataPlans(req, res) {
        try {
            const { network, refresh } = req.query;
            if (!network) {
                return res.status(400).json({
                    success: false,
                    message: 'Network parameter is required'
                });
            }
            // Validate network
            if (!Object.values(DataPurchase_1.MobileNetwork).includes(network)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid network. Supported: ${Object.values(DataPurchase_1.MobileNetwork).join(', ')}`
                });
            }
            // Force refresh if requested
            if (refresh === 'true') {
                await dataService_1.dataService.forceRefreshDataPlans();
            }
            const plans = await dataService_1.dataService.getDataPlans(network);
            res.json({
                success: true,
                message: 'Data plans retrieved successfully',
                data: {
                    network,
                    totalPlans: plans.length,
                    plans: plans.map(plan => ({
                        dataplanId: plan.dataplan_id,
                        name: plan.plan_name,
                        amount: plan.plan_amount,
                        validity: plan.month_validate,
                        networkCode: plan.plan_network
                    }))
                }
            });
        }
        catch (error) {
            console.error('Get data plans error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to retrieve data plans'
            });
        }
    }
    /**
     * Get expected crypto amount for a data plan
     */
    async getExpectedAmount(req, res) {
        try {
            const { dataplanId, network, chain } = req.query;
            if (!dataplanId || !network || !chain) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required parameters: dataplanId, network, chain'
                });
            }
            const result = await dataService_1.dataService.getExpectedCryptoAmount(dataplanId, network, chain);
            res.json({
                success: true,
                data: result
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
    /**
     * Get user's data purchase history
     */
    async getUserDataHistory(req, res) {
        try {
            const userId = req.user?.id;
            const limit = parseInt(req.query.limit) || 10;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }
            const history = await dataService_1.dataService.getUserDataHistory(userId, limit);
            res.json({
                success: true,
                message: 'Data purchase history retrieved successfully',
                data: history.map(purchase => ({
                    id: purchase.id,
                    network: purchase.network,
                    planName: purchase.plan_name,
                    dataplanId: purchase.dataplan_id,
                    amount: purchase.fiat_amount,
                    phoneNumber: purchase.phone_number,
                    status: purchase.status,
                    blockchain: purchase.blockchain,
                    cryptoAmount: purchase.crypto_amount,
                    cryptoCurrency: purchase.crypto_currency,
                    transactionHash: purchase.transaction_hash,
                    providerReference: purchase.provider_reference,
                    createdAt: purchase.created_at,
                    updatedAt: purchase.updated_at
                }))
            });
        }
        catch (error) {
            console.error('Data history retrieval error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to retrieve data purchase history'
            });
        }
    }
    /**
     * Get supported options (blockchains, networks)
     */
    async getSupportedOptions(req, res) {
        try {
            const blockchains = dataService_1.dataService.getSupportedBlockchains();
            const networks = dataService_1.dataService.getSupportedNetworks();
            res.json({
                success: true,
                message: 'Supported options retrieved successfully',
                data: {
                    blockchains,
                    networks,
                    currencies: ['NGN']
                }
            });
        }
        catch (error) {
            console.error('Supported options retrieval error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to retrieve supported options'
            });
        }
    }
    /**
     * Get specific data purchase details
     */
    async getDataPurchase(req, res) {
        try {
            const { purchaseId } = req.params;
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }
            const history = await dataService_1.dataService.getUserDataHistory(userId, 100);
            const purchase = history.find(p => p.id === purchaseId);
            if (!purchase) {
                return res.status(404).json({
                    success: false,
                    message: 'Data purchase not found'
                });
            }
            res.json({
                success: true,
                message: 'Data purchase retrieved successfully',
                data: {
                    id: purchase.id,
                    network: purchase.network,
                    planName: purchase.plan_name,
                    dataplanId: purchase.dataplan_id,
                    amount: purchase.fiat_amount,
                    phoneNumber: purchase.phone_number,
                    status: purchase.status,
                    blockchain: purchase.blockchain,
                    cryptoAmount: purchase.crypto_amount,
                    cryptoCurrency: purchase.crypto_currency,
                    transactionHash: purchase.transaction_hash,
                    providerReference: purchase.provider_reference,
                    metadata: purchase.metadata,
                    createdAt: purchase.created_at,
                    updatedAt: purchase.updated_at
                }
            });
        }
        catch (error) {
            console.error('Data purchase retrieval error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to retrieve data purchase'
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
                    message: 'Authentication required'
                });
            }
            const stats = await dataService_1.dataService.getUserPurchaseStats(userId);
            res.json({
                success: true,
                message: 'Purchase statistics retrieved successfully',
                data: stats
            });
        }
        catch (error) {
            console.error('Purchase stats retrieval error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to retrieve purchase statistics'
            });
        }
    }
    /**
     * Get security limits
     */
    async getSecurityLimits(req, res) {
        try {
            const limits = dataService_1.dataService.getSecurityLimits();
            res.json({
                success: true,
                message: 'Security limits retrieved successfully',
                data: limits
            });
        }
        catch (error) {
            console.error('Security limits retrieval error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to retrieve security limits'
            });
        }
    }
    /**
     * Refresh data plans cache
     */
    async refreshDataPlans(req, res) {
        try {
            await dataService_1.dataService.forceRefreshDataPlans();
            res.json({
                success: true,
                message: 'Data plans refreshed successfully'
            });
        }
        catch (error) {
            console.error('Data plans refresh error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to refresh data plans'
            });
        }
    }
}
exports.DataController = DataController;
exports.dataController = new DataController();
//# sourceMappingURL=dataController.js.map