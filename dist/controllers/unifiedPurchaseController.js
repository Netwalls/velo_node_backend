"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unifiedPurchaseController = exports.UnifiedPurchaseController = exports.purchaseRateLimiter = void 0;
const airtimeService_1 = require("../services/airtimeService");
const dataService_1 = require("../services/dataService");
const electricityService_1 = require("../services/electricityService");
const AirtimePurchase_1 = require("../entities/AirtimePurchase");
const ElectricityPurchase_1 = require("../entities/ElectricityPurchase");
const controlllerHelper_1 = require("../utils/controlllerHelper");
// Export rate limiters
exports.purchaseRateLimiter = (0, controlllerHelper_1.createPurchaseRateLimiter)();
class UnifiedPurchaseController {
    // ==================== AIRTIME ====================
    async processAirtimePurchase(req, res) {
        try {
            if (!(0, controlllerHelper_1.requireAuth)(req, res))
                return;
            const { type, amount, chain, phoneNumber, mobileNetwork, transactionHash } = req.body;
            const userId = (0, controlllerHelper_1.getUserId)(req);
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
            (0, controlllerHelper_1.handleError)(res, error, 'Failed to process airtime purchase');
        }
    }
    async getAirtimeExpectedAmount(req, res) {
        try {
            const { amount, chain } = req.query;
            if (!(0, controlllerHelper_1.validateRequiredFields)(req, res, ['amount', 'chain']))
                return;
            const result = await airtimeService_1.airtimeService.getExpectedCryptoAmount(parseFloat(amount), chain);
            (0, controlllerHelper_1.sendSuccess)(res, 'Expected amount calculated', result);
        }
        catch (error) {
            (0, controlllerHelper_1.handleError)(res, error, 'Failed to calculate expected amount');
        }
    }
    async getUserAirtimeHistory(req, res) {
        try {
            if (!(0, controlllerHelper_1.requireAuth)(req, res))
                return;
            const userId = (0, controlllerHelper_1.getUserId)(req);
            const limit = parseInt(req.query.limit) || 10;
            const history = await airtimeService_1.airtimeService.getUserAirtimeHistory(userId, limit);
            (0, controlllerHelper_1.sendSuccess)(res, 'Airtime history retrieved successfully', history);
        }
        catch (error) {
            (0, controlllerHelper_1.handleError)(res, error, 'Failed to retrieve airtime history', 500);
        }
    }
    async getAirtimeSupportedOptions(req, res) {
        try {
            const blockchains = airtimeService_1.airtimeService.getSupportedBlockchains();
            (0, controlllerHelper_1.sendSuccess)(res, 'Supported options retrieved successfully', {
                blockchains,
                networks: Object.values(AirtimePurchase_1.MobileNetwork),
                currencies: ["NGN"]
            });
        }
        catch (error) {
            (0, controlllerHelper_1.handleError)(res, error, 'Failed to retrieve supported options', 500);
        }
    }
    async getAirtimePurchase(req, res) {
        try {
            if (!(0, controlllerHelper_1.requireAuth)(req, res))
                return;
            const { purchaseId } = req.params;
            const purchaseIdStr = typeof purchaseId === 'string' ? purchaseId : purchaseId[0];
            const userId = (0, controlllerHelper_1.getUserId)(req);
            const purchase = await (0, controlllerHelper_1.findInHistory)(res, () => airtimeService_1.airtimeService.getUserAirtimeHistory(userId, 50), purchaseIdStr, 'Airtime purchase');
            if (!purchase)
                return;
            (0, controlllerHelper_1.sendSuccess)(res, 'Airtime purchase retrieved successfully', purchase);
        }
        catch (error) {
            (0, controlllerHelper_1.handleError)(res, error, 'Failed to retrieve airtime purchase', 500);
        }
    }
    // ==================== DATA ====================
    async processDataPurchase(req, res) {
        try {
            if (!(0, controlllerHelper_1.requireAuth)(req, res))
                return;
            const requiredFields = ['dataplanId', 'amount', 'chain', 'phoneNumber', 'mobileNetwork', 'transactionHash'];
            if (!(0, controlllerHelper_1.validateRequiredFields)(req, res, requiredFields))
                return;
            const { type, dataplanId, amount, chain, phoneNumber, mobileNetwork, transactionHash } = req.body;
            const userId = (0, controlllerHelper_1.getUserId)(req);
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
            (0, controlllerHelper_1.handleError)(res, error, 'Failed to process data purchase');
        }
    }
    async getDataPlans(req, res) {
        try {
            const { network, refresh } = req.query;
            if (!network) {
                return res.status(400).json({
                    success: false,
                    message: 'Network parameter is required'
                });
            }
            if (!(0, controlllerHelper_1.validateEnum)(res, network, AirtimePurchase_1.MobileNetwork, 'network'))
                return;
            if (refresh === 'true') {
                await dataService_1.dataService.forceRefreshDataPlans();
            }
            const plans = await dataService_1.dataService.getDataPlans(network);
            (0, controlllerHelper_1.sendSuccess)(res, 'Data plans retrieved successfully', {
                network,
                totalPlans: plans.length,
                plans: plans.map(plan => ({
                    dataplanId: plan.dataplan_id,
                    name: plan.plan_name,
                    amount: plan.plan_amount,
                    validity: plan.month_validate,
                    networkCode: plan.plan_network
                }))
            });
        }
        catch (error) {
            (0, controlllerHelper_1.handleError)(res, error, 'Failed to retrieve data plans', 500);
        }
    }
    async getDataExpectedAmount(req, res) {
        try {
            if (!(0, controlllerHelper_1.validateRequiredFields)(req, res, ['dataplanId', 'network', 'chain']))
                return;
            const { dataplanId, network, chain } = req.query;
            const result = await dataService_1.dataService.getExpectedCryptoAmount(dataplanId, network, chain);
            (0, controlllerHelper_1.sendSuccess)(res, 'Expected amount calculated', result);
        }
        catch (error) {
            (0, controlllerHelper_1.handleError)(res, error, 'Failed to calculate expected amount');
        }
    }
    async getUserDataHistory(req, res) {
        try {
            if (!(0, controlllerHelper_1.requireAuth)(req, res))
                return;
            const userId = (0, controlllerHelper_1.getUserId)(req);
            const limit = parseInt(req.query.limit) || 10;
            const history = await dataService_1.dataService.getUserDataHistory(userId, limit);
            (0, controlllerHelper_1.sendSuccess)(res, 'Data purchase history retrieved successfully', history.map(purchase => ({
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
            })));
        }
        catch (error) {
            (0, controlllerHelper_1.handleError)(res, error, 'Failed to retrieve data purchase history', 500);
        }
    }
    async getDataSupportedOptions(req, res) {
        try {
            const blockchains = dataService_1.dataService.getSupportedBlockchains();
            const networks = dataService_1.dataService.getSupportedNetworks();
            (0, controlllerHelper_1.sendSuccess)(res, 'Supported options retrieved successfully', {
                blockchains,
                networks,
                currencies: ['NGN']
            });
        }
        catch (error) {
            (0, controlllerHelper_1.handleError)(res, error, 'Failed to retrieve supported options', 500);
        }
    }
    async getDataPurchase(req, res) {
        try {
            if (!(0, controlllerHelper_1.requireAuth)(req, res))
                return;
            const { purchaseId } = req.params;
            const userId = (0, controlllerHelper_1.getUserId)(req);
            const history = await dataService_1.dataService.getUserDataHistory(userId, 100);
            const purchase = history.find(p => p.id === purchaseId);
            if (!purchase) {
                return res.status(404).json({
                    success: false,
                    message: 'Data purchase not found'
                });
            }
            (0, controlllerHelper_1.sendSuccess)(res, 'Data purchase retrieved successfully', {
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
            });
        }
        catch (error) {
            (0, controlllerHelper_1.handleError)(res, error, 'Failed to retrieve data purchase', 500);
        }
    }
    async getDataPurchaseStats(req, res) {
        try {
            if (!(0, controlllerHelper_1.requireAuth)(req, res))
                return;
            const userId = (0, controlllerHelper_1.getUserId)(req);
            const stats = await dataService_1.dataService.getUserPurchaseStats(userId);
            (0, controlllerHelper_1.sendSuccess)(res, 'Purchase statistics retrieved successfully', stats);
        }
        catch (error) {
            (0, controlllerHelper_1.handleError)(res, error, 'Failed to retrieve purchase statistics', 500);
        }
    }
    async getDataSecurityLimits(req, res) {
        try {
            const limits = dataService_1.dataService.getSecurityLimits();
            (0, controlllerHelper_1.sendSuccess)(res, 'Security limits retrieved successfully', limits);
        }
        catch (error) {
            (0, controlllerHelper_1.handleError)(res, error, 'Failed to retrieve security limits', 500);
        }
    }
    async refreshDataPlans(req, res) {
        try {
            await dataService_1.dataService.forceRefreshDataPlans();
            (0, controlllerHelper_1.sendSuccess)(res, 'Data plans refreshed successfully');
        }
        catch (error) {
            (0, controlllerHelper_1.handleError)(res, error, 'Failed to refresh data plans', 500);
        }
    }
    // ==================== ELECTRICITY ====================
    async processElectricityPayment(req, res) {
        try {
            if (!(0, controlllerHelper_1.requireAuth)(req, res))
                return;
            const requiredFields = ['amount', 'chain', 'company', 'meterType', 'meterNumber', 'phoneNumber', 'transactionHash'];
            if (!(0, controlllerHelper_1.validateRequiredFields)(req, res, requiredFields))
                return;
            const { type, amount, chain, company, meterType, meterNumber, phoneNumber, transactionHash } = req.body;
            const userId = (0, controlllerHelper_1.getUserId)(req);
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
            (0, controlllerHelper_1.handleError)(res, error, 'Failed to process electricity payment');
        }
    }
    async verifyMeterNumber(req, res) {
        try {
            if (!(0, controlllerHelper_1.requireAuth)(req, res))
                return;
            if (!(0, controlllerHelper_1.validateRequiredFields)(req, res, ['company', 'meterNumber']))
                return;
            const { company, meterNumber } = req.query;
            if (!(0, controlllerHelper_1.validateEnum)(res, company, ElectricityPurchase_1.ElectricityCompany, 'company'))
                return;
            const result = await electricityService_1.electricityService.verifyMeterNumber(company, meterNumber);
            res.json(result);
        }
        catch (error) {
            (0, controlllerHelper_1.handleError)(res, error, 'Failed to verify meter number');
        }
    }
    async getElectricityExpectedAmount(req, res) {
        try {
            if (!(0, controlllerHelper_1.validateRequiredFields)(req, res, ['amount', 'chain']))
                return;
            const { amount, chain } = req.query;
            const result = await electricityService_1.electricityService.getExpectedCryptoAmount(parseFloat(amount), chain);
            (0, controlllerHelper_1.sendSuccess)(res, 'Expected amount calculated', result);
        }
        catch (error) {
            (0, controlllerHelper_1.handleError)(res, error, 'Failed to calculate expected amount');
        }
    }
    async getUserElectricityHistory(req, res) {
        try {
            if (!(0, controlllerHelper_1.requireAuth)(req, res))
                return;
            const userId = (0, controlllerHelper_1.getUserId)(req);
            const limit = parseInt(req.query.limit) || 10;
            const history = await electricityService_1.electricityService.getUserElectricityHistory(userId, limit);
            (0, controlllerHelper_1.sendSuccess)(res, 'Electricity history retrieved successfully', history.map(purchase => ({
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
            })));
        }
        catch (error) {
            (0, controlllerHelper_1.handleError)(res, error, 'Failed to retrieve electricity history', 500);
        }
    }
    async getElectricitySupportedOptions(req, res) {
        try {
            const blockchains = electricityService_1.electricityService.getSupportedBlockchains();
            const companies = electricityService_1.electricityService.getSupportedCompanies();
            const meterTypes = electricityService_1.electricityService.getSupportedMeterTypes();
            (0, controlllerHelper_1.sendSuccess)(res, 'Supported options retrieved successfully', {
                blockchains,
                companies,
                meterTypes,
                currencies: ['NGN']
            });
        }
        catch (error) {
            (0, controlllerHelper_1.handleError)(res, error, 'Failed to retrieve supported options', 500);
        }
    }
    async getElectricityPayment(req, res) {
        try {
            if (!(0, controlllerHelper_1.requireAuth)(req, res))
                return;
            const { purchaseId } = req.params;
            const userId = (0, controlllerHelper_1.getUserId)(req);
            const history = await electricityService_1.electricityService.getUserElectricityHistory(userId, 100);
            const purchase = history.find(p => p.id === purchaseId);
            if (!purchase) {
                return res.status(404).json({
                    success: false,
                    message: 'Electricity payment not found'
                });
            }
            (0, controlllerHelper_1.sendSuccess)(res, 'Electricity payment retrieved successfully', {
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
            });
        }
        catch (error) {
            (0, controlllerHelper_1.handleError)(res, error, 'Failed to retrieve electricity payment', 500);
        }
    }
    async getElectricityPurchaseStats(req, res) {
        try {
            if (!(0, controlllerHelper_1.requireAuth)(req, res))
                return;
            const userId = (0, controlllerHelper_1.getUserId)(req);
            const stats = await electricityService_1.electricityService.getUserPurchaseStats(userId);
            (0, controlllerHelper_1.sendSuccess)(res, 'Purchase statistics retrieved successfully', stats);
        }
        catch (error) {
            (0, controlllerHelper_1.handleError)(res, error, 'Failed to retrieve purchase statistics', 500);
        }
    }
    async getElectricitySecurityLimits(req, res) {
        try {
            const limits = electricityService_1.electricityService.getSecurityLimits();
            (0, controlllerHelper_1.sendSuccess)(res, 'Security limits retrieved successfully', limits);
        }
        catch (error) {
            (0, controlllerHelper_1.handleError)(res, error, 'Failed to retrieve security limits', 500);
        }
    }
}
exports.UnifiedPurchaseController = UnifiedPurchaseController;
exports.unifiedPurchaseController = new UnifiedPurchaseController();
//# sourceMappingURL=unifiedPurchaseController.js.map