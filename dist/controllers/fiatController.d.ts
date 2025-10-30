import { Request, Response } from 'express';
export declare class FiatController {
    /**
     * Initiate a Fincra pay-in (deposit) for a user.
     * Replace endpoint paths/fields with the exact ones from Fincra docs.
     */
    static initiateFincraDeposit(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Webhook endpoint for Fincra events (payin / payout status).
     * Configure your Fincra webhook URL to point here.
     */
    static fincraWebhook(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Initiate a withdrawal (payout) via Fincra:
     * - create beneficiary (bank account) if required
     * - create transfer to beneficiary
     */
    static initiateFincraWithdrawal(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Verify a bank account / mobile money / IBAN via Fincra.
     * Expects request body to include `type` and the relevant fields:
     * - bank_account / nuban: { accountNumber, bankCode, currency? }
     * - mobile_money: { accountNumber, mobileMoneyCode, currency? }
     * - iban: { iban }
     */
    static verifyFincraBankAccount(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=fiatController.d.ts.map