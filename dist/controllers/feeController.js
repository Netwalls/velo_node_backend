"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeeController = void 0;
const feeService_1 = require("../services/feeService");
const database_1 = require("../config/database");
const Fee_1 = require("../entities/Fee");
class FeeController {
    /**
     * GET /fees/calculate
     * Calculate fee for a given amount
     */
    static async calculateFee(req, res) {
        try {
            const { amount } = req.query;
            if (!amount || isNaN(Number(amount))) {
                res.status(400).json({
                    error: 'Invalid amount parameter. Please provide a valid number.'
                });
                return;
            }
            const amountNum = parseFloat(String(amount));
            if (amountNum < 0) {
                res.status(400).json({
                    error: 'Amount cannot be negative'
                });
                return;
            }
            const calculation = feeService_1.FeeService.calculateFee(amountNum);
            res.json({
                success: true,
                calculation,
                message: `Fee calculated for $${amountNum}`
            });
        }
        catch (error) {
            console.error('Fee calculation error:', error);
            res.status(500).json({
                error: 'Failed to calculate fee',
                details: error?.message || String(error)
            });
        }
    }
    /**
     * POST /fees/calculate/batch
     * Calculate fees for multiple amounts
     */
    static async calculateBatchFees(req, res) {
        try {
            const { amounts } = req.body;
            if (!Array.isArray(amounts) || amounts.length === 0) {
                res.status(400).json({
                    error: 'Invalid amounts array. Please provide an array of numbers.'
                });
                return;
            }
            // Validate all amounts
            const validAmounts = amounts.every(amt => !isNaN(Number(amt)) && Number(amt) >= 0);
            if (!validAmounts) {
                res.status(400).json({
                    error: 'All amounts must be valid non-negative numbers'
                });
                return;
            }
            const numericAmounts = amounts.map(amt => parseFloat(String(amt)));
            const summary = feeService_1.FeeService.calculateBatchSummary(numericAmounts);
            res.json({
                success: true,
                summary,
                message: `Calculated fees for ${amounts.length} transactions`
            });
        }
        catch (error) {
            console.error('Batch fee calculation error:', error);
            res.status(500).json({
                error: 'Failed to calculate batch fees',
                details: error?.message || String(error)
            });
        }
    }
    /**
     * GET /fees/config
     * Get fee configuration and tiers
     */
    static async getFeeConfig(req, res) {
        try {
            const config = feeService_1.FeeService.getFeeConfig();
            const tiers = feeService_1.FeeService.getFeeTiers();
            const minimumAmount = feeService_1.FeeService.getMinimumTransactionAmount();
            res.json({
                success: true,
                config,
                tiers,
                minimumAmount,
                message: 'Fee configuration retrieved successfully'
            });
        }
        catch (error) {
            console.error('Get fee config error:', error);
            res.status(500).json({
                error: 'Failed to retrieve fee configuration',
                details: error?.message || String(error)
            });
        }
    }
    /**
     * GET /fees/history
     * Get fee history for authenticated user
     */
    static async getFeeHistory(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }
            const { limit = '50', offset = '0', feeType } = req.query;
            const feeRepo = database_1.AppDataSource.getRepository(Fee_1.Fee);
            const queryBuilder = feeRepo.createQueryBuilder('fee')
                .where('fee.userId = :userId', { userId })
                .orderBy('fee.createdAt', 'DESC')
                .skip(parseInt(String(offset)))
                .take(Math.min(parseInt(String(limit)), 100));
            if (feeType) {
                queryBuilder.andWhere('fee.feeType = :feeType', { feeType });
            }
            const [fees, total] = await queryBuilder.getManyAndCount();
            // Calculate totals
            const totalFeePaid = fees.reduce((sum, fee) => sum + parseFloat(fee.fee), 0);
            const totalTransacted = fees.reduce((sum, fee) => sum + parseFloat(fee.amount), 0);
            res.json({
                success: true,
                fees,
                pagination: {
                    total,
                    limit: parseInt(String(limit)),
                    offset: parseInt(String(offset)),
                    hasMore: total > parseInt(String(offset)) + fees.length
                },
                summary: {
                    totalFeePaid: Math.round(totalFeePaid * 100) / 100,
                    totalTransacted: Math.round(totalTransacted * 100) / 100,
                    averageFee: fees.length > 0 ? Math.round((totalFeePaid / fees.length) * 100) / 100 : 0,
                    transactionCount: fees.length
                },
                message: 'Fee history retrieved successfully'
            });
        }
        catch (error) {
            console.error('Get fee history error:', error);
            res.status(500).json({
                error: 'Failed to retrieve fee history',
                details: error?.message || String(error)
            });
        }
    }
    /**
     * GET /fees/stats
     * Get fee statistics (admin only)
     */
    static async getFeeStats(req, res) {
        try {
            const feeRepo = database_1.AppDataSource.getRepository(Fee_1.Fee);
            // Get total fees collected
            const result = await feeRepo
                .createQueryBuilder('fee')
                .select('SUM(CAST(fee.fee AS DECIMAL))', 'totalFees')
                .addSelect('COUNT(*)', 'transactionCount')
                .addSelect('AVG(CAST(fee.fee AS DECIMAL))', 'averageFee')
                .addSelect('fee.feeType', 'feeType')
                .groupBy('fee.feeType')
                .getRawMany();
            // Get today's fees
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayResult = await feeRepo
                .createQueryBuilder('fee')
                .select('SUM(CAST(fee.fee AS DECIMAL))', 'totalFees')
                .addSelect('COUNT(*)', 'transactionCount')
                .where('fee.createdAt >= :today', { today })
                .getRawOne();
            // Get tier distribution
            const tierDistribution = await feeRepo
                .createQueryBuilder('fee')
                .select('fee.tier', 'tier')
                .addSelect('COUNT(*)', 'count')
                .addSelect('SUM(CAST(fee.fee AS DECIMAL))', 'totalFees')
                .groupBy('fee.tier')
                .getRawMany();
            res.json({
                success: true,
                stats: {
                    byFeeType: result.map(r => ({
                        feeType: r.feeType,
                        totalFees: parseFloat(r.totalFees || '0'),
                        transactionCount: parseInt(r.transactionCount || '0'),
                        averageFee: parseFloat(r.averageFee || '0')
                    })),
                    today: {
                        totalFees: parseFloat(todayResult?.totalFees || '0'),
                        transactionCount: parseInt(todayResult?.transactionCount || '0')
                    },
                    tierDistribution: tierDistribution.map(t => ({
                        tier: t.tier,
                        count: parseInt(t.count || '0'),
                        totalFees: parseFloat(t.totalFees || '0')
                    }))
                },
                message: 'Fee statistics retrieved successfully'
            });
        }
        catch (error) {
            console.error('Get fee stats error:', error);
            res.status(500).json({
                error: 'Failed to retrieve fee statistics',
                details: error?.message || String(error)
            });
        }
    }
}
exports.FeeController = FeeController;
exports.default = FeeController;
//# sourceMappingURL=feeController.js.map