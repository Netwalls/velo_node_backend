import { Request, Response } from 'express';
export declare class ChangellyController {
    static getProviders(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getCurrencies(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getAvailableCountries(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getOffers(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static createOrder(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Simplified endpoint for front-end to create an on-ramp (buy) order.
     * Expects: { externalUserId, amountNGN, currencyTo, walletAddress, walletExtraId?, returnSuccessUrl?, returnFailedUrl?, country? }
     * Flow: fetch offers for NGN -> pick best (first) -> create order with chosen provider -> return redirectUrl and order info
     */
    static deposit(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Simplified endpoint for front-end to create an off-ramp (sell) order.
     * Expects: { externalUserId, externalOrderId?, currencyFrom, amountFrom, refundAddress, country? }
     * Flow: fetch sell offers -> pick best -> create sell order -> return redirectUrl and order info
     */
    static withdraw(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static validateAddress(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getSellOffers(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static createSellOrder(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getOrders(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=changellyController.d.ts.map