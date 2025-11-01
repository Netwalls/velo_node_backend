"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChangellyController = void 0;
const changellyService_1 = __importDefault(require("../services/changellyService"));
class ChangellyController {
    static async getProviders(req, res) {
        try {
            const data = await changellyService_1.default.getProviders();
            return res.json(data);
        }
        catch (err) {
            console.error('getProviders error', err);
            const status = err.status || 500;
            return res.status(status).json({ error: err.message || 'Changelly providers error' });
        }
    }
    static async getCurrencies(req, res) {
        try {
            const query = req.query;
            const data = await changellyService_1.default.getCurrencies(query);
            return res.json(data);
        }
        catch (err) {
            console.error('getCurrencies error', err);
            const status = err.status || 500;
            return res.status(status).json({ error: err.message || 'Changelly currencies error' });
        }
    }
    static async getAvailableCountries(req, res) {
        try {
            const query = req.query;
            const data = await changellyService_1.default.getAvailableCountries(query);
            return res.json(data);
        }
        catch (err) {
            console.error('getAvailableCountries error', err);
            const status = err.status || 500;
            return res.status(status).json({ error: err.message || 'Changelly available countries error' });
        }
    }
    static async getOffers(req, res) {
        try {
            const query = req.query;
            const data = await changellyService_1.default.getOffers(query);
            return res.json(data);
        }
        catch (err) {
            console.error('getOffers error', err);
            const status = err.status || 500;
            return res.status(status).json({ error: err.message || 'Changelly offers error' });
        }
    }
    static async createOrder(req, res) {
        try {
            const body = req.body;
            const data = await changellyService_1.default.createOrder(body);
            return res.json(data);
        }
        catch (err) {
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
    static async deposit(req, res) {
        try {
            const { externalUserId, externalOrderId, amountNGN, currencyTo, walletAddress, walletExtraId, returnSuccessUrl, returnFailedUrl, country = 'NG', } = req.body;
            if (!externalUserId || !amountNGN || !currencyTo || !walletAddress) {
                return res.status(400).json({ error: 'Missing required fields: externalUserId, amountNGN, currencyTo, walletAddress' });
            }
            // Query offers (amountFrom is fiat amount)
            const offers = await changellyService_1.default.getOffers({ currencyFrom: 'NGN', currencyTo: String(currencyTo).toUpperCase(), amountFrom: String(amountNGN), country });
            if (!offers || !Array.isArray(offers) || offers.length === 0) {
                return res.status(400).json({ error: 'No offers available for the requested pair/amount' });
            }
            // Pick the first offer and payment method (simple selection - can be improved)
            const best = offers[0];
            const paymentMethodOffer = (best.paymentMethodOffer && best.paymentMethodOffer[0]) || null;
            const genExternalOrderId = externalOrderId || `velo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
            const orderPayload = {
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
            const created = await changellyService_1.default.createOrder(orderPayload);
            // Return the redirectUrl and raw order info so frontend can redirect user
            return res.json({ redirectUrl: created.redirectUrl, order: created });
        }
        catch (err) {
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
    static async withdraw(req, res) {
        try {
            const { externalUserId, externalOrderId, currencyFrom, amountFrom, refundAddress, country = 'NG', } = req.body;
            if (!externalUserId || !currencyFrom || !amountFrom || !refundAddress) {
                return res.status(400).json({ error: 'Missing required fields: externalUserId, currencyFrom, amountFrom, refundAddress' });
            }
            const currencyFromUpper = String(currencyFrom).toUpperCase();
            const offers = await changellyService_1.default.getSellOffers({ currencyFrom: currencyFromUpper, currencyTo: 'NGN', amountFrom: String(amountFrom), country });
            if (!offers || !Array.isArray(offers) || offers.length === 0) {
                return res.status(400).json({ error: 'No sell offers available for the requested pair/amount' });
            }
            const best = offers[0];
            const genExternalOrderId = externalOrderId || `velo_sell_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
            const orderPayload = {
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
            const created = await changellyService_1.default.createSellOrder(orderPayload);
            return res.json({ redirectUrl: created.redirectUrl, order: created });
        }
        catch (err) {
            console.error('withdraw error', err);
            const status = err.status || 500;
            return res.status(status).json({ error: err.message || 'Changelly withdraw error' });
        }
    }
    static async validateAddress(req, res) {
        try {
            const body = req.body;
            const data = await changellyService_1.default.validateAddress(body);
            return res.json(data);
        }
        catch (err) {
            console.error('validateAddress error', err);
            const status = err.status || 500;
            return res.status(status).json({ error: err.message || 'Changelly validate address error' });
        }
    }
    // Off-ramp / sell
    static async getSellOffers(req, res) {
        try {
            const query = req.query;
            const data = await changellyService_1.default.getSellOffers(query);
            return res.json(data);
        }
        catch (err) {
            console.error('getSellOffers error', err);
            const status = err.status || 500;
            return res.status(status).json({ error: err.message || 'Changelly sell offers error' });
        }
    }
    static async createSellOrder(req, res) {
        try {
            const body = req.body;
            const data = await changellyService_1.default.createSellOrder(body);
            return res.json(data);
        }
        catch (err) {
            console.error('createSellOrder error', err);
            const status = err.status || 500;
            return res.status(status).json({ error: err.message || 'Changelly create sell order error' });
        }
    }
    static async getOrders(req, res) {
        try {
            const query = req.query;
            const data = await changellyService_1.default.getOrders(query);
            return res.json(data);
        }
        catch (err) {
            console.error('getOrders error', err);
            const status = err.status || 500;
            return res.status(status).json({ error: err.message || 'Changelly get orders error' });
        }
    }
}
exports.ChangellyController = ChangellyController;
//# sourceMappingURL=changellyController.js.map