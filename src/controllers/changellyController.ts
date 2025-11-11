// @ts-nocheck
import { Request, Response } from 'express';
import ChangellyService from '../services/changellyService_impl';
import { AppDataSource } from '../config/database';
import FiatOrder from '../entities/FiatOrder';

export class ChangellyRampController {
    static async deposit(req: Request, res: Response) {
        try {
            const { amountNGN, currencyTo, walletAddress, country = 'NG' } = req.body;

            if (!amountNGN || !currencyTo || !walletAddress) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields',
                    required: ['amountNGN', 'currencyTo', 'walletAddress']
                });
            }

            const amount = parseFloat(amountNGN);
            if (isNaN(amount) || amount <= 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid amount. Must be a positive number'
                });
            }

            const currencyToUpper = String(currencyTo).toUpperCase();

            // Step 1: Get offers from Changelly
            const offersQuery = {
                currencyFrom: 'NGN',
                currencyTo: currencyToUpper,
                amountFrom: String(amount),
                country
            };

            const offers = await ChangellyService.getOffers(offersQuery);

            if (!offers || !Array.isArray(offers) || offers.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'No providers available for this transaction',
                    details: {
                        currencyFrom: 'NGN',
                        currencyTo: currencyToUpper,
                        amount: amountNGN,
                        country
                    }
                });
            }

            // Step 2: Select best offer
            const bestOffer = offers.reduce((best, current) => {
                const bestAmount = parseFloat(best.amountExpectedTo || '0');
                const currentAmount = parseFloat(current.amountExpectedTo || '0');
                return currentAmount > bestAmount ? current : best;
            }, offers[0]);

            // Step 3: Select best payment method
            let selectedPaymentMethod = null;
            if (bestOffer.paymentMethodOffer && bestOffer.paymentMethodOffer.length > 0) {
                selectedPaymentMethod = bestOffer.paymentMethodOffer.reduce((best, current) => {
                    const bestAmount = parseFloat(best.amountExpectedTo || '0');
                    const currentAmount = parseFloat(current.amountExpectedTo || '0');
                    return currentAmount > bestAmount ? current : best;
                }, bestOffer.paymentMethodOffer[0]);
            }

            // Step 4: Generate unique IDs
            const timestamp = Date.now();
            const randomId = Math.random().toString(36).substring(2, 10);
            const externalOrderId = `dep_${timestamp}_${randomId}`;
            const externalUserId = `user_${req.user?.id || timestamp}_${randomId}`;

            // Step 5: Build Changelly's COMPLETE required payload
            const BASE_URL = process.env.BASE_URL || 'https://yourdomain.com';
            
            const orderPayload = {
                externalOrderId,
                externalUserId,
                providerCode: bestOffer.providerCode,
                currencyFrom: 'NGN',
                currencyTo: currencyToUpper,
                amountFrom: String(amount),
                country,
                walletAddress,
                paymentMethod: selectedPaymentMethod?.method || 'card', // Default to 'card' if not available
                // REQUIRED: Return URLs for redirect after payment
                returnSuccessUrl: `${BASE_URL}/buy/success`,
                returnFailedUrl: `${BASE_URL}/buy/failure`,
                // Optional but recommended
                ip: req.ip || req.headers['x-forwarded-for'] as string || undefined,
                userAgent: req.get('User-Agent') || undefined
            };

            console.log('Creating order with payload:', {
                ...orderPayload,
                walletAddress: '***HIDDEN***'
            });

            // Step 6: Create order with Changelly
            const order = await ChangellyService.createOrder(orderPayload);

            // Step 7: Persist order for tracking
            try {
                await AppDataSource.getRepository(FiatOrder).save({
                    orderId: order.orderId,
                    externalOrderId: order.externalOrderId || externalOrderId,
                    providerCode: order.providerCode || bestOffer.providerCode,
                    currencyFrom: order.currencyFrom || 'NGN',
                    currencyTo: order.currencyTo || currencyToUpper,
                    amountFrom: Number(order.amountFrom || amount) || amount,
                    status: (order.status as string) || 'created',
                    rawResponse: order
                });
            } catch (saveErr) {
                console.error('Failed to persist FiatOrder:', saveErr);
            }

            // Step 8: Return simplified response to your users
            return res.json({
                success: true,
                redirectUrl: order.redirectUrl, // User should be redirected here to complete payment
                order: {
                    orderId: order.orderId,
                    externalOrderId: order.externalOrderId,
                    provider: order.providerCode,
                    amountFrom: order.amountFrom,
                    currencyFrom: order.currencyFrom,
                    currencyTo: order.currencyTo,
                    expectedAmount: bestOffer.amountExpectedTo,
                    rate: bestOffer.rate,
                    fee: bestOffer.fee,
                    paymentMethod: selectedPaymentMethod?.methodName || 'Card Payment'
                }
            });

        } catch (err: any) {
            console.error('Deposit error:', err);
            
            if (err.errorType) {
                return res.status(400).json({
                    success: false,
                    error: err.errorMessage || 'Provider error',
                    errorType: err.errorType,
                    details: err.errorDetails || []
                });
            }

            return res.status(err.status || 500).json({
                success: false,
                error: err.message || 'Failed to process deposit'
            });
        }
    }

    static async withdraw(req: Request, res: Response) {
        try {
            const { amountCrypto, currencyFrom, refundAddress, country = 'NG' } = req.body;

            if (!amountCrypto || !currencyFrom || !refundAddress) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields',
                    required: ['amountCrypto', 'currencyFrom', 'refundAddress']
                });
            }

            const amount = parseFloat(amountCrypto);
            if (isNaN(amount) || amount <= 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid amount. Must be a positive number'
                });
            }

            const currencyFromUpper = String(currencyFrom).toUpperCase();

            const offersQuery = {
                currencyFrom: currencyFromUpper,
                currencyTo: 'NGN',
                amountFrom: String(amount),
                country
            };

            const offers = await ChangellyService.getSellOffers(offersQuery);

            if (!offers || !Array.isArray(offers) || offers.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'No providers available for this withdrawal',
                    details: {
                        currencyFrom: currencyFromUpper,
                        currencyTo: 'NGN',
                        amount: amountCrypto,
                        country
                    }
                });
            }

            const bestOffer = offers.reduce((best, current) => {
                const bestAmount = parseFloat(best.amountExpectedTo || '0');
                const currentAmount = parseFloat(current.amountExpectedTo || '0');
                return currentAmount > bestAmount ? current : best;
            }, offers[0]);

            const timestamp = Date.now();
            const randomId = Math.random().toString(36).substring(2, 10);
            const externalOrderId = `wdr_${timestamp}_${randomId}`;
            const externalUserId = `user_${req.user?.id || timestamp}_${randomId}`;

            const BASE_URL = process.env.BASE_URL || 'https://yourdomain.com';

            const orderPayload = {
                externalOrderId,
                externalUserId,
                providerCode: bestOffer.providerCode,
                currencyFrom: currencyFromUpper,
                currencyTo: 'NGN',
                amountFrom: String(amount),
                country,
                refundAddress,
                // REQUIRED: Return URLs
                returnSuccessUrl: `${BASE_URL}/api/v1/ramp/callback/success`,
                returnFailedUrl: `${BASE_URL}/api/v1/ramp/callback/failed`,
                ip: req.ip || req.headers['x-forwarded-for'] as string || undefined,
                userAgent: req.get('User-Agent') || undefined
            };

            const order = await ChangellyService.createSellOrder(orderPayload);

            try {
                await AppDataSource.getRepository(FiatOrder).save({
                    orderId: order.orderId,
                    externalOrderId: order.externalOrderId || externalOrderId,
                    providerCode: order.providerCode || bestOffer.providerCode,
                    currencyFrom: order.currencyFrom || currencyFromUpper,
                    currencyTo: order.currencyTo || 'NGN',
                    amountFrom: Number(order.amountFrom || amount) || amount,
                    status: (order.status as string) || 'created',
                    rawResponse: order
                });
            } catch (saveErr) {
                console.error('Failed to persist FiatOrder:', saveErr);
            }

            return res.json({
                success: true,
                redirectUrl: order.redirectUrl,
                order: {
                    orderId: order.orderId,
                    externalOrderId: order.externalOrderId,
                    provider: order.providerCode,
                    amountFrom: order.amountFrom,
                    currencyFrom: order.currencyFrom,
                    currencyTo: order.currencyTo,
                    expectedAmountNGN: bestOffer.amountExpectedTo,
                    rate: bestOffer.rate,
                    fee: bestOffer.fee
                }
            });

        } catch (err: any) {
            console.error('Withdraw error:', err);
            
            if (err.errorType) {
                return res.status(400).json({
                    success: false,
                    error: err.errorMessage || 'Provider error',
                    errorType: err.errorType,
                    details: err.errorDetails || []
                });
            }

            return res.status(err.status || 500).json({
                success: false,
                error: err.message || 'Failed to process withdrawal'
            });
        }
    }

    static async getBuyQuote(req: Request, res: Response) {
        try {
            const { amountNGN, currencyTo, country = 'NG' } = req.body;

            if (!amountNGN || !currencyTo) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields',
                    required: ['amountNGN', 'currencyTo']
                });
            }

            const amount = parseFloat(amountNGN);
            if (isNaN(amount) || amount <= 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid amount'
                });
            }

            const offers = await ChangellyService.getOffers({
                currencyFrom: 'NGN',
                currencyTo: String(currencyTo).toUpperCase(),
                amountFrom: String(amount),
                country
            });

            if (!offers || offers.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'No quotes available'
                });
            }

            const quotes = offers.map(offer => ({
                provider: offer.providerCode,
                amountYouGet: offer.amountExpectedTo,
                rate: offer.rate,
                fee: offer.fee,
                paymentMethods: offer.paymentMethodOffer?.map(pm => ({
                    method: pm.methodName,
                    amountYouGet: pm.amountExpectedTo,
                    rate: pm.rate,
                    fee: pm.fee
                })) || []
            }));

            return res.json({
                success: true,
                amountNGN: amount,
                currencyTo: String(currencyTo).toUpperCase(),
                quotes
            });

        } catch (err: any) {
            console.error('Get buy quote error:', err);
            return res.status(err.status || 500).json({
                success: false,
                error: err.message || 'Failed to get quote'
            });
        }
    }

    static async getSellQuote(req: Request, res: Response) {
        try {
            const { amountCrypto, currencyFrom, country = 'NG' } = req.body;

            if (!amountCrypto || !currencyFrom) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields',
                    required: ['amountCrypto', 'currencyFrom']
                });
            }

            const amount = parseFloat(amountCrypto);
            if (isNaN(amount) || amount <= 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid amount'
                });
            }

            const offers = await ChangellyService.getSellOffers({
                currencyFrom: String(currencyFrom).toUpperCase(),
                currencyTo: 'NGN',
                amountFrom: String(amount),
                country
            });

            if (!offers || offers.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'No quotes available'
                });
            }

            const quotes = offers.map(offer => ({
                provider: offer.providerCode,
                amountNGN: offer.amountExpectedTo,
                rate: offer.rate,
                fee: offer.fee
            }));

            return res.json({
                success: true,
                amountCrypto: amount,
                currencyFrom: String(currencyFrom).toUpperCase(),
                quotes
            });

        } catch (err: any) {
            console.error('Get sell quote error:', err);
            return res.status(err.status || 500).json({
                success: false,
                error: err.message || 'Failed to get quote'
            });
        }
    }

    // NEW: Callback handlers for success/failed redirects
    static async handleSuccessCallback(req: Request, res: Response) {
        try {
            const { orderId, externalOrderId } = req.query;
            
            // Update order status in your database
            if (orderId) {
                const orderRepo = AppDataSource.getRepository(FiatOrder);
                const order = await orderRepo.findOne({ 
                    where: { orderId: orderId as string } 
                });
                
                if (order) {
                    order.status = 'completed';
                    await orderRepo.save(order);
                }
            }

            // Redirect to your frontend success page
            return res.redirect(`${process.env.FRONTEND_URL}/payment/success?orderId=${orderId}`);
        } catch (err) {
            console.error('Success callback error:', err);
            return res.redirect(`${process.env.FRONTEND_URL}/payment/error`);
        }
    }

    static async handleFailedCallback(req: Request, res: Response) {
        try {
            const { orderId, externalOrderId } = req.query;
            
            // Update order status in your database
            if (orderId) {
                const orderRepo = AppDataSource.getRepository(FiatOrder);
                const order = await orderRepo.findOne({ 
                    where: { orderId: orderId as string } 
                });
                
                if (order) {
                    order.status = 'failed';
                    await orderRepo.save(order);
                }
            }

            // Redirect to your frontend failed page
            return res.redirect(`${process.env.FRONTEND_URL}/payment/failed?orderId=${orderId}`);
        } catch (err) {
            console.error('Failed callback error:', err);
            return res.redirect(`${process.env.FRONTEND_URL}/payment/error`);
        }
    }
}