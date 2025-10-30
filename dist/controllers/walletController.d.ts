import { Request, Response } from 'express';
import { AuthRequest } from '../types';
export declare class WalletController {
    /**
     * Get balances for a specific user by userId (admin or public endpoint).
     * @param req Express request (expects req.params.userId)
     * @param res Express response
     */
    static getBalancesByUserId(req: Request, res: Response): Promise<void>;
    /**
     * Controller for wallet-related actions.
     * Provides endpoints to fetch balances for all supported blockchains (ETH, BTC, SOL, STRK) for the authenticated user.
     */
    static getBalances(req: AuthRequest, res: Response): Promise<void>;
    /**
     * Send funds from a user's wallet to another address for a given chain/network.
     * POST /wallet/send
     * Body: { chain, network, toAddress, amount, fromAddress? }
     */
    static sendTransaction(req: AuthRequest, res: Response): Promise<void>;
    /**
     * Get user wallet addresses
     * Expects authenticated user in req.user
     * Returns all wallet addresses for the user
     */
    static getWalletAddresses(req: AuthRequest, res: Response): Promise<void>;
    /**
     * Get user testnet wallet addresses
     * Returns only chain and address for testnet networks
     */
    static getTestnetAddresses(req: AuthRequest, res: Response): Promise<void>;
    /**
     * Get user mainnet wallet addresses
     * Returns only chain and address for mainnet networks
     */
    static getMainnetAddresses(req: AuthRequest, res: Response): Promise<void>;
    /**
     * Get testnet balances for the authenticated user
     * Returns balances for all testnet addresses only
     */
    static getTestnetBalances(req: AuthRequest, res: Response): Promise<void>;
    /**
     * Get mainnet balances for the authenticated user
     * Returns balances for all mainnet addresses only
     */
    static getMainnetBalances(req: AuthRequest, res: Response): Promise<void>;
    /**
     * Checks all user addresses for new deposits and creates notifications.
     * Call this periodically (e.g., with a cron job or background worker).
     */
    static checkForDeposits(): Promise<void>;
}
//# sourceMappingURL=walletController.d.ts.map