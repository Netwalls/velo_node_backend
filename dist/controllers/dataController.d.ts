import { Request, Response } from "express";
export declare const dataPurchaseRateLimiter: import("express-rate-limit").RateLimitRequestHandler;
export declare class DataController {
    /**
     * SECURE: Process data purchase with rate limiting
     * Payload includes amount for blockchain validation
     */
    processDataPurchase(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Get available data plans for a network
     */
    getDataPlans(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Get expected crypto amount for a data plan
     */
    getExpectedAmount(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Get user's data purchase history
     */
    getUserDataHistory(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Get supported options (blockchains, networks)
     */
    getSupportedOptions(req: Request, res: Response): Promise<void>;
    /**
     * Get specific data purchase details
     */
    getDataPurchase(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Get user purchase statistics
     */
    getUserPurchaseStats(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Get security limits
     */
    getSecurityLimits(req: Request, res: Response): Promise<void>;
    /**
     * Refresh data plans cache
     */
    refreshDataPlans(req: Request, res: Response): Promise<void>;
}
export declare const dataController: DataController;
//# sourceMappingURL=dataController.d.ts.map