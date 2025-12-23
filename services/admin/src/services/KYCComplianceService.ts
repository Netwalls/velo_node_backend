import { AppDataSource } from '../config/database';
import { KYCDocument } from '../../../../src/entities/KYCDocument';
import { User } from '../../../../src/entities/User';
import { AdminAuditLog, AuditAction } from '../entities/AdminAuditLog';
import { Transaction } from '../../../../src/entities/Transaction';

export interface KYCFilters {
  status?: string;
  verificationType?: string;
  submittedAfter?: Date;
  submittedBefore?: Date;
  riskLevel?: string;
}

export class KYCComplianceService {
  private kycRepo = AppDataSource.getRepository(KYCDocument);
  private userRepo = AppDataSource.getRepository(User);
  private auditRepo = AppDataSource.getRepository(AdminAuditLog);
  private transactionRepo = AppDataSource.getRepository(Transaction);

  async listPendingKYC(filters: KYCFilters, page: number = 1, limit: number = 50) {
    const query = this.kycRepo.createQueryBuilder('kyc').leftJoinAndSelect('kyc.user', 'user');

    // Default to pending
    if (!filters.status) {
      query.andWhere('kyc.status = :status', { status: 'pending' });
    } else {
      query.andWhere('kyc.status = :status', { status: filters.status });
    }

    if (filters.verificationType) {
      query.andWhere('kyc.verificationType = :type', { type: filters.verificationType });
    }

    if (filters.submittedAfter) {
      query.andWhere('kyc.createdAt >= :after', { after: filters.submittedAfter });
    }

    if (filters.submittedBefore) {
      query.andWhere('kyc.createdAt <= :before', { before: filters.submittedBefore });
    }

    const [documents, total] = await query
      .orderBy('kyc.createdAt', 'ASC') // Oldest first for review queue
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      documents,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getKYCDetails(kycId: string) {
    const kycDoc = await this.kycRepo.findOne({
      where: { id: kycId },
    });

    if (!kycDoc) {
      throw new Error('KYC document not found');
    }

    // Get user details
    const user = await this.userRepo.findOne({ where: { id: kycDoc.userId } });

    // Get user's transaction history for risk assessment
    const userTransactions = await this.transactionRepo.find({
      where: { userId: kycDoc.userId },
      order: { createdAt: 'DESC' },
      take: 10,
    });

    // Get other KYC submissions from this user
    const otherKYCDocs = await this.kycRepo.find({
      where: { userId: kycDoc.userId },
      order: { createdAt: 'DESC' },
    });

    return {
      kycDoc,
      user,
      userTransactions,
      otherKYCDocs,
      riskScore: this.calculateRiskScore(user, userTransactions),
    };
  }

  async approveKYC(
    kycId: string,
    adminId: string,
    adminEmail: string,
    notes?: string,
    ipAddress?: string
  ) {
    const kycDoc = await this.kycRepo.findOne({ where: { id: kycId } });
    if (!kycDoc) {
      throw new Error('KYC document not found');
    }

    // Update KYC status
    kycDoc.status = 'approved';
    kycDoc.reviewedAt = new Date();
    kycDoc.reviewedBy = adminId;
    kycDoc.reviewNotes = notes;
    await this.kycRepo.save(kycDoc);

    // Update user's KYC status
    const user = await this.userRepo.findOne({ where: { id: kycDoc.userId } });
    if (user) {
      user.kycStatus = 'approved';
      await this.userRepo.save(user);
    }

    // Create audit log
    await this.auditRepo.save({
      adminId,
      adminEmail,
      action: AuditAction.KYC_APPROVE,
      targetUserId: kycDoc.userId,
      targetResource: kycId,
      description: `KYC approved${notes ? `: ${notes}` : ''}`,
      metadata: { notes, verificationType: kycDoc.verificationType },
      ipAddress,
    });

    return kycDoc;
  }

  async rejectKYC(
    kycId: string,
    adminId: string,
    adminEmail: string,
    reason: string,
    ipAddress?: string
  ) {
    const kycDoc = await this.kycRepo.findOne({ where: { id: kycId } });
    if (!kycDoc) {
      throw new Error('KYC document not found');
    }

    // Update KYC status
    kycDoc.status = 'rejected';
    kycDoc.reviewedAt = new Date();
    kycDoc.reviewedBy = adminId;
    kycDoc.reviewNotes = reason;
    await this.kycRepo.save(kycDoc);

    // Update user's KYC status
    const user = await this.userRepo.findOne({ where: { id: kycDoc.userId } });
    if (user) {
      user.kycStatus = 'rejected';
      await this.userRepo.save(user);
    }

    // Create audit log
    await this.auditRepo.save({
      adminId,
      adminEmail,
      action: AuditAction.KYC_REJECT,
      targetUserId: kycDoc.userId,
      targetResource: kycId,
      description: `KYC rejected: ${reason}`,
      metadata: { reason, verificationType: kycDoc.verificationType },
      ipAddress,
    });

    return kycDoc;
  }

  async getKYCStats() {
    const stats = await this.kycRepo
      .createQueryBuilder('kyc')
      .select('kyc.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('kyc.status')
      .getRawMany();

    const byType = await this.kycRepo
      .createQueryBuilder('kyc')
      .select('kyc.verificationType', 'type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('kyc.verificationType')
      .getRawMany();

    // Average review time
    const avgReviewTime = await this.kycRepo
      .createQueryBuilder('kyc')
      .select('AVG(EXTRACT(EPOCH FROM (kyc.reviewedAt - kyc.createdAt)))', 'avgSeconds')
      .where('kyc.reviewedAt IS NOT NULL')
      .getRawOne();

    return {
      byStatus: stats,
      byType,
      avgReviewTimeSeconds: avgReviewTime?.avgSeconds || 0,
    };
  }

  private calculateRiskScore(user: any, transactions: any[]): number {
    let score = 0;

    // New user (< 7 days)
    const accountAge = Date.now() - new Date(user.createdAt).getTime();
    if (accountAge < 7 * 24 * 60 * 60 * 1000) {
      score += 20;
    }

    // High transaction velocity
    if (transactions.length > 5) {
      score += 15;
    }

    // Large transaction amounts
    const totalVolume = transactions.reduce((sum, txn) => sum + parseFloat(txn.amount || 0), 0);
    if (totalVolume > 10000) {
      score += 25;
    }

    // Multiple failed transactions
    const failedCount = transactions.filter((txn) => txn.status === 'failed').length;
    if (failedCount > 2) {
      score += 20;
    }

    // Email not verified
    if (!user.isEmailVerified) {
      score += 10;
    }

    return Math.min(score, 100);
  }
}
