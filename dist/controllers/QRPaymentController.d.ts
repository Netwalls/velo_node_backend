import { Request, Response } from 'express';
import { AuthRequest } from '../types';
export declare class MerchantController {
    /**
     * Create a new payment request with QR code support
     */
    static createPayment(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Get all payment requests for the merchant
     */
    static getPayments(req: AuthRequest, res: Response): Promise<void>;
    /**
     * Get a single payment by ID
     */
    static getPaymentById(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Cancel a payment by ID
     */
    static cancelPayment(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Monitor a specific payment for blockchain confirmations
     */
    static monitorPayment(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Monitor all pending payments (can be called by a cron job)
     */
    static monitorAllPendingPayments(req: Request, res: Response): Promise<void>;
    /**
     * Check blockchain for payment confirmation
     * This is a helper method that queries blockchain APIs
     */
    private static checkBlockchainPayment;
    private static isValidStellarAddress;
    /**
     * Check Polkadot payment by scanning recent blocks for balances.Transfer events
     */
    private static checkPolkadotPayment;
    /**
     * Check Stellar payment using Horizon API
     */
    private static checkStellarPayment;
    /**
     * Check Ethereum/ERC20 payment
     */
    private static checkEthereumPayment;
    /**
     * Check Bitcoin payment
     */
    private static checkBitcoinPayment;
    /**
     * Check Solana payment
     */
    private static checkSolanaPayment;
    /**
     * Check Starknet payment
     */
    /**
 * Check Starknet payment with multiple fallback strategies
 */
    private static checkStarknetPayment;
    /**
     * Check Starknet payment with optimized timeouts and retry logic
     */
    /**
     * Get payment statistics for the merchant
     */
    static getPaymentStats(req: AuthRequest, res: Response): Promise<void>;
}
//# sourceMappingURL=QRPaymentController.d.ts.map