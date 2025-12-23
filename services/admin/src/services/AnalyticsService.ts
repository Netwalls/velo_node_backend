import { AppDataSource } from '../config/database';
import { User } from '../../../../src/entities/User';
import { Transaction } from '../../../../src/entities/Transaction';
import { AirtimePurchase } from '../../../../src/entities/AirtimePurchase';
import { DataPurchase } from '../../../../src/entities/DataPurchase';
import { ElectricityPurchase } from '../../../../src/entities/ElectricityPurchase';

export class AnalyticsService {
  private userRepo = AppDataSource.getRepository(User);
  private transactionRepo = AppDataSource.getRepository(Transaction);
  private airtimeRepo = AppDataSource.getRepository(AirtimePurchase);
  private dataRepo = AppDataSource.getRepository(DataPurchase);
  private electricityRepo = AppDataSource.getRepository(ElectricityPurchase);

  async getDailyActiveUsers(startDate: Date, endDate: Date) {
    const result = await this.transactionRepo
      .createQueryBuilder('txn')
      .select('DATE(txn.createdAt)', 'date')
      .addSelect('COUNT(DISTINCT txn.userId)', 'activeUsers')
      .where('txn.createdAt BETWEEN :start AND :end', { start: startDate, end: endDate })
      .groupBy('DATE(txn.createdAt)')
      .orderBy('DATE(txn.createdAt)', 'ASC')
      .getRawMany();

    return result;
  }

  async getMonthlyActiveUsers(startDate: Date, endDate: Date) {
    const result = await this.transactionRepo
      .createQueryBuilder('txn')
      .select("TO_CHAR(txn.createdAt, 'YYYY-MM')", 'month')
      .addSelect('COUNT(DISTINCT txn.userId)', 'activeUsers')
      .where('txn.createdAt BETWEEN :start AND :end', { start: startDate, end: endDate })
      .groupBy("TO_CHAR(txn.createdAt, 'YYYY-MM')")
      .orderBy("TO_CHAR(txn.createdAt, 'YYYY-MM')", 'ASC')
      .getRawMany();

    return result;
  }

  async getTransactionVolumeChart(startDate: Date, endDate: Date, granularity: 'day' | 'week' | 'month' = 'day') {
    let dateFormat: string;
    switch (granularity) {
      case 'week':
        dateFormat = "TO_CHAR(txn.createdAt, 'YYYY-IW')";
        break;
      case 'month':
        dateFormat = "TO_CHAR(txn.createdAt, 'YYYY-MM')";
        break;
      default:
        dateFormat = 'DATE(txn.createdAt)';
    }

    const result = await this.transactionRepo
      .createQueryBuilder('txn')
      .select(dateFormat, 'period')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(txn.amount), 0)', 'totalAmount')
      .where('txn.createdAt BETWEEN :start AND :end', { start: startDate, end: endDate })
      .groupBy(dateFormat)
      .orderBy(dateFormat, 'ASC')
      .getRawMany();

    return result;
  }

  async getUserCohortAnalysis(registrationMonth: string) {
    // Get users who registered in this month
    const users = await this.userRepo
      .createQueryBuilder('user')
      .select('user.id')
      .where("TO_CHAR(user.createdAt, 'YYYY-MM') = :month", { month: registrationMonth })
      .getMany();

    const userIds = users.map((u) => u.id);

    if (userIds.length === 0) {
      return { cohortSize: 0, retentionByMonth: [] };
    }

    // Track retention by month
    const retention = await this.transactionRepo
      .createQueryBuilder('txn')
      .select("TO_CHAR(txn.createdAt, 'YYYY-MM')", 'month')
      .addSelect('COUNT(DISTINCT txn.userId)', 'activeUsers')
      .where('txn.userId IN (:...userIds)', { userIds })
      .groupBy("TO_CHAR(txn.createdAt, 'YYYY-MM')")
      .orderBy("TO_CHAR(txn.createdAt, 'YYYY-MM')", 'ASC')
      .getRawMany();

    return {
      cohortSize: userIds.length,
      retentionByMonth: retention.map((r) => ({
        month: r.month,
        activeUsers: parseInt(r.activeUsers),
        retentionRate: ((parseInt(r.activeUsers) / userIds.length) * 100).toFixed(2),
      })),
    };
  }

  async getProviderPerformance(startDate: Date, endDate: Date) {
    // Airtime provider performance
    const airtimeStats = await this.airtimeRepo
      .createQueryBuilder('purchase')
      .select('purchase.provider', 'provider')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(purchase.amount), 0)', 'totalAmount')
      .addSelect('AVG(CASE WHEN purchase.status = :success THEN 1 ELSE 0 END) * 100', 'successRate')
      .where('purchase.createdAt BETWEEN :start AND :end', { start: startDate, end: endDate })
      .setParameter('success', 'completed')
      .groupBy('purchase.provider')
      .getRawMany();

    // Data provider performance
    const dataStats = await this.dataRepo
      .createQueryBuilder('purchase')
      .select('purchase.provider', 'provider')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(purchase.amount), 0)', 'totalAmount')
      .addSelect('AVG(CASE WHEN purchase.status = :success THEN 1 ELSE 0 END) * 100', 'successRate')
      .where('purchase.createdAt BETWEEN :start AND :end', { start: startDate, end: endDate })
      .setParameter('success', 'completed')
      .groupBy('purchase.provider')
      .getRawMany();

    return {
      airtime: airtimeStats,
      data: dataStats,
    };
  }

  async getRevenueMetrics(startDate: Date, endDate: Date) {
    // Calculate total fees collected
    const feeRevenue = await this.transactionRepo
      .createQueryBuilder('txn')
      .select('COALESCE(SUM((txn.metadata->>\'fee\')::numeric), 0)', 'totalFees')
      .where('txn.createdAt BETWEEN :start AND :end', { start: startDate, end: endDate })
      .andWhere("txn.metadata->>'fee' IS NOT NULL")
      .getRawOne();

    // Transaction volume by type
    const volumeByType = await this.transactionRepo
      .createQueryBuilder('txn')
      .select('txn.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(txn.amount), 0)', 'totalAmount')
      .where('txn.createdAt BETWEEN :start AND :end', { start: startDate, end: endDate })
      .groupBy('txn.type')
      .getRawMany();

    return {
      totalFees: parseFloat(feeRevenue.totalFees || '0'),
      volumeByType,
    };
  }

  async getTopUsers(limit: number = 10, metric: 'volume' | 'transactions' = 'volume') {
    const query = this.transactionRepo
      .createQueryBuilder('txn')
      .select('txn.userId', 'userId')
      .addSelect('COUNT(*)', 'transactionCount')
      .addSelect('COALESCE(SUM(txn.amount), 0)', 'totalVolume')
      .groupBy('txn.userId');

    if (metric === 'volume') {
      query.orderBy('totalVolume', 'DESC');
    } else {
      query.orderBy('transactionCount', 'DESC');
    }

    const results = await query.limit(limit).getRawMany();

    // Enrich with user details
    const enriched = await Promise.all(
      results.map(async (r) => {
        const user = await this.userRepo.findOne({ where: { id: r.userId } });
        return {
          userId: r.userId,
          email: user?.email,
          transactionCount: parseInt(r.transactionCount),
          totalVolume: parseFloat(r.totalVolume),
        };
      })
    );

    return enriched;
  }
}
