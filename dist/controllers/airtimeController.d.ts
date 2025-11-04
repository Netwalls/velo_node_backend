import { Request, Response } from "express";
export declare const purchaseRateLimiter: import("express-rate-limit").RateLimitRequestHandler;
export declare class AirtimeController {
    /**
     * SECURE: Process airtime purchase with rate limiting
     */
    processAirtimePurchase(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Get expected crypto amount for display (optional)
     */
    getExpectedAmount(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Get user's airtime purchase history
     */
    getUserAirtimeHistory(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Get supported blockchains and networks
     */
    getSupportedOptions(req: Request, res: Response): Promise<void>;
    /**
     * Get specific airtime purchase details
     */
    getAirtimePurchase(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
}
export declare const airtimeController: AirtimeController;
//# sourceMappingURL=airtimeController.d.ts.map