import { Request, Response } from 'express';
import { AuthRequest } from '../types';
export declare class CryptoAirtimeController {
    /**
     * INSTANT PURCHASE - One-click airtime/data purchase using user's wallet balance
     * POST /api/payments/instant-buy
     */
    static instantBuy(req: AuthRequest, res: Response): Promise<void>;
    /**
     * FIXED: Get user's balance for a specific token/chain/network
     * Now properly fetches on-chain balance
     */
    private static getUserBalance;
    /**
     * FIXED: Deduct amount from user's wallet
     * Creates a DEBIT transaction instead of trying to "convert"
     */
    private static deductFromWallet;
    /**
     * FIXED: Refund amount back to user's wallet
     * Creates a CREDIT transaction
     */
    private static refundToWallet;
    private static getSolanaBalance;
    private static getBitcoinBalance;
    private static getEthereumBalance;
    private static getStellarBalance;
    private static getStarknetBalance;
    private static getPolkadotBalance;
    private static getTronUSDTBalance;
    private static getDataPlanPrice;
    private static getCablePlanPrice;
    static getOrderStatus(req: AuthRequest, res: Response): Promise<void>;
    private static getTokenForChain;
    private static convertNGNToUSD;
    private static getNetworkName;
}
export declare const PaymentController: {
    instantBuy: typeof CryptoAirtimeController.instantBuy;
    getOrder: typeof CryptoAirtimeController.getOrderStatus;
    getConversionRates: (_req: Request, res: Response) => Promise<void>;
    getSpecificRate: (_req: Request, res: Response) => Promise<void>;
    calculateConversion: (_req: Request, res: Response) => Promise<void>;
    convertToUSDT: (_req: Request, res: Response) => Promise<void>;
    getUSDTBalance: (_req: Request, res: Response) => Promise<void>;
    getConversionHistory: (_req: Request, res: Response) => Promise<void>;
    cancelConversion: (_req: Request, res: Response) => Promise<void>;
    buyAirtime: (_req: Request, res: Response) => Promise<void>;
    buyDatabundle: (_req: Request, res: Response) => Promise<void>;
    buyCable: (_req: Request, res: Response) => Promise<void>;
    createCryptoAirtimeOrder: (_req: Request, res: Response) => Promise<void>;
    attachTxToOrder: (_req: Request, res: Response) => Promise<void>;
    queryNellobytes: (_req: Request, res: Response) => Promise<void>;
    cancelNellobytes: (_req: Request, res: Response) => Promise<void>;
    simulatePaymentDetection: (_req: Request, res: Response) => Promise<void>;
};
//# sourceMappingURL=paymentController.d.ts.map