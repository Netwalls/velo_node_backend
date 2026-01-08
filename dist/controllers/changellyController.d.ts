import { Response } from 'express';
import { AuthRequest } from '../types';
export declare class ChangellyController {
    static createDepositOrder(req: AuthRequest, res: Response): Promise<void>;
    /**
     * Generic webhook handler for Changelly order status updates.
     * Expects JSON payload with at least { orderId, externalUserId, status, amount, currency }
     */
    static changellyWebhook(req: any, res: Response): Promise<void>;
}
//# sourceMappingURL=changellyController.d.ts.map