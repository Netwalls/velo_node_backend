import { AppDataSource } from '../config/database';
import { User } from '../../../../src/entities/User';
import { KYCDocument } from '../../../../src/entities/KYCDocument';
import { Transaction } from '../../../../src/entities/Transaction';
import { FraudAlert, FraudAlertStatus } from '../entities/FraudAlert';
import { AdminAuditLog, AuditAction } from '../entities/AdminAuditLog';
import { ILike, In } from 'typeorm';

export interface UserSearchFilters {
  search?: string; // Email, phone, or name
  status?: string; // active, suspended, banned
  kycStatus?: string;
  hasTransactions?: boolean;
  createdAfter?: Date;
  createdBefore?: Date;
}

export class UserManagementService {
  private userRepo = AppDataSource.getRepository(User);
  private kycRepo = AppDataSource.getRepository(KYCDocument);
  private transactionRepo = AppDataSource.getRepository(Transaction);
  private fraudRepo = AppDataSource.getRepository(FraudAlert);
  private auditRepo = AppDataSource.getRepository(AdminAuditLog);

  async listUsers(filters: UserSearchFilters, page: number = 1, limit: number = 50) {
    const query = this.userRepo.createQueryBuilder('user');

    // Search by email, phone, or name
    if (filters.search) {
      query.andWhere(
        '(user.email ILIKE :search OR user.phone ILIKE :search OR user.firstName ILIKE :search OR user.lastName ILIKE :search)',
        { search: `%${filters.search}%` }
      );
    }

    // Filter by status
    if (filters.status) {
      query.andWhere('user.status = :status', { status: filters.status });
    }

    // Filter by KYC status
    if (filters.kycStatus) {
      query.andWhere('user.kycStatus = :kycStatus', { kycStatus: filters.kycStatus });
    }

    // Filter by date range
    if (filters.createdAfter) {
      query.andWhere('user.createdAt >= :after', { after: filters.createdAfter });
    }
    if (filters.createdBefore) {
      query.andWhere('user.createdAt <= :before', { before: filters.createdBefore });
    }

    const [users, total] = await query
      .orderBy('user.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUserDetails(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }

    // Get KYC documents
    const kycDocs = await this.kycRepo.find({ where: { userId } });

    // Get transaction summary
    const transactionStats = await this.transactionRepo
      .createQueryBuilder('txn')
      .select('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(txn.amount), 0)', 'totalVolume')
      .where('txn.userId = :userId', { userId })
      .getRawOne();

    // Get recent transactions
    const recentTransactions = await this.transactionRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 10,
    });

    // Get fraud alerts
    const fraudAlerts = await this.fraudRepo.find({
      where: { userId, status: FraudAlertStatus.PENDING },
      order: { createdAt: 'DESC' },
    });

    // Get audit logs for this user
    const auditLogs = await this.auditRepo.find({
      where: { targetUserId: userId },
      order: { createdAt: 'DESC' },
      take: 20,
    });

    return {
      user,
      kycDocs,
      transactionStats: {
        count: parseInt(transactionStats.count),
        totalVolume: parseFloat(transactionStats.totalVolume),
      },
      recentTransactions,
      fraudAlerts,
      auditLogs,
    };
  }

  async suspendUser(userId: string, adminId: string, adminEmail: string, reason: string, ipAddress?: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }

    user.status = 'suspended';
    await this.userRepo.save(user);

    // Create audit log
    await this.auditRepo.save({
      adminId,
      adminEmail,
      action: AuditAction.USER_SUSPEND,
      targetUserId: userId,
      description: `User suspended: ${reason}`,
      metadata: { reason, previousStatus: user.status },
      ipAddress,
    });

    return user;
  }

  async banUser(userId: string, adminId: string, adminEmail: string, reason: string, ipAddress?: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }

    user.status = 'banned';
    await this.userRepo.save(user);

    // Create audit log
    await this.auditRepo.save({
      adminId,
      adminEmail,
      action: AuditAction.USER_BAN,
      targetUserId: userId,
      description: `User banned: ${reason}`,
      metadata: { reason, previousStatus: user.status },
      ipAddress,
    });

    return user;
  }

  async unlockUser(userId: string, adminId: string, adminEmail: string, ipAddress?: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }

    const previousStatus = user.status;
    user.status = 'active';
    await this.userRepo.save(user);

    // Create audit log
    await this.auditRepo.save({
      adminId,
      adminEmail,
      action: AuditAction.USER_UNLOCK,
      targetUserId: userId,
      description: 'User unlocked/reactivated',
      metadata: { previousStatus },
      ipAddress,
    });

    return user;
  }

  async getUserSegmentation() {
    const stats = await this.userRepo
      .createQueryBuilder('user')
      .select('user.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('user.status')
      .getRawMany();

    const kycStats = await this.userRepo
      .createQueryBuilder('user')
      .select('user.kycStatus', 'kycStatus')
      .addSelect('COUNT(*)', 'count')
      .groupBy('user.kycStatus')
      .getRawMany();

    return {
      byStatus: stats,
      byKycStatus: kycStats,
    };
  }
}
