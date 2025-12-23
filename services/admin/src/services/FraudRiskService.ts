import { AppDataSource } from '../config/database';
import { FraudAlert, FraudAlertType, FraudAlertStatus } from '../entities/FraudAlert';
import { Blocklist, BlocklistType } from '../entities/Blocklist';
import { User } from '../../../../src/entities/User';
import { Transaction } from '../../../../src/entities/Transaction';
import { AdminAuditLog, AuditAction } from '../entities/AdminAuditLog';

export class FraudRiskService {
  private fraudRepo = AppDataSource.getRepository(FraudAlert);
  private blocklistRepo = AppDataSource.getRepository(Blocklist);
  private userRepo = AppDataSource.getRepository(User);
  private transactionRepo = AppDataSource.getRepository(Transaction);
  private auditRepo = AppDataSource.getRepository(AdminAuditLog);

  async listFraudAlerts(status?: FraudAlertStatus, page: number = 1, limit: number = 50) {
    const query = this.fraudRepo.createQueryBuilder('alert');

    if (status) {
      query.andWhere('alert.status = :status', { status });
    }

    const [alerts, total] = await query
      .orderBy('alert.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      alerts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async createFraudAlert(data: {
    userId: string;
    type: FraudAlertType;
    description: string;
    riskScore?: number;
    evidence?: any;
  }) {
    const alert = this.fraudRepo.create(data);
    return await this.fraudRepo.save(alert);
  }

  async reviewFraudAlert(
    alertId: string,
    adminId: string,
    adminEmail: string,
    status: FraudAlertStatus,
    notes?: string,
    ipAddress?: string
  ) {
    const alert = await this.fraudRepo.findOne({ where: { id: alertId } });
    if (!alert) {
      throw new Error('Fraud alert not found');
    }

    alert.status = status;
    alert.reviewedBy = adminId;
    alert.reviewedAt = new Date();
    alert.reviewNotes = notes;
    await this.fraudRepo.save(alert);

    // If confirmed fraud, suspend user
    if (status === FraudAlertStatus.CONFIRMED_FRAUD) {
      const user = await this.userRepo.findOne({ where: { id: alert.userId } });
      if (user) {
        user.status = 'suspended';
        await this.userRepo.save(user);

        await this.auditRepo.save({
          adminId,
          adminEmail,
          action: AuditAction.USER_SUSPEND,
          targetUserId: alert.userId,
          targetResource: alertId,
          description: `User suspended due to confirmed fraud: ${alert.type}`,
          metadata: { fraudAlertId: alertId, alertType: alert.type },
          ipAddress,
        });
      }
    }

    return alert;
  }

  async detectHighVelocityTransactions(userId: string, timeWindowMinutes: number = 60) {
    const since = new Date(Date.now() - timeWindowMinutes * 60 * 1000);

    const transactions = await this.transactionRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    const recentTxns = transactions.filter((txn) => new Date(txn.createdAt) > since);

    if (recentTxns.length > 10) {
      await this.createFraudAlert({
        userId,
        type: FraudAlertType.HIGH_VELOCITY,
        description: `User made ${recentTxns.length} transactions in ${timeWindowMinutes} minutes`,
        riskScore: Math.min(recentTxns.length * 5, 100),
        evidence: { transactionCount: recentTxns.length, timeWindowMinutes },
      });

      return true;
    }

    return false;
  }

  async addToBlocklist(
    type: BlocklistType,
    value: string,
    reason: string,
    adminId: string,
    adminEmail: string,
    expiresAt?: Date,
    ipAddress?: string
  ) {
    // Check if already exists
    const existing = await this.blocklistRepo.findOne({ where: { type, value } });
    if (existing) {
      existing.isActive = true;
      existing.reason = reason;
      existing.expiresAt = expiresAt;
      await this.blocklistRepo.save(existing);
      return existing;
    }

    const entry = this.blocklistRepo.create({
      type,
      value,
      reason,
      addedBy: adminId,
      expiresAt,
      isActive: true,
    });
    await this.blocklistRepo.save(entry);

    await this.auditRepo.save({
      adminId,
      adminEmail,
      action: AuditAction.BLOCKLIST_ADD,
      description: `Added ${type}: ${value} to blocklist`,
      metadata: { type, value, reason },
      ipAddress,
    });

    return entry;
  }

  async removeFromBlocklist(
    blocklistId: string,
    adminId: string,
    adminEmail: string,
    ipAddress?: string
  ) {
    const entry = await this.blocklistRepo.findOne({ where: { id: blocklistId } });
    if (!entry) {
      throw new Error('Blocklist entry not found');
    }

    entry.isActive = false;
    await this.blocklistRepo.save(entry);

    await this.auditRepo.save({
      adminId,
      adminEmail,
      action: AuditAction.BLOCKLIST_REMOVE,
      description: `Removed ${entry.type}: ${entry.value} from blocklist`,
      metadata: { type: entry.type, value: entry.value },
      ipAddress,
    });

    return entry;
  }

  async checkBlocklist(type: BlocklistType, value: string): Promise<boolean> {
    const entry = await this.blocklistRepo.findOne({
      where: { type, value, isActive: true },
    });

    if (!entry) return false;

    // Check expiration
    if (entry.expiresAt && new Date(entry.expiresAt) < new Date()) {
      entry.isActive = false;
      await this.blocklistRepo.save(entry);
      return false;
    }

    return true;
  }

  async listBlocklist(page: number = 1, limit: number = 50) {
    const [entries, total] = await this.blocklistRepo.findAndCount({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      entries,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getFraudStats() {
    const alertStats = await this.fraudRepo
      .createQueryBuilder('alert')
      .select('alert.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('alert.status')
      .getRawMany();

    const typeStats = await this.fraudRepo
      .createQueryBuilder('alert')
      .select('alert.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('alert.type')
      .getRawMany();

    const blocklistStats = await this.blocklistRepo
      .createQueryBuilder('bl')
      .select('bl.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('bl.isActive = true')
      .groupBy('bl.type')
      .getRawMany();

    return {
      alertsByStatus: alertStats,
      alertsByType: typeStats,
      blocklistByType: blocklistStats,
    };
  }
}
