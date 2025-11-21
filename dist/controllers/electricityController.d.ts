import { Request, Response } from "express";
export declare const electricityPurchaseRateLimiter: import("express-rate-limit").RateLimitRequestHandler;
export declare class ElectricityController {
    /**
     * SECURE: Process electricity payment with rate limiting
     */
    processElectricityPayment(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Verify meter number before payment
     */
    /**
  * Verify meter number before payment
  */
    verifyMeterNumber(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Get expected crypto amount for display
     */
    getExpectedAmount(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Get user's electricity payment history
     */
    getUserElectricityHistory(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Get supported options (blockchains, companies, meter types)
     */
    getSupportedOptions(req: Request, res: Response): Promise<void>;
    /**
     * Get specific electricity payment details
     */
    getElectricityPayment(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Get user purchase statistics
     */
    getUserPurchaseStats(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Get security limits
     */
    getSecurityLimits(req: Request, res: Response): Promise<void>;
}
export declare const electricityController: ElectricityController;
//# sourceMappingURL=electricityController.d.ts.map