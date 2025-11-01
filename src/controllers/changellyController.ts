import { Request, Response } from 'express';
import ChangellyService from '../services/changellyService';

export class ChangellyController {
    static async getProviders(req: Request, res: Response) {
        try {
            const data = await ChangellyService.getProviders();
            return res.json(data);
        } catch (err: any) {
            console.error('getProviders error', err);
            const status = err.status || 500;
            return res.status(status).json({ error: err.message || 'Changelly providers error' });
        }
    }

    static async getCurrencies(req: Request, res: Response) {
        try {
            const query = req.query as any;
            const data = await ChangellyService.getCurrencies(query);
            return res.json(data);
        } catch (err: any) {
            console.error('getCurrencies error', err);
            const status = err.status || 500;
            return res.status(status).json({ error: err.message || 'Changelly currencies error' });
        }
    }

    static async getAvailableCountries(req: Request, res: Response) {
        try {
            const query = req.query as any;
            const data = await ChangellyService.getAvailableCountries(query);
            return res.json(data);
        } catch (err: any) {
            console.error('getAvailableCountries error', err);
            const status = err.status || 500;
            return res.status(status).json({ error: err.message || 'Changelly available countries error' });
        }
    }

    static async getOffers(req: Request, res: Response) {
        try {
            const query = req.query as any;
            const data = await ChangellyService.getOffers(query);
            return res.json(data);
        } catch (err: any) {
            console.error('getOffers error', err);
            const status = err.status || 500;
            return res.status(status).json({ error: err.message || 'Changelly offers error' });
        }
    }

    static async createOrder(req: Request, res: Response) {
        try {
            const body = req.body;
            const data = await ChangellyService.createOrder(body);
            return res.json(data);
        } catch (err: any) {
            console.error('createOrder error', err);
            const status = err.status || 500;
            return res.status(status).json({ error: err.message || 'Changelly create order error' });
        }
    }

    /**
     * Simplified endpoint for front-end to create an on-ramp (buy) order.
     * Expects: { externalUserId, amountNGN, currencyTo, walletAddress, walletExtraId?, returnSuccessUrl?, returnFailedUrl?, country? }
     * Flow: fetch offers for NGN -> pick best (first) -> create order with chosen provider -> return redirectUrl and order info
     */
    static async deposit(req: Request, res: Response) {
        try {
            const {
                externalUserId,
                externalOrderId,
                amountNGN,
                currencyTo,
                walletAddress,
                walletExtraId,
                returnSuccessUrl,
                returnFailedUrl,
                country = 'NG',
            } = req.body as any;

            if (!externalUserId || !amountNGN || !currencyTo || !walletAddress) {
                return res.status(400).json({ error: 'Missing required fields: externalUserId, amountNGN, currencyTo, walletAddress' });
            }

            // Query offers (amountFrom is fiat amount)
            const offers = await ChangellyService.getOffers({ currencyFrom: 'NGN', currencyTo: String(currencyTo).toUpperCase(), amountFrom: String(amountNGN), country });

            if (!offers || !Array.isArray(offers) || offers.length === 0) {
                return res.status(400).json({ error: 'No offers available for the requested pair/amount' });
            }

            // Pick the first offer and payment method (simple selection - can be improved)
            const best = offers[0];
            const paymentMethodOffer = (best.paymentMethodOffer && best.paymentMethodOffer[0]) || null;

            const genExternalOrderId = externalOrderId || `velo_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;

            const orderPayload: any = {
                externalOrderId: genExternalOrderId,
                externalUserId,
                providerCode: best.providerCode,
                currencyFrom: 'NGN',
                currencyTo: String(currencyTo).toUpperCase(),
                amountFrom: String(amountNGN),
                country,
                walletAddress,
                walletExtraId: walletExtraId || undefined,
                paymentMethod: paymentMethodOffer ? paymentMethodOffer.method || paymentMethodOffer.methodName : undefined,
                returnSuccessUrl: returnSuccessUrl || null,
                returnFailedUrl: returnFailedUrl || null,
                userAgent: req.get('User-Agent') || undefined,
                ip: req.ip,
            };

            const created = await ChangellyService.createOrder(orderPayload);

            // Return the redirectUrl and raw order info so frontend can redirect user
            return res.json({ redirectUrl: created.redirectUrl, order: created });
        } catch (err: any) {
            console.error('deposit error', err);
            const status = err.status || 500;
            return res.status(status).json({ error: err.message || 'Changelly deposit error' });
        }
    }

    /**
     * Simplified endpoint for front-end to create an off-ramp (sell) order.
     * Expects: { externalUserId, externalOrderId?, currencyFrom, amountFrom, refundAddress, country? }
     * Flow: fetch sell offers -> pick best -> create sell order -> return redirectUrl and order info
     */
    static async withdraw(req: Request, res: Response) {
        try {
            const {
                externalUserId,
                externalOrderId,
                currencyFrom,
                amountFrom,
                refundAddress,
                country = 'NG',
            } = req.body as any;

            if (!externalUserId || !currencyFrom || !amountFrom || !refundAddress) {
                return res.status(400).json({ error: 'Missing required fields: externalUserId, currencyFrom, amountFrom, refundAddress' });
            }

            const currencyFromUpper = String(currencyFrom).toUpperCase();

            const offers = await ChangellyService.getSellOffers({ currencyFrom: currencyFromUpper, currencyTo: 'NGN', amountFrom: String(amountFrom), country });

            if (!offers || !Array.isArray(offers) || offers.length === 0) {
                return res.status(400).json({ error: 'No sell offers available for the requested pair/amount' });
            }

            const best = offers[0];

            const genExternalOrderId = externalOrderId || `velo_sell_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;

            const orderPayload: any = {
                externalOrderId: genExternalOrderId,
                externalUserId,
                providerCode: best.providerCode,
                currencyFrom: currencyFromUpper,
                currencyTo: 'NGN',
                amountFrom: amountFrom,
                country,
                refundAddress,
                userAgent: req.get('User-Agent') || undefined,
                ip: req.ip,
            };

            const created = await ChangellyService.createSellOrder(orderPayload);
            return res.json({ redirectUrl: created.redirectUrl, order: created });
        } catch (err: any) {
            console.error('withdraw error', err);
            const status = err.status || 500;
            return res.status(status).json({ error: err.message || 'Changelly withdraw error' });
        }
    }

    static async validateAddress(req: Request, res: Response) {
        try {
            const body = req.body;
            const data = await ChangellyService.validateAddress(body);
            return res.json(data);
        } catch (err: any) {
            console.error('validateAddress error', err);
            const status = err.status || 500;
            return res.status(status).json({ error: err.message || 'Changelly validate address error' });
        }
    }

    // Off-ramp / sell
    static async getSellOffers(req: Request, res: Response) {
        try {
            const query = req.query as any;
            const data = await ChangellyService.getSellOffers(query);
            return res.json(data);
        } catch (err: any) {
            console.error('getSellOffers error', err);
            const status = err.status || 500;
            return res.status(status).json({ error: err.message || 'Changelly sell offers error' });
        }
    }

    static async createSellOrder(req: Request, res: Response) {
        try {
            const body = req.body;
            const data = await ChangellyService.createSellOrder(body);
            return res.json(data);
        } catch (err: any) {
            console.error('createSellOrder error', err);
            const status = err.status || 500;
            return res.status(status).json({ error: err.message || 'Changelly create sell order error' });
        }
    }

    static async getOrders(req: Request, res: Response) {
        try {
            const query = req.query as any;
            const data = await ChangellyService.getOrders(query);
            return res.json(data);
        } catch (err: any) {
            console.error('getOrders error', err);
            const status = err.status || 500;
            return res.status(status).json({ error: err.message || 'Changelly get orders error' });
        }
    }
}
