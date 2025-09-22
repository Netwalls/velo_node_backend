import { Request, Response } from 'express';
import { AuthRequest } from '../types';
import { PriceFeedService } from '../services/priceFeedService';
import { ConversionService } from '../services/conversionService';
import { USDTService } from '../services/usdtService';

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
