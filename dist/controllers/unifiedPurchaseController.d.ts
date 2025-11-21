import { Request, Response } from "express";
export declare const purchaseRateLimiter: import("express-rate-limit").RateLimitRequestHandler;
export declare class UnifiedPurchaseController {
    processAirtimePurchase(req: Request, res: Response): Promise<void>;
    getAirtimeExpectedAmount(req: Request, res: Response): Promise<void>;
    getUserAirtimeHistory(req: Request, res: Response): Promise<void>;
    getAirtimeSupportedOptions(req: Request, res: Response): Promise<void>;
    getAirtimePurchase(req: Request, res: Response): Promise<void>;
    processDataPurchase(req: Request, res: Response): Promise<void>;
    getDataPlans(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    getDataExpectedAmount(req: Request, res: Response): Promise<void>;
    getUserDataHistory(req: Request, res: Response): Promise<void>;
    getDataSupportedOptions(req: Request, res: Response): Promise<void>;
    getDataPurchase(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    getDataPurchaseStats(req: Request, res: Response): Promise<void>;
    getDataSecurityLimits(req: Request, res: Response): Promise<void>;
    refreshDataPlans(req: Request, res: Response): Promise<void>;
    processElectricityPayment(req: Request, res: Response): Promise<void>;
    verifyMeterNumber(req: Request, res: Response): Promise<void>;
    getElectricityExpectedAmount(req: Request, res: Response): Promise<void>;
    getUserElectricityHistory(req: Request, res: Response): Promise<void>;
    getElectricitySupportedOptions(req: Request, res: Response): Promise<void>;
    getElectricityPayment(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    getElectricityPurchaseStats(req: Request, res: Response): Promise<void>;
    getElectricitySecurityLimits(req: Request, res: Response): Promise<void>;
}
export declare const unifiedPurchaseController: UnifiedPurchaseController;
//# sourceMappingURL=unifiedPurchaseController.d.ts.map