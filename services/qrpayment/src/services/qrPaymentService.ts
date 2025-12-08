/**
 * QR Payment Service
 * Handles business logic for merchant QR payment requests
 */

import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { MerchantPayment, MerchantPaymentStatus } from '../entities/MerchantPayment';

export interface CreatePaymentDTO {
  userId: string;
  amount: number;
  chain: string;
  network?: string;
  address: string;
  description?: string;
  ethAddress?: string;
  btcAddress?: string;
  solAddress?: string;
  strkAddress?: string;
  stellarAddress?: string;
  polkadotAddress?: string;
  usdtErc20Address?: string;
  usdtTrc20Address?: string;
}

export interface PaymentQueryOptions {
  userId: string;
  status?: MerchantPaymentStatus;
  chain?: string;
  limit?: number;
  offset?: number;
}

export class QRPaymentService {
  private get paymentRepo(): Repository<MerchantPayment> {
    return AppDataSource.getRepository(MerchantPayment);
  }

  /**
   * Create a new QR payment request
   */
  async createPayment(data: CreatePaymentDTO): Promise<MerchantPayment> {
    // Validate amount
    if (!data.amount || data.amount <= 0) {
      throw new Error('Valid amount is required');
    }

    // Validate chain
    if (!data.chain) {
      throw new Error('Chain is required');
    }

    // Validate address
    if (!data.address) {
      throw new Error('Address is required');
    }

    // Generate QR data
    const qrData = `${data.chain}:${data.address}?amount=${data.amount}`;

    // Create payment record
    const payment = this.paymentRepo.create({
      userId: data.userId,
      amount: data.amount,
      chain: data.chain,
      network: data.network || 'mainnet',
      address: data.address,
      ethAddress: data.ethAddress,
      btcAddress: data.btcAddress,
      solAddress: data.solAddress,
      strkAddress: data.strkAddress,
      stellarAddress: data.stellarAddress,
      polkadotAddress: data.polkadotAddress,
      usdtErc20Address: data.usdtErc20Address,
      usdtTrc20Address: data.usdtTrc20Address,
      status: MerchantPaymentStatus.PENDING,
      description: data.description || `Payment request for ${data.amount} ${data.chain.toUpperCase()}`,
      qrData,
    });

    return await this.paymentRepo.save(payment);
  }

  /**
   * Get payments for a user with optional filters
   */
  async getPayments(options: PaymentQueryOptions): Promise<{
    payments: MerchantPayment[];
    total: number;
    pagination: {
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
    };
  }> {
    const limit = options.limit || 50;
    const offset = options.offset || 0;

    const queryBuilder = this.paymentRepo
      .createQueryBuilder('payment')
      .where('payment.userId = :userId', { userId: options.userId })
      .orderBy('payment.createdAt', 'DESC')
      .skip(offset)
      .take(limit);

    // Apply filters
    if (options.status) {
      queryBuilder.andWhere('payment.status = :status', { status: options.status });
    }

    if (options.chain) {
      queryBuilder.andWhere('payment.chain = :chain', { chain: options.chain });
    }

    const [payments, total] = await queryBuilder.getManyAndCount();

    return {
      payments,
      total,
      pagination: {
        total,
        limit,
        offset,
        hasMore: total > offset + limit,
      },
    };
  }

  /**
   * Get a single payment by ID
   */
  async getPaymentById(paymentId: string, userId?: string): Promise<MerchantPayment | null> {
    const where: any = { id: paymentId };
    if (userId) {
      where.userId = userId;
    }
    return await this.paymentRepo.findOne({ where });
  }

  /**
   * Cancel a pending payment
   */
  async cancelPayment(paymentId: string, userId: string): Promise<MerchantPayment> {
    const payment = await this.getPaymentById(paymentId, userId);

    if (!payment) {
      throw new Error('Payment not found');
    }

    if (payment.status !== MerchantPaymentStatus.PENDING) {
      throw new Error(`Cannot cancel payment with status: ${payment.status}`);
    }

    payment.status = MerchantPaymentStatus.CANCELLED;
    payment.updatedAt = new Date();

    return await this.paymentRepo.save(payment);
  }

  /**
   * Get payment statistics for a user
   */
  async getPaymentStats(userId: string): Promise<{
    total: number;
    pending: number;
    completed: number;
    cancelled: number;
    failed: number;
    totalAmount: number;
  }> {
    const payments = await this.paymentRepo.find({ where: { userId } });

    const stats = {
      total: payments.length,
      pending: 0,
      completed: 0,
      cancelled: 0,
      failed: 0,
      totalAmount: 0,
    };

    payments.forEach((payment) => {
      switch (payment.status) {
        case MerchantPaymentStatus.PENDING:
          stats.pending++;
          break;
        case MerchantPaymentStatus.COMPLETED:
          stats.completed++;
          stats.totalAmount += Number(payment.amount);
          break;
        case MerchantPaymentStatus.CANCELLED:
          stats.cancelled++;
          break;
        case MerchantPaymentStatus.FAILED:
          stats.failed++;
          break;
      }
    });

    return stats;
  }

  /**
   * Get all pending payments (for monitoring)
   */
  async getPendingPayments(): Promise<MerchantPayment[]> {
    return await this.paymentRepo.find({
      where: { status: MerchantPaymentStatus.PENDING },
    });
  }

  /**
   * Update payment status to completed
   */
  async markPaymentCompleted(
    payment: MerchantPayment,
    transactionHash: string
  ): Promise<MerchantPayment> {
    payment.status = MerchantPaymentStatus.COMPLETED;
    payment.txHash = transactionHash;
    payment.transactionHash = transactionHash;
    payment.completedAt = new Date();
    payment.updatedAt = new Date();

    return await this.paymentRepo.save(payment);
  }

  /**
   * Update payment status to failed
   */
  async markPaymentFailed(payment: MerchantPayment, error: string): Promise<MerchantPayment> {
    payment.status = MerchantPaymentStatus.FAILED;
    payment.updatedAt = new Date();

    return await this.paymentRepo.save(payment);
  }
}

// Export singleton instance
export const qrPaymentService = new QRPaymentService();
