import { AppDataSource } from '../config/database';
import { Transaction } from '../entities/Transaction';
import { AuthRequest } from '../types';
import { Response } from 'express';

export class TransactionController {
    static async getHistory(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { page = 1, limit = 20 } = req.query;
            const transactionRepo = AppDataSource.getRepository(Transaction);

            const [transactions, total] = await transactionRepo.findAndCount({
                where: { userId: req.user!.id },
                order: { createdAt: 'DESC' },
                take: Number(limit),
                skip: (Number(page) - 1) * Number(limit),
            });

            res.json({
                transactions,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    totalPages: Math.ceil(total / Number(limit)),
                },
            });
        } catch (error) {
            console.error('Get transaction history error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    static async sendTransaction(
        req: AuthRequest,
        res: Response
    ): Promise<void> {
        try {
            const { amount, currency, toAddress } = req.body;

            if (!req.user) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            // Assuming addresses is an array and you want the first address
            const userAddress = req.user.addresses?.[0];
            if (!userAddress || !userAddress.address) {
                res.status(400).json({ error: 'User address not found' });
                return;
            }
            const chain = 'ethereum'; // or use a separate field if you have one
            const txHash = '0x...'; // or use a separate field if you have one

            await AppDataSource.getRepository(Transaction).save({
                userId: req.user.id,
                type: 'send',
                amount,
                currency: chain, // e.g., 'ethereum'
                toAddress,
                fromAddress: userAddress.address,
                txHash,
                status: 'confirmed',
                createdAt: new Date(),
            });

            res.json({ success: true });
        } catch (error) {
            console.error('Send transaction error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}
