import { Response } from 'express';
import { AuthRequest } from '../types';
export declare class StrkController {
    /**
     * Get testnet balances for the authenticated user
     * Returns balances for all testnet addresses only
     * Also checks and deploys Starknet accounts if they have sufficient funds
     */
    static getTestnetBalancesDeploy(req: AuthRequest, res: Response): Promise<void>;
    /**
     * Get mainnet balances for the authenticated user
     * Returns balances for all mainnet addresses only
     * Also checks and deploys Starknet accounts if they have sufficient funds
     */
    static getMainnetBalancesDeploy(req: AuthRequest, res: Response): Promise<void>;
}
//# sourceMappingURL=StrkDeploymentController.d.ts.map