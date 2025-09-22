import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import {
    Conversion,
    ConversionStatus,
    ConversionType,
} from '../entities/Conversion';
import { PriceFeedService } from './priceFeedService';
import { NotificationService } from './notificationService';
import { NotificationType } from '../types';
import { USDTService } from './usdtService';

export class ConversionService {
    /**
     * Process manual conversion request
     */
    static async processManualConversion(
        userId: string,
        fromCurrency: string,
        toCurrency: string,
        amount: number,
        fromAddress?: string
    ): Promise<Conversion> {
        const userRepo = AppDataSource.getRepository(User);
        const conversionRepo = AppDataSource.getRepository(Conversion);

        try {
            // Get user
            const user = await userRepo.findOne({ where: { id: userId } });
            if (!user) {
                throw new Error('User not found');
            }

            // Calculate conversion
            const conversionCalc = await PriceFeedService.calculateConversion(
                amount,
                fromCurrency,
                toCurrency
            );

            // Create conversion record
            const conversion = conversionRepo.create({
                userId,
                fromCurrency: fromCurrency.toUpperCase(),
                toCurrency: toCurrency.toUpperCase(),
                inputAmount: amount,
                outputAmount: conversionCalc.outputAmount,
                exchangeRate: conversionCalc.rate,
                feeAmount: conversionCalc.fee,
                feeUSD: conversionCalc.totalFeeUSD,
                slippage: conversionCalc.slippage,
                status: ConversionStatus.PROCESSING,
                type: ConversionType.MANUAL,
                fromAddress,
                metadata: {
                    requestTime: new Date(),
                    priceAtTime: conversionCalc.rate,
                },
            });

            await conversionRepo.save(conversion);

            // Simulate conversion processing (in real implementation, this would call DEX APIs)
            await this.executeConversion(conversion);

            return conversion;
        } catch (error) {
            console.error('Manual conversion failed:', error);
            throw error;
        }
    }

    /**
     * Process automatic conversion (triggered by incoming payments)
     */
    static async processAutomaticConversion(
        userId: string,
        fromCurrency: string,
        amount: number,
        fromAddress: string,
        txHash: string
    ): Promise<Conversion> {
        const userRepo = AppDataSource.getRepository(User);
        const conversionRepo = AppDataSource.getRepository(Conversion);

        try {
            // Get user
            const user = await userRepo.findOne({ where: { id: userId } });
            if (!user) {
                throw new Error('User not found');
            }

            // Calculate conversion to USDT
            const conversionCalc = await PriceFeedService.calculateConversion(
                amount,
                fromCurrency,
                'USDT'
            );

            // Create conversion record
            const conversion = conversionRepo.create({
                userId,
                fromCurrency: fromCurrency.toUpperCase(),
                toCurrency: 'USDT',
                inputAmount: amount,
                outputAmount: conversionCalc.outputAmount,
                exchangeRate: conversionCalc.rate,
                feeAmount: conversionCalc.fee,
                feeUSD: conversionCalc.totalFeeUSD,
                slippage: conversionCalc.slippage,
                status: ConversionStatus.PROCESSING,
                type: ConversionType.AUTOMATIC,
                fromAddress,
                txHashFrom: txHash,
                metadata: {
                    detectedTime: new Date(),
                    priceAtTime: conversionCalc.rate,
                    originalTxHash: txHash,
                },
            });

            await conversionRepo.save(conversion);

            // Execute conversion
            await this.executeConversion(conversion);

            return conversion;
        } catch (error) {
            console.error('Automatic conversion failed:', error);
            throw error;
        }
    }

    /**
     * Execute the actual conversion (simulate DEX interaction)
     */
    private static async executeConversion(
        conversion: Conversion
    ): Promise<void> {
        const conversionRepo = AppDataSource.getRepository(Conversion);
        const userRepo = AppDataSource.getRepository(User);

        try {
            // Simulate processing delay
            await new Promise((resolve) => setTimeout(resolve, 2000));

            // In a real implementation, this would:
            // 1. Call DEX APIs (Uniswap, 1inch, Jupiter, etc.)
            // 2. Execute the swap transaction
            // 3. Wait for confirmation
            // 4. Transfer USDT to user's address

            const user = await userRepo.findOne({
                where: { id: conversion.userId },
            });
            if (!user) {
                throw new Error('User not found during conversion');
            }

            // Transfer USDT to user's address
            const transferResult = await USDTService.transferUSDTToUser(
                conversion.userId,
                Number(conversion.outputAmount),
                'erc20' // Default to ERC-20 USDT
            );

            if (!transferResult.success) {
                // If transfer fails, mark conversion as failed
                conversion.status = ConversionStatus.FAILED;
                await conversionRepo.save(conversion);

                throw new Error('Failed to transfer USDT to user address');
            }

            // Update conversion status with transfer details
            conversion.status = ConversionStatus.COMPLETED;
            conversion.completedAt = new Date();
            conversion.txHashTo =
                transferResult.txHash ||
                `0x${Math.random().toString(16).substr(2, 64)}`;
            conversion.dexUsed = this.getSimulatedDEX(conversion.fromCurrency);
            conversion.toAddress = transferResult.address;

            await conversionRepo.save(conversion);

            console.log(
                `[CONVERSION] Successfully transferred ${conversion.outputAmount} USDT to ${transferResult.address}`
            );
            console.log(
                `[CONVERSION] Transaction hash: ${transferResult.txHash}`
            );

            // Create notification
            await NotificationService.createNotification(
                conversion.userId,
                NotificationType.CONVERSION_COMPLETED,
                'Conversion Completed',
                `Successfully converted ${conversion.inputAmount} ${
                    conversion.fromCurrency
                } to ${conversion.outputAmount.toFixed(
                    4
                )} USDT and transferred to your wallet`,
                {
                    conversionId: conversion.id,
                    inputAmount: conversion.inputAmount,
                    outputAmount: conversion.outputAmount,
                    fromCurrency: conversion.fromCurrency,
                    toCurrency: conversion.toCurrency,
                    rate: conversion.exchangeRate,
                    fee: conversion.feeAmount,
                    transferHash: transferResult.txHash,
                    walletAddress: transferResult.address,
                }
            );

            console.log(
                `[ConversionService] Completed conversion ${conversion.id}: ${conversion.inputAmount} ${conversion.fromCurrency} → ${conversion.outputAmount} ${conversion.toCurrency}`
            );
        } catch (error) {
            // Mark conversion as failed
            conversion.status = ConversionStatus.FAILED;
            conversion.errorMessage =
                error instanceof Error ? error.message : 'Unknown error';
            await conversionRepo.save(conversion);

            // Create failure notification
            await NotificationService.notifySecurityAlert(
                conversion.userId,
                `Conversion failed: ${conversion.errorMessage}`,
                {
                    conversionId: conversion.id,
                    error: conversion.errorMessage,
                }
            );

            throw error;
        }
    }

    /**
     * Get conversion history for a user
     */
    static async getConversionHistory(
        userId: string,
        page: number = 1,
        limit: number = 20
    ): Promise<{ conversions: Conversion[]; total: number }> {
        const conversionRepo = AppDataSource.getRepository(Conversion);

        const [conversions, total] = await conversionRepo.findAndCount({
            where: { userId },
            order: { createdAt: 'DESC' },
            take: limit,
            skip: (page - 1) * limit,
        });

        return { conversions, total };
    }

    /**
     * Get user's USDT balance
     */
    static async getUSDTBalance(userId: string): Promise<number> {
        const userRepo = AppDataSource.getRepository(User);
        const user = await userRepo.findOne({ where: { id: userId } });

        if (!user) {
            throw new Error('User not found');
        }

        return Number(user.usdtBalance) || 0;
    }

    /**
     * Simulate DEX selection based on currency
     */
    private static getSimulatedDEX(currency: string): string {
        const dexMap: Record<string, string> = {
            ETH: 'Uniswap V3',
            BTC: 'thorchain',
            SOL: 'Jupiter',
            STRK: '10KSwap',
        };
        return dexMap[currency] || 'Generic DEX';
    }

    /**
     * Cancel a pending conversion
     */
    static async cancelConversion(
        conversionId: string,
        userId: string
    ): Promise<void> {
        const conversionRepo = AppDataSource.getRepository(Conversion);

        const conversion = await conversionRepo.findOne({
            where: { id: conversionId, userId },
        });

        if (!conversion) {
            throw new Error('Conversion not found');
        }

        if (conversion.status !== ConversionStatus.PENDING) {
            throw new Error('Can only cancel pending conversions');
        }

        conversion.status = ConversionStatus.CANCELLED;
        await conversionRepo.save(conversion);
    }
}
