import { Response } from 'express';
import { AuthRequest } from '../types';
export declare class MoonpayController {
    /**
     * Creates a MoonPay transaction (hosted checkout) and returns the redirect URL (or order id/status).
     */
    static createPurchase(req: AuthRequest, res: Response): Promise<void>;
    /**
     * Webhook handler stub. Verify provider signature and update order status accordingly.
     */
    static moonpayWebhook(req: any, res: Response): Promise<void>;
}
export default MoonpayController;
//# sourceMappingURL=moonpayController.d.ts.map