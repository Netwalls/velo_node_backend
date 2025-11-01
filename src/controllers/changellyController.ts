import { Request, Response } from 'express';
import ChangellyService from '../services/changellyService';

export class ChangellyRampController {
    /**
     * On-Ramp: Buy crypto with NGN
     * POST /api/ramp/deposit
     * Body: { amountNGN, currencyTo, walletAddress, country? }
     */
    static async deposit(req: Request, res: Response) {
        try {
            const { amountNGN, currencyTo, walletAddress, country = 'NG' } = req.body;

            // Validate required fields
            if (!amountNGN || !currencyTo || !walletAddress) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields',
                    required: ['amountNGN', 'currencyTo', 'walletAddress']
                });
            }

            // Validate amount
            const amount = parseFloat(amountNGN);
            if (isNaN(amount) || amount <= 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid amount. Must be a positive number'
                });
            }

            const currencyToUpper = String(currencyTo).toUpperCase();

            // Step 1: Fetch available offers
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

            // Step 2: Select best offer (highest amountExpectedTo)
            const bestOffer = offers.reduce((best, current) => {
                const bestAmount = parseFloat(best.amountExpectedTo || '0');
                const currentAmount = parseFloat(current.amountExpectedTo || '0');
                return currentAmount > bestAmount ? current : best;
            }, offers[0]);

            // Step 3: Select best payment method from the best offer
            let selectedPaymentMethod = null;
            if (bestOffer.paymentMethodOffer && bestOffer.paymentMethodOffer.length > 0) {
                selectedPaymentMethod = bestOffer.paymentMethodOffer.reduce((best: any, current: any) => {
                    const bestAmount = parseFloat(best.amountExpectedTo || '0');
                    const currentAmount = parseFloat(current.amountExpectedTo || '0');
                    return currentAmount > bestAmount ? current : best;
                }, bestOffer.paymentMethodOffer[0]);
            }

            // Step 4: Generate unique IDs
            const timestamp = Date.now();
            const randomId = Math.random().toString(36).substring(2, 10);
            const externalOrderId = `dep_${timestamp}_${randomId}`;
            const externalUserId = `user_${timestamp}_${randomId}`;

            // Step 5: Create order payload
            const orderPayload = {
                externalOrderId,
                externalUserId,
                providerCode: bestOffer.providerCode,
                currencyFrom: 'NGN',
                currencyTo: currencyToUpper,
                amountFrom: String(amount),
                country,
                walletAddress,
                paymentMethod: selectedPaymentMethod?.method || undefined,
                ip: req.ip || req.headers['x-forwarded-for'] || undefined,
                userAgent: req.get('User-Agent') || undefined
            };

            // Step 6: Create the order
            const order = await ChangellyService.createOrder(orderPayload);

            // Step 7: Return success response
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
                    expectedAmount: bestOffer.amountExpectedTo,
                    rate: bestOffer.rate,
                    fee: bestOffer.fee,
                    paymentMethod: selectedPaymentMethod?.methodName || 'N/A'
                }
            });

        } catch (err: any) {
            console.error('Deposit error:', err);
            
            // Handle specific error types
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

    /**
     * Off-Ramp: Sell crypto for NGN
     * POST /api/ramp/withdraw
     * Body: { amountCrypto, currencyFrom, refundAddress, country? }
     */
    static async withdraw(req: Request, res: Response) {
        try {
            const { amountCrypto, currencyFrom, refundAddress, country = 'NG' } = req.body;

            // Validate required fields
            if (!amountCrypto || !currencyFrom || !refundAddress) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields',
                    required: ['amountCrypto', 'currencyFrom', 'refundAddress']
                });
            }

            // Validate amount
            const amount = parseFloat(amountCrypto);
            if (isNaN(amount) || amount <= 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid amount. Must be a positive number'
                });
            }

            const currencyFromUpper = String(currencyFrom).toUpperCase();

            // Step 1: Fetch sell offers
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

            // Step 2: Select best offer (highest amountExpectedTo in NGN)
            const bestOffer = offers.reduce((best, current) => {
                const bestAmount = parseFloat(best.amountExpectedTo || '0');
                const currentAmount = parseFloat(current.amountExpectedTo || '0');
                return currentAmount > bestAmount ? current : best;
            }, offers[0]);

            // Step 3: Generate unique IDs
            const timestamp = Date.now();
            const randomId = Math.random().toString(36).substring(2, 10);
            const externalOrderId = `wdr_${timestamp}_${randomId}`;
            const externalUserId = `user_${timestamp}_${randomId}`;

            // Step 4: Create sell order payload
            const orderPayload = {
                externalOrderId,
                externalUserId,
                providerCode: bestOffer.providerCode,
                currencyFrom: currencyFromUpper,
                currencyTo: 'NGN',
                amountFrom: String(amount),
                country,
                refundAddress,
                ip: req.ip || req.headers['x-forwarded-for'] || undefined,
                userAgent: req.get('User-Agent') || undefined
            };

            // Step 5: Create the sell order
            const order = await ChangellyService.createSellOrder(orderPayload);

            // Step 6: Return success response
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
            
            // Handle specific error types
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

    /**
     * Get quote for buying crypto (without creating order)
     * POST /api/ramp/quote/buy
     * Body: { amountNGN, currencyTo, country? }
     */
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

            const quotes = offers.map((offer: any) => ({
                provider: offer.providerCode,
                amountYouGet: offer.amountExpectedTo,
                rate: offer.rate,
                fee: offer.fee,
                paymentMethods: offer.paymentMethodOffer?.map((pm: any) => ({
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

    /**
     * Get quote for selling crypto (without creating order)
     * POST /api/ramp/quote/sell
     * Body: { amountCrypto, currencyFrom, country? }
     */
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

            const quotes = offers.map((offer: any) => ({
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
}