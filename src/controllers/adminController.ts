import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { Transaction } from '../entities/Transaction';
import { MerchantPayment } from '../entities/MerchantPayment';
import { SplitPaymentExecution } from '../entities/SplitPaymentExecution';

export class AdminController {
    /**
     * GET /admin/stats
     * Returns dashboard statistics: total users, total amount (confirmed transactions),
     * most used chain, and most used functionality counts (send, receive, qrpayment, splitting)
     */
    static async getStats(req: Request, res: Response) {
        try {
            const userRepo = AppDataSource.getRepository(User);
            const txRepo = AppDataSource.getRepository(Transaction);
            const merchantRepo = AppDataSource.getRepository(MerchantPayment);
            const splitExecRepo = AppDataSource.getRepository(SplitPaymentExecution);

            // Total users
            const totalUsers = await userRepo.count();

            // Total confirmed transaction amount (sum of confirmed transactions)
            const totalAmountRaw: any = await txRepo
                .createQueryBuilder('t')
                .select('COALESCE(SUM(t.amount), 0)', 'sum')
                .where('t.status = :status', { status: 'confirmed' })
                .getRawOne();

            const totalAmount = totalAmountRaw && totalAmountRaw.sum ? Number(totalAmountRaw.sum) : 0;

            // Most used chain by transaction count
            const chainRaw: any = await txRepo
                .createQueryBuilder('t')
                .select('t.chain', 'chain')
                .addSelect('COUNT(*)', 'count')
                .groupBy('t.chain')
                .orderBy('count', 'DESC')
                .limit(1)
                .getRawOne();

            const mostUsedChain = chainRaw && chainRaw.chain ? chainRaw.chain : null;

            // Per-chain breakdown: count and total confirmed amount per chain
            const perChainRows: any[] = await txRepo
                .createQueryBuilder('t')
                .select('t.chain', 'chain')
                .addSelect('COUNT(*)', 'count')
                .addSelect('COALESCE(SUM(CASE WHEN t.status = :status THEN t.amount ELSE 0 END), 0)', 'confirmed_sum')
                .setParameter('status', 'confirmed')
                .groupBy('t.chain')
                .orderBy('count', 'DESC')
                .getRawMany();

            const perChain = perChainRows.map((r) => ({
                chain: r.chain,
                count: Number(r.count || 0),
                confirmedAmount: Number(r.confirmed_sum || 0),
            }));

            // Functionality counts
            const sendCount = await txRepo.count({ where: { type: 'send' } });
            const receiveCount = await txRepo.count({ where: { type: 'receive' } });
            const qrCount = await merchantRepo.count(); // total QR payments created
            const splitCount = await splitExecRepo.count(); // total split executions

            res.json({
                stats: {
                    totalUsers,
                    totalConfirmedAmount: totalAmount,
                    mostUsedChain,
                    perChain,
                    usage: {
                        send: sendCount,
                        receive: receiveCount,
                        qrPayment: qrCount,
                        splitting: splitCount,
                    },
                },
            });
        } catch (error) {
            console.error('Admin stats error:', error);
            res.status(500).json({ error: 'Failed to fetch admin statistics' });
        }
    }
}

export default AdminController;
