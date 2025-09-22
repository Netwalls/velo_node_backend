/**
 * End-to-End Test for Multi-Currency to USDT Conversion
 *
 * This script demonstrates the complete workflow:
 * 1. User pays with ETH
 * 2. System detects payment
 * 3. Converts ETH to USDT
 * 4. Transfers USDT to user's address
 * 5. Updates balance
 */

import { ConversionService } from '../services/conversionService';
import {
    PaymentMonitoringService,
    IncomingPayment,
} from '../services/paymentMonitoringService';
import { USDTService } from '../services/usdtService';
import { PriceFeedService } from '../services/priceFeedService';

export class E2ETestRunner {
    /**
     * Run end-to-end test for conversion workflow
     */
    static async runConversionTest(userId: string): Promise<void> {
        console.log('\n🚀 Starting End-to-End Conversion Test');
        console.log('=========================================');

        try {
            // Step 1: Get user's USDT addresses
            console.log('\n📍 Step 1: Getting user USDT addresses...');
            const usdtAddresses = await USDTService.getUserUSDTAddresses(
                userId
            );
            console.log('USDT Addresses:', usdtAddresses);

            // Step 2: Check initial balance
            console.log('\n💰 Step 2: Checking initial balance...');
            const initialBalance = await ConversionService.getUSDTBalance(
                userId
            );
            console.log(`Initial USDT balance: ${initialBalance}`);

            // Step 3: Get current ETH price
            console.log('\n📊 Step 3: Getting current ETH price...');
            const ethPrice = await PriceFeedService.getPrice('ETH');
            console.log(`Current ETH price: $${ethPrice}`);

            // Step 4: Calculate conversion
            const ethAmount = 0.1; // 0.1 ETH
            console.log(
                `\n🔄 Step 4: Calculating conversion for ${ethAmount} ETH...`
            );
            const calculation = await PriceFeedService.calculateConversion(
                ethAmount,
                'ETH',
                'USDT'
            );
            console.log('Conversion calculation:', calculation);

            // Step 5: Simulate incoming ETH payment
            console.log('\n📥 Step 5: Simulating incoming ETH payment...');
            const mockPayment: IncomingPayment = {
                txHash:
                    '0x' +
                    Math.random().toString(16).substring(2) +
                    Math.random().toString(16).substring(2),
                fromAddress:
                    '0x742d35cc6bf4532c32cf0e0d9b0b7c8f8' +
                    Math.random().toString(16).substring(2, 10),
                toAddress: usdtAddresses.erc20.mainnet, // User's ETH address (same for ERC-20 USDT)
                amount: ethAmount,
                currency: 'ETH',
                confirmations: 12,
                timestamp: new Date(),
            };

            console.log('Simulated payment:', mockPayment);

            // Step 6: Process automatic conversion
            console.log('\n⚡ Step 6: Processing automatic conversion...');
            await PaymentMonitoringService.simulatePaymentDetection(
                mockPayment
            );

            // Wait a moment for processing
            await new Promise((resolve) => setTimeout(resolve, 2000));

            // Step 7: Check final balance
            console.log('\n💰 Step 7: Checking final balance...');
            const finalBalance = await ConversionService.getUSDTBalance(userId);
            console.log(`Final USDT balance: ${finalBalance}`);

            // Step 8: Get conversion history
            console.log('\n📜 Step 8: Getting conversion history...');
            const history = await ConversionService.getConversionHistory(
                userId,
                1,
                5
            );
            console.log(`Recent conversions (${history.total} total):`);
            history.conversions.forEach((conversion, index) => {
                console.log(
                    `  ${index + 1}. ${conversion.inputAmount} ${
                        conversion.fromCurrency
                    } → ${conversion.outputAmount} ${conversion.toCurrency} (${
                        conversion.status
                    })`
                );
            });

            // Step 9: Get blockchain balance
            console.log('\n🌐 Step 9: Getting blockchain USDT balance...');
            const blockchainBalance =
                await USDTService.getUSDTBalanceFromBlockchain(userId);
            console.log('Blockchain balances:', blockchainBalance);

            console.log('\n✅ End-to-End Test Completed Successfully!');
            console.log('==========================================');
            console.log(
                `💎 Balance increased by: ${finalBalance - initialBalance} USDT`
            );
            console.log(
                `🔄 ETH → USDT conversion: ${ethAmount} ETH → ${calculation.outputAmount} USDT`
            );
        } catch (error) {
            console.error('\n❌ End-to-End Test Failed:', error);
            console.error('============================');
        }
    }

    /**
     * Test manual conversion workflow
     */
    static async runManualConversionTest(userId: string): Promise<void> {
        console.log('\n🔧 Starting Manual Conversion Test');
        console.log('==================================');

        try {
            // Step 1: Get conversion rates
            console.log('\n📊 Step 1: Getting conversion rates...');
            const rates = await PriceFeedService.getAllPrices();
            console.log('Current rates:', rates);

            // Step 2: Calculate manual conversion
            const btcAmount = 0.005; // 0.005 BTC
            console.log(
                `\n🔄 Step 2: Calculating manual conversion for ${btcAmount} BTC...`
            );
            const calculation = await PriceFeedService.calculateConversion(
                btcAmount,
                'BTC',
                'USDT'
            );
            console.log('Manual conversion calculation:', calculation);

            // Step 3: Execute manual conversion
            console.log('\n⚡ Step 3: Executing manual conversion...');
            const conversion = await ConversionService.processManualConversion(
                userId,
                'BTC',
                'USDT',
                btcAmount,
                'bc1q' + Math.random().toString(16).substring(2, 10) // Mock BTC address
            );

            console.log('Manual conversion result:', {
                id: conversion.id,
                status: conversion.status,
                inputAmount: conversion.inputAmount,
                outputAmount: conversion.outputAmount,
                exchangeRate: conversion.exchangeRate,
            });

            console.log('\n✅ Manual Conversion Test Completed!');
        } catch (error) {
            console.error('\n❌ Manual Conversion Test Failed:', error);
        }
    }

    /**
     * Test price feed service
     */
    static async runPriceFeedTest(): Promise<void> {
        console.log('\n📈 Starting Price Feed Test');
        console.log('===========================');

        try {
            // Test individual price fetching
            console.log('\n🔍 Testing individual price fetching...');
            const ethPrice = await PriceFeedService.getPrice('ETH');
            const btcPrice = await PriceFeedService.getPrice('BTC');
            const solPrice = await PriceFeedService.getPrice('SOL');

            console.log(`ETH: $${ethPrice}`);
            console.log(`BTC: $${btcPrice}`);
            console.log(`SOL: $${solPrice}`);

            // Test conversion rate calculation
            console.log('\n🔄 Testing conversion rate calculation...');
            const ethToUsdt = await PriceFeedService.getConversionRate(
                'ETH',
                'USDT'
            );
            const btcToUsdt = await PriceFeedService.getConversionRate(
                'BTC',
                'USDT'
            );

            console.log(`ETH → USDT rate: ${ethToUsdt}`);
            console.log(`BTC → USDT rate: ${btcToUsdt}`);

            // Test batch price fetching
            console.log('\n📊 Testing batch price fetching...');
            const allPrices = await PriceFeedService.getAllPrices();
            console.log('All prices:', allPrices);

            console.log('\n✅ Price Feed Test Completed!');
        } catch (error) {
            console.error('\n❌ Price Feed Test Failed:', error);
        }
    }
}

export default E2ETestRunner;
