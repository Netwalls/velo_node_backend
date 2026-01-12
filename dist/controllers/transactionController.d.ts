import { AuthRequest } from '../types';
import { Response } from 'express';
export declare class TransactionController {
    static getHistory(req: AuthRequest, res: Response): Promise<void>;
    static sendTransaction(req: AuthRequest, res: Response): Promise<void>;
    static sendTransactionByUsername(req: AuthRequest, res: Response): Promise<void>;
}
//# sourceMappingURL=transactionController.d.ts.map