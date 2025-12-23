import { AppDataSource } from '../config/database';
import { Transaction } from '../../../../src/entities/Transaction';
import { FiatOrder } from '../../../../src/entities/FiatOrder';
import { AdminAuditLog, AuditAction } from '../entities/AdminAuditLog';
import { Between, In, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';

export interface TransactionFilters {
  userId?: string;
  type?: string;
  status?: string;
  chain?: string;
  minAmount?: number;
  maxAmount?: number;
  startDate?: Date;
  endDate?: Date;
  search?: string; // Transaction hash or ID
}

export class TransactionMonitoringService {
  private transactionRepo = AppDataSource.getRepository(Transaction);
  private fiatOrderRepo = AppDataSource.getRepository(FiatOrder);
  private auditRepo = AppDataSource.getRepository(AdminAuditLog);

  async listTransactions(filters: TransactionFilters, page: number = 1, limit: number = 50) {
    const query = this.transactionRepo.createQueryBuilder('txn');

    if (filters.userId) {
      query.andWhere('txn.userId = :userId', { userId: filters.userId });
    }

    if (filters.type) {
      query.andWhere('txn.type = :type', { type: filters.type });
    }

    if (filters.status) {
      query.andWhere('txn.status = :status', { status: filters.status });
    }

    if (filters.chain) {
      query.andWhere('txn.chain = :chain', { chain: filters.chain });
    }

    if (filters.minAmount !== undefined) {
      query.andWhere('txn.amount >= :minAmount', { minAmount: filters.minAmount });
    }

    if (filters.maxAmount !== undefined) {
      query.andWhere('txn.amount <= :maxAmount', { maxAmount: filters.maxAmount });
    }

    if (filters.startDate) {
      query.andWhere('txn.createdAt >= :startDate', { startDate: filters.startDate });
    }

    if (filters.endDate) {
      query.andWhere('txn.createdAt <= :endDate', { endDate: filters.endDate });
    }

    if (filters.search) {
      query.andWhere('(txn.id ILIKE :search OR txn.txHash ILIKE :search)', {
        search: `%${filters.search}%`,
      });
    }

    const [transactions, total] = await query
      .orderBy('txn.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      transactions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getTransactionDetails(transactionId: string) {
    const transaction = await this.transactionRepo.findOne({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new Error('Transaction not found');
    }

    // Get related fiat order if exists
    let fiatOrder = null;
    if (transaction.type === 'fiat_deposit' || transaction.type === 'fiat_withdrawal') {
      fiatOrder = await this.fiatOrderRepo.findOne({
        where: { transactionId },
      });
    }

    // Get audit logs for this transaction
    const auditLogs = await this.auditRepo.find({
      where: { targetResource: transactionId },
      order: { createdAt: 'DESC' },
    });

    return {
      transaction,
      fiatOrder,
      auditLogs,
    };
  }

  async flagTransaction(
    transactionId: string,
    adminId: string,
    adminEmail: string,
    reason: string,
    ipAddress?: string
  ) {
    const transaction = await this.transactionRepo.findOne({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new Error('Transaction not found');
    }

    // Update transaction with flag
    transaction.metadata = {
      ...transaction.metadata,
      flagged: true,
      flagReason: reason,
      flaggedBy: adminId,
      flaggedAt: new Date(),
    };
    await this.transactionRepo.save(transaction);

    // Create audit log
    await this.auditRepo.save({
      adminId,
      adminEmail,
      action: AuditAction.TRANSACTION_FLAG,
      targetUserId: transaction.userId,
      targetResource: transactionId,
      description: `Transaction flagged: ${reason}`,
      metadata: { reason },
      ipAddress,
    });

    return transaction;
  }

  async getTransactionStats(filters: { startDate?: Date; endDate?: Date }) {
    const query = this.transactionRepo.createQueryBuilder('txn');

    if (filters.startDate) {
      query.andWhere('txn.createdAt >= :startDate', { startDate: filters.startDate });
    }

    if (filters.endDate) {
      query.andWhere('txn.createdAt <= :endDate', { endDate: filters.endDate });
    }

    const stats = await query
      .select('txn.type', 'type')
      .addSelect('txn.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(txn.amount), 0)', 'totalAmount')
      .groupBy('txn.type, txn.status')
      .getRawMany();

    // Get total volume by chain
    const chainVolume = await this.transactionRepo
      .createQueryBuilder('txn')
      .select('txn.chain', 'chain')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(txn.amount), 0)', 'totalAmount')
      .groupBy('txn.chain')
      .getRawMany();

    return {
      byTypeAndStatus: stats,
      byChain: chainVolume,
    };
  }

  async exportTransactions(filters: TransactionFilters) {
    const query = this.transactionRepo.createQueryBuilder('txn');

    // Apply same filters as listTransactions
    if (filters.userId) {
      query.andWhere('txn.userId = :userId', { userId: filters.userId });
    }
    if (filters.type) {
      query.andWhere('txn.type = :type', { type: filters.type });
    }
    if (filters.status) {
      query.andWhere('txn.status = :status', { status: filters.status });
    }
    if (filters.startDate) {
      query.andWhere('txn.createdAt >= :startDate', { startDate: filters.startDate });
    }
    if (filters.endDate) {
      query.andWhere('txn.createdAt <= :endDate', { endDate: filters.endDate });
    }

    const transactions = await query.orderBy('txn.createdAt', 'DESC').getMany();

    // Convert to CSV-friendly format
    const csvData = transactions.map((txn) => ({
      id: txn.id,
      userId: txn.userId,
      type: txn.type,
      status: txn.status,
      amount: txn.amount,
      chain: txn.chain,
      txHash: txn.txHash || '',
      createdAt: txn.createdAt,
    }));

    return csvData;
  }
}
