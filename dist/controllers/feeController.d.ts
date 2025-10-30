import { Request, Response } from 'express';
import { AuthRequest } from '../types';
export declare class FeeController {
    /**
     * GET /fees/calculate
     * Calculate fee for a given amount
     */
    static calculateFee(req: Request, res: Response): Promise<void>;
    /**
     * POST /fees/calculate/batch
     * Calculate fees for multiple amounts
     */
    static calculateBatchFees(req: Request, res: Response): Promise<void>;
    /**
     * GET /fees/config
     * Get fee configuration and tiers
     */
    static getFeeConfig(req: Request, res: Response): Promise<void>;
    /**
     * GET /fees/history
     * Get fee history for authenticated user
     */
    static getFeeHistory(req: AuthRequest, res: Response): Promise<void>;
    /**
     * GET /fees/stats
     * Get fee statistics (admin only)
     */
    static getFeeStats(req: Request, res: Response): Promise<void>;
}
export default FeeController;
//# sourceMappingURL=feeController.d.ts.map