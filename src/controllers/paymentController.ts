import { Request, Response } from 'express';
import { AuthRequest } from '../types';
import { PriceFeedService } from '../services/priceFeedService';
import { ConversionService } from '../services/conversionService';
import { USDTService } from '../services/usdtService';
import NellobytesService from '../services/nellobytesService';
import crypto from 'crypto';
import { AppDataSource } from '../config/database';
import ProviderOrder, { ProviderOrderStatus } from '../entities/ProviderOrder';
import TreasuryConfig from '../config/treasury';
import axios from 'axios';

export class PaymentController {
    /**
     * Get current conversion rates for all supported currencies
     */
    static async getConversionRates(
        req: Request,
        res: Response
    ): Promise<void> {
        try {
            const rates = await PriceFeedService.getAllPrices();

            res.json({
                rates,
                timestamp: new Date(),
                baseCurrency: 'USD',
            });
        } catch (error) {
            console.error('Get conversion rates error:', error);
            res.status(500).json({ error: 'Failed to fetch conversion rates' });
        }
    }

    /**
     * Get conversion rate between two specific currencies
     */
    static async getSpecificRate(req: Request, res: Response): Promise<void> {
        try {
            const { from, to = 'USDT' } = req.query;

            if (!from) {
                res.status(400).json({ error: 'From currency is required' });
                return;
            }

            const rate = await PriceFeedService.getConversionRate(
                from as string,
                to as string
            );
            const calculation = await PriceFeedService.calculateConversion(
                1,
                from as string,
                to as string
            );

            res.json({
                from: (from as string).toUpperCase(),
                to: (to as string).toUpperCase(),
                rate,
                calculation,
                timestamp: new Date(),
            });
        } catch (error) {
            console.error('Get specific rate error:', error);
            res.status(500).json({ error: 'Failed to fetch exchange rate' });
        }
    }

    /**
     * Calculate conversion without executing it
     */
    static async calculateConversion(
        req: Request,
        res: Response
    ): Promise<void> {
        try {
            const { amount, fromCurrency, toCurrency = 'USDT' } = req.body;

            if (!amount || !fromCurrency) {
                res.status(400).json({
                    error: 'Amount and fromCurrency are required',
                });
                return;
            }

            if (isNaN(amount) || amount <= 0) {
                res.status(400).json({
                    error: 'Amount must be a positive number',
                });
                return;
            }

            const calculation = await PriceFeedService.calculateConversion(
                Number(amount),
                fromCurrency,
                toCurrency
            );

            res.json({
                input: {
                    amount: Number(amount),
                    currency: fromCurrency.toUpperCase(),
                },
                output: {
                    amount: calculation.outputAmount,
                    currency: toCurrency.toUpperCase(),
                },
                rate: calculation.rate,
                fee: calculation.fee,
                feeUSD: calculation.totalFeeUSD,
                slippage: calculation.slippage,
                timestamp: new Date(),
            });
        } catch (error) {
            console.error('Calculate conversion error:', error);
            res.status(500).json({ error: 'Failed to calculate conversion' });
        }
    }

    /**
     * Execute manual conversion to USDT
     */
    static async convertToUSDT(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const { amount, fromCurrency, fromAddress } = req.body;

            if (!amount || !fromCurrency) {
                res.status(400).json({
                    error: 'Amount and fromCurrency are required',
                });
                return;
            }

            if (isNaN(amount) || amount <= 0) {
                res.status(400).json({
                    error: 'Amount must be a positive number',
                });
                return;
            }

            // Execute conversion
            const conversion = await ConversionService.processManualConversion(
                userId,
                fromCurrency,
                'USDT',
                Number(amount),
                fromAddress
            );

            res.json({
                message: 'Conversion initiated successfully',
                conversion: {
                    id: conversion.id,
                    inputAmount: conversion.inputAmount,
                    outputAmount: conversion.outputAmount,
                    fromCurrency: conversion.fromCurrency,
                    toCurrency: conversion.toCurrency,
                    exchangeRate: conversion.exchangeRate,
                    fee: conversion.feeAmount,
                    status: conversion.status,
                    estimatedCompletion: '2-5 minutes',
                },
            });
        } catch (error) {
            console.error('Convert to USDT error:', error);
            res.status(500).json({
                error:
                    error instanceof Error
                        ? error.message
                        : 'Conversion failed',
            });
        }
    }

    /**
     * Get user's USDT balance from both database and blockchain
     */
    static async getUSDTBalance(
        req: AuthRequest,
        res: Response
    ): Promise<void> {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            // Get database balance (processed conversions)
            const databaseBalance = await ConversionService.getUSDTBalance(
                userId
            );

            // Get blockchain balance (actual USDT in wallets)
            const blockchainBalance =
                await USDTService.getUSDTBalanceFromBlockchain(userId);

            // Get USDT addresses
            const addresses = await USDTService.getUserUSDTAddresses(userId);

            res.json({
                balances: {
                    database: databaseBalance,
                    blockchain: blockchainBalance,
                    total: databaseBalance + blockchainBalance.total,
                },
                addresses,
                currency: 'USDT',
                timestamp: new Date(),
            });
        } catch (error) {
            console.error('Get USDT balance error:', error);
            res.status(500).json({ error: 'Failed to fetch USDT balance' });
        }
    }

    /**
     * Get conversion history for the user
     */
    static async getConversionHistory(
        req: AuthRequest,
        res: Response
    ): Promise<void> {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const { page = 1, limit = 20 } = req.query;

            const { conversions, total } =
                await ConversionService.getConversionHistory(
                    userId,
                    Number(page),
                    Number(limit)
                );

            res.json({
                conversions,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    totalPages: Math.ceil(total / Number(limit)),
                },
            });
        } catch (error) {
            console.error('Get conversion history error:', error);
            res.status(500).json({
                error: 'Failed to fetch conversion history',
            });
        }
    }

    /**
     * Cancel a pending conversion
     */
    static async cancelConversion(
        req: AuthRequest,
        res: Response
    ): Promise<void> {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const { id } = req.params;

            if (!id) {
                res.status(400).json({ error: 'Conversion ID is required' });
                return;
            }

            await ConversionService.cancelConversion(id, userId);

            res.json({
                message: 'Conversion cancelled successfully',
            });
        } catch (error) {
            console.error('Cancel conversion error:', error);
            res.status(500).json({
                error:
                    error instanceof Error
                        ? error.message
                        : 'Failed to cancel conversion',
            });
        }
    }

    /**
     * Buy airtime using Nellobytes
     * POST /api/payments/airtime
     */
    static async buyAirtime(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const { mobileNetwork, amount, mobileNumber, requestId } = req.body;

            if (!mobileNetwork || !amount || !mobileNumber) {
                res.status(400).json({ error: 'mobileNetwork, amount and mobileNumber are required' });
                return;
            }

            const rid = requestId || crypto.randomUUID();

            const providerResp = await NellobytesService.buyAirtime({
                MobileNetwork: mobileNetwork,
                Amount: amount,
                MobileNumber: mobileNumber,
                RequestID: rid,
            });

            res.json({
                message: 'Airtime request submitted',
                requestId: rid,
                provider: providerResp,
            });
        } catch (error) {
            console.error('Buy airtime error:', error);
            res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to buy airtime' });
        }
    }

    /**
     * Create a crypto-payable airtime order
     * POST /api/payments/airtime/crypto
     * body: { mobileNetwork, amountNGN, token }
     */
    static async createCryptoAirtimeOrder(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user?.id;
            // Accepts: mobileNetwork, amount (NGN-equivalent figure), chain (btc, eth...), mobileNumber, optional token
            const { mobileNetwork, amountNGN, amount, token, mobileNumber, chain } = req.body;
            const ngnAmount = amountNGN || amount;

            if (!mobileNetwork || !ngnAmount || !mobileNumber || !chain) {
                res.status(400).json({ error: 'mobileNetwork, amount (NGN), mobileNumber and chain are required' });
                return;
            }

            // Determine token to use. If token provided, use it, otherwise infer from chain (native asset)
            const chainTokenMap: Record<string, string> = {
                eth: 'ETH',
                btc: 'BTC',
                sol: 'SOL',
                xlm: 'XLM',
                dot: 'DOT',
            };
            const tokenUpper = (token as string)?.toUpperCase() || (chainTokenMap[(chain as string).toLowerCase()] || 'USDT');

            // Convert NGN -> USD. Try exchangerate.host first, fall back to internal PriceFeedService
            let usdAmount = 0;
            try {
                const convResp: any = await axios.get(`https://api.exchangerate.host/convert?from=NGN&to=USD&amount=${Number(amountNGN)}`);
                usdAmount = Number(convResp.data && convResp.data.result ? convResp.data.result : 0);
            } catch (err) {
                console.warn('exchangerate.host failed, falling back to PriceFeedService', err instanceof Error ? err.message : err);
                usdAmount = 0;
            }

            if (!usdAmount || usdAmount <= 0) {
                // Fallback: use internal price feed if available
                try {
                    const calc = await PriceFeedService.calculateConversion(Number(amountNGN), 'NGN', 'USD');
                    // calculateConversion returns { outputAmount, rate, ... }
                    if (calc && typeof calc.outputAmount === 'number') usdAmount = calc.outputAmount;
                } catch (err) {
                    console.error('PriceFeedService fallback failed', err instanceof Error ? err.message : err);
                }
            }

            if (!usdAmount || usdAmount <= 0) {
                res.status(500).json({ error: 'Failed to convert NGN to USD' });
                return;
            }

            // Get token price in USD
            const tokenPrice = await PriceFeedService.getPrice(tokenUpper);
            if (!tokenPrice || tokenPrice <= 0) {
                res.status(400).json({ error: `Unsupported token or failed to fetch price for ${token}` });
                return;
            }

            const slippage = 0.01; // 1% cushion
            const requiredTokenAmount = (usdAmount / tokenPrice) * (1 + slippage);

            const orderRepo = AppDataSource.getRepository(ProviderOrder);
            const order = orderRepo.create({
                userId,
                requestId: crypto.randomUUID(),
                mobileNetwork,
                mobileNumber,
                chain,
                amountNGN: Number(ngnAmount),
                token: tokenUpper,
                requiredTokenAmount,
                status: ProviderOrderStatus.CREATED,
            });

            await orderRepo.save(order);

            // Recommend treasury address for the token
            let treasuryAddress = '';
            try {
                const chainMap: Record<string, string> = { ETH: 'ethereum', BTC: 'bitcoin', SOL: 'solana', XLM: 'stellar', DOT: 'polkadot', USDT: 'ethereum' };
                const chain = chainMap[tokenUpper] || tokenUpper.toLowerCase();
                treasuryAddress = TreasuryConfig.getTreasuryWallet(chain, 'mainnet');
            } catch (e) {
                treasuryAddress = '';
            }

            res.json({
                message: 'Crypto airtime order created',
                orderId: order.id,
                requestId: order.requestId,
                requiredTokenAmount,
                token: tokenUpper,
                treasuryAddress,
            });
        } catch (error) {
            console.error('Create crypto order error:', error);
            res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create crypto order' });
        }
    }

    /**
     * Attach a tx hash to an order (manual flow)
     * POST /api/payments/orders/:orderId/attach-tx
     * body: { txHash, tokenAmount, fromAddress }
     */
    static async attachTxToOrder(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user?.id;
            const { orderId } = req.params;
            const { txHash, tokenAmount, fromAddress } = req.body;

            if (!orderId || !txHash || !tokenAmount) {
                res.status(400).json({ error: 'orderId, txHash and tokenAmount are required' });
                return;
            }

            const orderRepo = AppDataSource.getRepository(ProviderOrder);
            const order = await orderRepo.findOne({ where: { id: orderId } });
            if (!order) { res.status(404).json({ error: 'Order not found' }); return; }

            // Ensure the requester owns the order
            if (!userId || order.userId !== userId) {
                res.status(403).json({ error: 'Forbidden: order does not belong to user' });
                return;
            }

            if (order.status !== ProviderOrderStatus.CREATED && order.status !== ProviderOrderStatus.PENDING) {
                { res.status(400).json({ error: 'Order cannot accept payment in current status' }); return; }
            }

            // Basic check: compare provided tokenAmount to requiredTokenAmount
            const provided = Number(tokenAmount);
            if (isNaN(provided) || provided <= 0) { res.status(400).json({ error: 'Invalid tokenAmount' }); return; }

            // Convert the provided token amount to USDT (pegged to USD) using the price feed
            const token = order.token;
            let availableUSDT = 0;
            try {
                const convertCalc = await PriceFeedService.calculateConversion(Number(provided), token, 'USDT');
                availableUSDT = convertCalc.outputAmount;
            } catch (err) {
                console.warn('PriceFeedService conversion to USDT failed, falling back to direct price method', err instanceof Error ? err.message : err);
                // Fallback: value using single price lookup
                const tokenPriceUSD = await PriceFeedService.getPrice(token);
                if (!tokenPriceUSD || tokenPriceUSD <= 0) {
                    order.status = ProviderOrderStatus.FAILED;
                    await orderRepo.save(order);
                    res.status(400).json({ error: 'Failed to fetch token price for verification' });
                    return;
                }
                availableUSDT = Number(provided) * Number(tokenPriceUSD);
            }

            // Convert NGN order amount to USD again to compute required USD
            let requiredUSD = 0;
            try {
                const convResp: any = await axios.get(`https://api.exchangerate.host/convert?from=NGN&to=USD&amount=${Number(order.amountNGN)}`);
                requiredUSD = Number(convResp.data && convResp.data.result ? convResp.data.result : 0);
            } catch (err) {
                // fallback to open.er-api or PriceFeedService
                try {
                    const calc = await PriceFeedService.calculateConversion(Number(order.amountNGN), 'NGN', 'USDT');
                    if (calc && typeof calc.outputAmount === 'number') requiredUSD = calc.outputAmount;
                } catch (err2) {
                    console.error('Failed to compute required USD for order', err2 instanceof Error ? err2.message : err2);
                }
            }

            if (!requiredUSD || requiredUSD <= 0) {
                order.status = ProviderOrderStatus.FAILED;
                await orderRepo.save(order);
                res.status(400).json({ error: 'Failed to compute required USD amount for the order' });
                return;
            }

            // Allow small slippage: availableUSDT must be >= 99% of requiredUSD
            if (availableUSDT < requiredUSD * 0.99) {
                order.status = ProviderOrderStatus.FAILED;
                await orderRepo.save(order);
                res.status(400).json({ error: 'Converted amount insufficient to pay provider' });
                return;
            }

            // Mark as paid (in production you'd verify the tx on-chain)
            order.depositTxHash = txHash;
            order.status = ProviderOrderStatus.PAID;
            await orderRepo.save(order);

            // Execute provider purchase
            order.status = ProviderOrderStatus.PROCESSING;
            await orderRepo.save(order);

            const rid = order.requestId || crypto.randomUUID();
            // Use stored mobileNumber for the provider call
            const providerResp = await NellobytesService.buyAirtime({
                MobileNetwork: order.mobileNetwork,
                Amount: order.amountNGN,
                MobileNumber: (order as any).mobileNumber || '',
                RequestID: rid,
            } as any);

            order.providerResponse = providerResp;
            order.status = ProviderOrderStatus.COMPLETED;
            await orderRepo.save(order);

            res.json({ message: 'Order paid and processed', order });
        } catch (error) {
            console.error('Attach tx to order error:', error);
            res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to attach tx to order' });
        }
    }

    static async getOrder(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { orderId } = req.params;
            if (!orderId) { res.status(400).json({ error: 'orderId required' }); return; }
            const orderRepo = AppDataSource.getRepository(ProviderOrder);
            const order = await orderRepo.findOne({ where: { id: orderId } });
            if (!order) { res.status(404).json({ error: 'Order not found' }); return; }
            res.json({ order });
        } catch (error) {
            console.error('Get order error:', error);
            res.status(500).json({ error: 'Failed to fetch order' });
        }
    }

    /**
     * Buy databundle using Nellobytes
     * POST /api/payments/databundle
     */
    static async buyDatabundle(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const { mobileNetwork, dataPlan, mobileNumber, requestId } = req.body;

            if (!mobileNetwork || !dataPlan || !mobileNumber) {
                res.status(400).json({ error: 'mobileNetwork, dataPlan and mobileNumber are required' });
                return;
            }

            const rid = requestId || crypto.randomUUID();

            const providerResp = await NellobytesService.buyDatabundle({
                MobileNetwork: mobileNetwork,
                DataPlan: dataPlan,
                MobileNumber: mobileNumber,
                RequestID: rid,
            });

            res.json({ message: 'Databundle request submitted', requestId: rid, provider: providerResp });
        } catch (error) {
            console.error('Buy databundle error:', error);
            res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to buy databundle' });
        }
    }

    /**
     * Buy cable TV subscription using Nellobytes
     * POST /api/payments/cable
     */
    static async buyCable(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const params = req.body || {};
            // Expecting provider-specific fields: DecoderID, Network, Bouquet, Amount, RequestID
            if (!params.DecoderID || !params.Network || !params.Bouquet) {
                res.status(400).json({ error: 'DecoderID, Network and Bouquet are required' });
                return;
            }

            const rid = params.RequestID || crypto.randomUUID();
            params.RequestID = rid;

            const providerResp = await NellobytesService.buyCable(params);

            res.json({ message: 'Cable TV request submitted', requestId: rid, provider: providerResp });
        } catch (error) {
            console.error('Buy cable error:', error);
            res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to buy cable' });
        }
    }

    /**
     * Query a Nellobytes request by RequestID
     * GET /api/payments/nellobytes/query/:requestId
     */
    static async queryNellobytes(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const { requestId } = req.params;
            if (!requestId) {
                res.status(400).json({ error: 'requestId is required' });
                return;
            }

            const providerResp = await NellobytesService.queryStatus(requestId);
            res.json({ provider: providerResp });
        } catch (error) {
            console.error('Query Nellobytes error:', error);
            res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to query provider' });
        }
    }

    /**
     * Cancel a Nellobytes request by RequestID
     * POST /api/payments/nellobytes/cancel/:requestId
     */
    static async cancelNellobytes(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const { requestId } = req.params;
            if (!requestId) {
                res.status(400).json({ error: 'requestId is required' });
                return;
            }

            const providerResp = await NellobytesService.cancel(requestId);
            res.json({ provider: providerResp });
        } catch (error) {
            console.error('Cancel Nellobytes error:', error);
            res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to cancel provider request' });
        }
    }

    /**
     * Simulate payment detection (webhook endpoint)
     * In production, this would be called by blockchain monitoring services
     */
    static async simulatePaymentDetection(
        req: Request,
        res: Response
    ): Promise<void> {
        try {
            const { userId, currency, amount, fromAddress, txHash } = req.body;

            if (!userId || !currency || !amount || !fromAddress || !txHash) {
                res.status(400).json({
                    error: 'userId, currency, amount, fromAddress, and txHash are required',
                });
                return;
            }

            // Process automatic conversion
            const conversion =
                await ConversionService.processAutomaticConversion(
                    userId,
                    currency,
                    Number(amount),
                    fromAddress,
                    txHash
                );

            res.json({
                message: 'Payment detected and conversion initiated',
                conversion: {
                    id: conversion.id,
                    inputAmount: conversion.inputAmount,
                    outputAmount: conversion.outputAmount,
                    fromCurrency: conversion.fromCurrency,
                    toCurrency: conversion.toCurrency,
                    status: conversion.status,
                },
            });
        } catch (error) {
            console.error('Simulate payment detection error:', error);
            res.status(500).json({
                error: 'Failed to process payment detection',
            });
        }
    }
}
