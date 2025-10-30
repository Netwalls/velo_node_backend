"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversionService = void 0;
const database_1 = require("../config/database");
const User_1 = require("../entities/User");
const Conversion_1 = require("../entities/Conversion");
const priceFeedService_1 = require("./priceFeedService");
const notificationService_1 = require("./notificationService");
const types_1 = require("../types");
const usdtService_1 = require("./usdtService");
class ConversionService {
    /**
     * Process manual conversion request
     */
    static async processManualConversion(userId, fromCurrency, toCurrency, amount, fromAddress) {
        const userRepo = database_1.AppDataSource.getRepository(User_1.User);
        const conversionRepo = database_1.AppDataSource.getRepository(Conversion_1.Conversion);
        try {
            // Get user
            const user = await userRepo.findOne({ where: { id: userId } });
            if (!user) {
                throw new Error('User not found');
            }
            // Calculate conversion
            const conversionCalc = await priceFeedService_1.PriceFeedService.calculateConversion(amount, fromCurrency, toCurrency);
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
                status: Conversion_1.ConversionStatus.PROCESSING,
                type: Conversion_1.ConversionType.MANUAL,
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
        }
        catch (error) {
            console.error('Manual conversion failed:', error);
            throw error;
        }
    }
    /**
     * Process automatic conversion (triggered by incoming payments)
     */
    static async processAutomaticConversion(userId, fromCurrency, amount, fromAddress, txHash) {
        const userRepo = database_1.AppDataSource.getRepository(User_1.User);
        const conversionRepo = database_1.AppDataSource.getRepository(Conversion_1.Conversion);
        try {
            // Get user
            const user = await userRepo.findOne({ where: { id: userId } });
            if (!user) {
                throw new Error('User not found');
            }
            // Calculate conversion to USDT
            const conversionCalc = await priceFeedService_1.PriceFeedService.calculateConversion(amount, fromCurrency, 'USDT');
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
                status: Conversion_1.ConversionStatus.PROCESSING,
                type: Conversion_1.ConversionType.AUTOMATIC,
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
        }
        catch (error) {
            console.error('Automatic conversion failed:', error);
            throw error;
        }
    }
    /**
     * Execute the actual conversion (simulate DEX interaction)
     */
    static async executeConversion(conversion) {
        const conversionRepo = database_1.AppDataSource.getRepository(Conversion_1.Conversion);
        const userRepo = database_1.AppDataSource.getRepository(User_1.User);
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
            const transferResult = await usdtService_1.USDTService.transferUSDTToUser(conversion.userId, Number(conversion.outputAmount), 'erc20' // Default to ERC-20 USDT
            );
            if (!transferResult.success) {
                // If transfer fails, mark conversion as failed
                conversion.status = Conversion_1.ConversionStatus.FAILED;
                await conversionRepo.save(conversion);
                throw new Error('Failed to transfer USDT to user address');
            }
            // Update conversion status with transfer details
            conversion.status = Conversion_1.ConversionStatus.COMPLETED;
            conversion.completedAt = new Date();
            conversion.txHashTo =
                transferResult.txHash ||
                    `0x${Math.random().toString(16).substr(2, 64)}`;
            conversion.dexUsed = this.getSimulatedDEX(conversion.fromCurrency);
            conversion.toAddress = transferResult.address;
            await conversionRepo.save(conversion);
            console.log(`[CONVERSION] Successfully transferred ${conversion.outputAmount} USDT to ${transferResult.address}`);
            console.log(`[CONVERSION] Transaction hash: ${transferResult.txHash}`);
            // Create notification
            await notificationService_1.NotificationService.createNotification(conversion.userId, types_1.NotificationType.CONVERSION_COMPLETED, 'Conversion Completed', `Successfully converted ${conversion.inputAmount} ${conversion.fromCurrency} to ${conversion.outputAmount.toFixed(4)} USDT and transferred to your wallet`, {
                conversionId: conversion.id,
                inputAmount: conversion.inputAmount,
                outputAmount: conversion.outputAmount,
                fromCurrency: conversion.fromCurrency,
                toCurrency: conversion.toCurrency,
                rate: conversion.exchangeRate,
                fee: conversion.feeAmount,
                transferHash: transferResult.txHash,
                walletAddress: transferResult.address,
            });
            console.log(`[ConversionService] Completed conversion ${conversion.id}: ${conversion.inputAmount} ${conversion.fromCurrency} → ${conversion.outputAmount} ${conversion.toCurrency}`);
        }
        catch (error) {
            // Mark conversion as failed
            conversion.status = Conversion_1.ConversionStatus.FAILED;
            conversion.errorMessage =
                error instanceof Error ? error.message : 'Unknown error';
            await conversionRepo.save(conversion);
            // Create failure notification
            await notificationService_1.NotificationService.notifySecurityAlert(conversion.userId, `Conversion failed: ${conversion.errorMessage}`, {
                conversionId: conversion.id,
                error: conversion.errorMessage,
            });
            throw error;
        }
    }
    /**
     * Get conversion history for a user
     */
    static async getConversionHistory(userId, page = 1, limit = 20) {
        const conversionRepo = database_1.AppDataSource.getRepository(Conversion_1.Conversion);
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
    static async getUSDTBalance(userId) {
        const userRepo = database_1.AppDataSource.getRepository(User_1.User);
        const user = await userRepo.findOne({ where: { id: userId } });
        if (!user) {
            throw new Error('User not found');
        }
        return Number(user.usdtBalance) || 0;
    }
    /**
     * Simulate DEX selection based on currency
     */
    static getSimulatedDEX(currency) {
        const dexMap = {
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
    static async cancelConversion(conversionId, userId) {
        const conversionRepo = database_1.AppDataSource.getRepository(Conversion_1.Conversion);
        const conversion = await conversionRepo.findOne({
            where: { id: conversionId, userId },
        });
        if (!conversion) {
            throw new Error('Conversion not found');
        }
        if (conversion.status !== Conversion_1.ConversionStatus.PENDING) {
            throw new Error('Can only cancel pending conversions');
        }
        conversion.status = Conversion_1.ConversionStatus.CANCELLED;
        await conversionRepo.save(conversion);
    }
}
exports.ConversionService = ConversionService;
//# sourceMappingURL=conversionService.js.map