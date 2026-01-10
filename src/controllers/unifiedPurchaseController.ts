
import { Request, Response } from "express";
import { airtimeService } from "../services/airtimeService";
import { dataService } from "../services/dataService";
import { electricityService } from "../services/electricityService";
import { MobileNetwork, Blockchain } from "../entities/AirtimePurchase";
import { ElectricityCompany, MeterType } from "../entities/ElectricityPurchase";
import {
    createPurchaseRateLimiter,
    getUserId,
    requireAuth,
    handleError,
    sendSuccess,
    validateRequiredFields,
    validateEnum,
    findInHistory
} from "../utils/controlllerHelper";

// Export rate limiters
export const purchaseRateLimiter = createPurchaseRateLimiter();

export class UnifiedPurchaseController {
    // ==================== AIRTIME ====================
    
    async processAirtimePurchase(req: Request, res: Response) {
        try {
            if (!requireAuth(req, res)) return;

            const { type, amount, chain, phoneNumber, mobileNetwork, transactionHash } = req.body;
            const userId = getUserId(req)!;

            const result = await airtimeService.processAirtimePurchase(userId, {
                type,
                amount: parseFloat(amount),
                chain,
                phoneNumber,
                mobileNetwork,
                transactionHash
            });

            res.json(result);
        } catch (error: any) {
            handleError(res, error, 'Failed to process airtime purchase');
        }
    }

    async getAirtimeExpectedAmount(req: Request, res: Response) {
        try {
            const { amount, chain } = req.query;

            if (!validateRequiredFields(req, res, ['amount', 'chain'])) return;

            const result = await airtimeService.getExpectedCryptoAmount(
                parseFloat(amount as string),
                chain as any
            );

            sendSuccess(res, 'Expected amount calculated', result);
        } catch (error: any) {
            handleError(res, error, 'Failed to calculate expected amount');
        }
    }

    async getUserAirtimeHistory(req: Request, res: Response) {
        try {
            if (!requireAuth(req, res)) return;

            const userId = getUserId(req)!;
            const limit = parseInt(req.query.limit as string) || 10;

            const history = await airtimeService.getUserAirtimeHistory(userId, limit);

            sendSuccess(res, 'Airtime history retrieved successfully', history);
        } catch (error: any) {
            handleError(res, error, 'Failed to retrieve airtime history', 500);
        }
    }

    async getAirtimeSupportedOptions(req: Request, res: Response) {
        try {
            const blockchains = airtimeService.getSupportedBlockchains();

            sendSuccess(res, 'Supported options retrieved successfully', {
                blockchains,
                networks: Object.values(MobileNetwork),
                currencies: ["NGN"]
            });
        } catch (error: any) {
            handleError(res, error, 'Failed to retrieve supported options', 500);
        }
    }

    async getAirtimePurchase(req: Request, res: Response) {
        try {
            if (!requireAuth(req, res)) return;

            const { purchaseId } = req.params;
            const purchaseIdStr = typeof purchaseId === 'string' ? purchaseId : purchaseId[0];
            const userId = getUserId(req)!;

            const purchase = await findInHistory(
                res,
                () => airtimeService.getUserAirtimeHistory(userId, 50),
                purchaseIdStr,
                'Airtime purchase'
            );

            if (!purchase) return;

            sendSuccess(res, 'Airtime purchase retrieved successfully', purchase);
        } catch (error: any) {
            handleError(res, error, 'Failed to retrieve airtime purchase', 500);
        }
    }

    // ==================== DATA ====================

    async processDataPurchase(req: Request, res: Response) {
        try {
            if (!requireAuth(req, res)) return;

            const requiredFields = ['dataplanId', 'amount', 'chain', 'phoneNumber', 'mobileNetwork', 'transactionHash'];
            if (!validateRequiredFields(req, res, requiredFields)) return;

            const { type, dataplanId, amount, chain, phoneNumber, mobileNetwork, transactionHash } = req.body;
            const userId = getUserId(req)!;

            const result = await dataService.processDataPurchase(userId, {
                type: type || 'data',
                dataplanId,
                amount: parseFloat(amount),
                chain,
                phoneNumber,
                mobileNetwork,
                transactionHash
            });

            res.json(result);
        } catch (error: any) {
            handleError(res, error, 'Failed to process data purchase');
        }
    }

    async getDataPlans(req: Request, res: Response) {
        try {
            const { network, refresh } = req.query;

            if (!network) {
                return res.status(400).json({
                    success: false,
                    message: 'Network parameter is required'
                });
            }

            if (!validateEnum(res, network, MobileNetwork, 'network')) return;

            if (refresh === 'true') {
                await dataService.forceRefreshDataPlans();
            }

            const plans = await dataService.getDataPlans(network as MobileNetwork);

            sendSuccess(res, 'Data plans retrieved successfully', {
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
        } catch (error: any) {
            handleError(res, error, 'Failed to retrieve data plans', 500);
        }
    }

    async getDataExpectedAmount(req: Request, res: Response) {
        try {
            if (!validateRequiredFields(req, res, ['dataplanId', 'network', 'chain'])) return;

            const { dataplanId, network, chain } = req.query;

            const result = await dataService.getExpectedCryptoAmount(
                dataplanId as string,
                network as MobileNetwork,
                chain as Blockchain
            );

            sendSuccess(res, 'Expected amount calculated', result);
        } catch (error: any) {
            handleError(res, error, 'Failed to calculate expected amount');
        }
    }

    async getUserDataHistory(req: Request, res: Response) {
        try {
            if (!requireAuth(req, res)) return;

            const userId = getUserId(req)!;
            const limit = parseInt(req.query.limit as string) || 10;

            const history = await dataService.getUserDataHistory(userId, limit);

            sendSuccess(res, 'Data purchase history retrieved successfully', 
                history.map(purchase => ({
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
            );
        } catch (error: any) {
            handleError(res, error, 'Failed to retrieve data purchase history', 500);
        }
    }

    async getDataSupportedOptions(req: Request, res: Response) {
        try {
            const blockchains = dataService.getSupportedBlockchains();
            const networks = dataService.getSupportedNetworks();

            sendSuccess(res, 'Supported options retrieved successfully', {
                blockchains,
                networks,
                currencies: ['NGN']
            });
        } catch (error: any) {
            handleError(res, error, 'Failed to retrieve supported options', 500);
        }
    }

    async getDataPurchase(req: Request, res: Response) {
        try {
            if (!requireAuth(req, res)) return;

            const { purchaseId } = req.params;
            const userId = getUserId(req)!;

            const history = await dataService.getUserDataHistory(userId, 100);
            const purchase = history.find(p => p.id === purchaseId);

            if (!purchase) {
                return res.status(404).json({
                    success: false,
                    message: 'Data purchase not found'
                });
            }

            sendSuccess(res, 'Data purchase retrieved successfully', {
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
        } catch (error: any) {
            handleError(res, error, 'Failed to retrieve data purchase', 500);
        }
    }

    async getDataPurchaseStats(req: Request, res: Response) {
        try {
            if (!requireAuth(req, res)) return;

            const userId = getUserId(req)!;
            const stats = await dataService.getUserPurchaseStats(userId);

            sendSuccess(res, 'Purchase statistics retrieved successfully', stats);
        } catch (error: any) {
            handleError(res, error, 'Failed to retrieve purchase statistics', 500);
        }
    }

    async getDataSecurityLimits(req: Request, res: Response) {
        try {
            const limits = dataService.getSecurityLimits();
            sendSuccess(res, 'Security limits retrieved successfully', limits);
        } catch (error: any) {
            handleError(res, error, 'Failed to retrieve security limits', 500);
        }
    }

    async refreshDataPlans(req: Request, res: Response) {
        try {
            await dataService.forceRefreshDataPlans();
            sendSuccess(res, 'Data plans refreshed successfully');
        } catch (error: any) {
            handleError(res, error, 'Failed to refresh data plans', 500);
        }
    }

    // ==================== ELECTRICITY ====================

    async processElectricityPayment(req: Request, res: Response) {
        try {
            if (!requireAuth(req, res)) return;

            const requiredFields = ['amount', 'chain', 'company', 'meterType', 'meterNumber', 'phoneNumber', 'transactionHash'];
            if (!validateRequiredFields(req, res, requiredFields)) return;

            const { type, amount, chain, company, meterType, meterNumber, phoneNumber, transactionHash } = req.body;
            const userId = getUserId(req)!;

            const result = await electricityService.processElectricityPayment(userId, {
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
        } catch (error: any) {
            handleError(res, error, 'Failed to process electricity payment');
        }
    }

    async verifyMeterNumber(req: Request, res: Response) {
        try {
            if (!requireAuth(req, res)) return;

            if (!validateRequiredFields(req, res, ['company', 'meterNumber'])) return;

            const { company, meterNumber } = req.query;

            if (!validateEnum(res, company, ElectricityCompany, 'company')) return;

            const result = await electricityService.verifyMeterNumber(
                company as ElectricityCompany,
                meterNumber as string
            );

            res.json(result);
        } catch (error: any) {
            handleError(res, error, 'Failed to verify meter number');
        }
    }

    async getElectricityExpectedAmount(req: Request, res: Response) {
        try {
            if (!validateRequiredFields(req, res, ['amount', 'chain'])) return;

            const { amount, chain } = req.query;

            const result = await electricityService.getExpectedCryptoAmount(
                parseFloat(amount as string),
                chain as Blockchain
            );

            sendSuccess(res, 'Expected amount calculated', result);
        } catch (error: any) {
            handleError(res, error, 'Failed to calculate expected amount');
        }
    }

    async getUserElectricityHistory(req: Request, res: Response) {
        try {
            if (!requireAuth(req, res)) return;

            const userId = getUserId(req)!;
            const limit = parseInt(req.query.limit as string) || 10;

            const history = await electricityService.getUserElectricityHistory(userId, limit);

            sendSuccess(res, 'Electricity history retrieved successfully',
                history.map(purchase => ({
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
            );
        } catch (error: any) {
            handleError(res, error, 'Failed to retrieve electricity history', 500);
        }
    }

    async getElectricitySupportedOptions(req: Request, res: Response) {
        try {
            const blockchains = electricityService.getSupportedBlockchains();
            const companies = electricityService.getSupportedCompanies();
            const meterTypes = electricityService.getSupportedMeterTypes();

            sendSuccess(res, 'Supported options retrieved successfully', {
                blockchains,
                companies,
                meterTypes,
                currencies: ['NGN']
            });
        } catch (error: any) {
            handleError(res, error, 'Failed to retrieve supported options', 500);
        }
    }

    async getElectricityPayment(req: Request, res: Response) {
        try {
            if (!requireAuth(req, res)) return;

            const { purchaseId } = req.params;
            const userId = getUserId(req)!;

            const history = await electricityService.getUserElectricityHistory(userId, 100);
            const purchase = history.find(p => p.id === purchaseId);

            if (!purchase) {
                return res.status(404).json({
                    success: false,
                    message: 'Electricity payment not found'
                });
            }

            sendSuccess(res, 'Electricity payment retrieved successfully', {
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
        } catch (error: any) {
            handleError(res, error, 'Failed to retrieve electricity payment', 500);
        }
    }

    async getElectricityPurchaseStats(req: Request, res: Response) {
        try {
            if (!requireAuth(req, res)) return;

            const userId = getUserId(req)!;
            const stats = await electricityService.getUserPurchaseStats(userId);

            sendSuccess(res, 'Purchase statistics retrieved successfully', stats);
        } catch (error: any) {
            handleError(res, error, 'Failed to retrieve purchase statistics', 500);
        }
    }

    async getElectricitySecurityLimits(req: Request, res: Response) {
        try {
            const limits = electricityService.getSecurityLimits();
            sendSuccess(res, 'Security limits retrieved successfully', limits);
        } catch (error: any) {
            handleError(res, error, 'Failed to retrieve security limits', 500);
        }
    }
}

export const unifiedPurchaseController = new UnifiedPurchaseController();