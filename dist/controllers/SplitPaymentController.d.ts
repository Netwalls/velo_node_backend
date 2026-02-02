import { Response } from "express";
import { AuthRequest } from "../types";
export declare class SplitPaymentController {
    /**
     * Create a new reusable split payment template
     * POST /split-payment/create
     */
    static createSplitPayment(req: AuthRequest, res: Response): Promise<void>;
    static executeSplitPayment(req: AuthRequest, res: Response): Promise<void>;
    private static processStarknetBatch;
    private static processStellarBatch;
    /**
     * Process Polkadot split batch payments
     */
    private static processPolkadotBatch;
    /**
     * Get all split payment templates (reusable)
     * GET /split-payment/templates
     */
    static getSplitPaymentTemplates(req: AuthRequest, res: Response): Promise<void>;
    /**
     * Get execution history for a split payment
     * GET /split-payment/:id/executions
     */
    static getExecutionHistory(req: AuthRequest, res: Response): Promise<void>;
    /**
     * Toggle split payment status (activate/deactivate)
     * PATCH /split-payment/:id/toggle
     */
    static toggleSplitPayment(req: AuthRequest, res: Response): Promise<void>;
    private static processEthereumBatch;
    private static processBitcoinBatch;
    private static processSolanaBatch;
    private static sendBitcoinBatchTransaction;
    private static sendBitcoinTransaction;
}
//# sourceMappingURL=SplitPaymentController.d.ts.map