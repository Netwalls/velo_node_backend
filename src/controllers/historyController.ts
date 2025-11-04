import { Response } from 'express';
import { AppDataSource } from '../config/database_migration';
import { Transaction } from '../entities/Transaction';
import { AuthRequest } from '../types';

export class HistoryController {
    // Get all transactions for the user
    static async getHistory(req: AuthRequest, res: Response): Promise<void> {
        try {
            const txRepo = AppDataSource.getRepository(Transaction);
            const transactions = await txRepo.find({
                where: { userId: req.user!.id },
                order: { createdAt: 'DESC' },
            });
            res.json({ transactions });
        } catch (error) {
            console.error('Get history error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}
