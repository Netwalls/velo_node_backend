import { Request, Response } from 'express';
import { qrPaymentService } from '../services/qrPaymentService';
import QRPaymentMonitorService from '../services/blockchainMonitorService';
import { MerchantPaymentStatus } from '../entities/MerchantPayment';

export class QRPaymentController {
  /**
   * Create a new QR payment request
   */
  static async createPayment(req: Request, res: Response) {
    try {
      const {
        userId,
        amount,
        chain,
        network,
        address,
        description,
        ethAddress,
        btcAddress,
        solAddress,
        strkAddress,
        stellarAddress,
        polkadotAddress,
        usdtErc20Address,
        usdtTrc20Address,
      } = req.body;

      // Validate required fields
      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Valid amount is required' });
      }

      if (!chain) {
        return res.status(400).json({ error: 'Chain is required' });
      }

      if (!address) {
        return res.status(400).json({ error: 'Address is required' });
      }

      const payment = await qrPaymentService.createPayment({
        userId,
        amount,
        chain,
        network: network || 'mainnet',
        address,
        description,
        ethAddress,
        btcAddress,
        solAddress,
        strkAddress,
        stellarAddress,
        polkadotAddress,
        usdtErc20Address,
        usdtTrc20Address,
      });

      res.status(201).json({
        message: 'QR payment request created successfully',
        payment: {
          id: payment.id,
          amount: payment.amount,
          chain: payment.chain,
          network: payment.network,
          address: payment.address,
          status: payment.status,
          qrData: payment.qrData,
          createdAt: payment.createdAt,
        },
      });
    } catch (error) {
      console.error('Create payment error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to create payment request' 
      });
    }
  }

  /**
   * Get all payments for a user
   */
  static async getPayments(req: Request, res: Response) {
    try {
      const { userId, status, chain, limit, offset } = req.query;

      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      const result = await qrPaymentService.getPayments({
        userId: userId as string,
        status: status as MerchantPaymentStatus,
        chain: chain as string,
        limit: limit ? Number(limit) : undefined,
        offset: offset ? Number(offset) : undefined,
      });

      res.json(result);
    } catch (error) {
      console.error('Get payments error:', error);
      res.status(500).json({ error: 'Failed to fetch payments' });
    }
  }

  /**
   * Get a single payment by ID
   */
  static async getPaymentById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { userId } = req.query;

      const payment = await qrPaymentService.getPaymentById(
        id,
        userId as string | undefined
      );

      if (!payment) {
        return res.status(404).json({ error: 'Payment not found' });
      }

      res.json({ payment });
    } catch (error) {
      console.error('Get payment by ID error:', error);
      res.status(500).json({ error: 'Failed to fetch payment' });
    }
  }

  /**
   * Cancel a payment
   */
  static async cancelPayment(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      const payment = await qrPaymentService.cancelPayment(id, userId);

      res.json({
        message: 'Payment cancelled successfully',
        payment,
      });
    } catch (error) {
      console.error('Cancel payment error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to cancel payment' 
      });
    }
  }

  /**
   * Check payment status on blockchain
   */
  static async checkPaymentStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const payment = await qrPaymentService.getPaymentById(id);

      if (!payment) {
        return res.status(404).json({ error: 'Payment not found' });
      }

      // If already completed or cancelled, return cached status
      if (payment.status !== MerchantPaymentStatus.PENDING) {
        return res.json({
          payment,
          blockchainStatus: {
            confirmed: payment.status === MerchantPaymentStatus.COMPLETED,
            transactionHash: payment.txHash || payment.transactionHash,
            cached: true,
          },
        });
      }

      // Check blockchain
      const blockchainStatus = await QRPaymentMonitorService.checkPayment(payment);

      res.json({
        payment,
        blockchainStatus,
      });
    } catch (error) {
      console.error('Check payment status error:', error);
      res.status(500).json({ error: 'Failed to check payment status' });
    }
  }

  /**
   * Monitor a specific payment
   */
  static async monitorPayment(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const payment = await qrPaymentService.getPaymentById(id);

      if (!payment) {
        return res.status(404).json({ error: 'Payment not found' });
      }

      // Skip if not pending
      if (payment.status !== MerchantPaymentStatus.PENDING) {
        return res.json({
          payment,
          blockchainStatus: {
            confirmed: payment.status === MerchantPaymentStatus.COMPLETED,
            transactionHash: payment.txHash || payment.transactionHash,
            skipped: true,
          },
        });
      }

      // Check blockchain
      const blockchainStatus = await QRPaymentMonitorService.checkPayment(payment);

      // Update payment if confirmed
      if (blockchainStatus.confirmed && blockchainStatus.transactionHash) {
        const updatedPayment = await qrPaymentService.markPaymentCompleted(
          payment,
          blockchainStatus.transactionHash
        );

        return res.json({
          payment: updatedPayment,
          blockchainStatus,
          updated: true,
        });
      }

      res.json({
        payment,
        blockchainStatus,
        updated: false,
      });
    } catch (error) {
      console.error('Monitor payment error:', error);
      res.status(500).json({ error: 'Failed to monitor payment' });
    }
  }

  /**
   * Monitor all pending payments
   */
  static async monitorAllPendingPayments(req: Request, res: Response) {
    try {
      const pendingPayments = await qrPaymentService.getPendingPayments();

      const results = [];

      for (const payment of pendingPayments) {
        try {
          const blockchainStatus = await QRPaymentMonitorService.checkPayment(payment);

          if (blockchainStatus.confirmed && blockchainStatus.transactionHash) {
            await qrPaymentService.markPaymentCompleted(
              payment,
              blockchainStatus.transactionHash
            );

            results.push({
              paymentId: payment.id,
              status: 'completed',
              transactionHash: blockchainStatus.transactionHash,
            });
          } else {
            results.push({
              paymentId: payment.id,
              status: 'still_pending',
            });
          }
        } catch (error) {
          console.error(`Error monitoring payment ${payment.id}:`, error);
          results.push({
            paymentId: payment.id,
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      res.json({
        message: `Monitored ${pendingPayments.length} pending payments`,
        checked: pendingPayments.length,
        completed: results.filter((r) => r.status === 'completed').length,
        results,
      });
    } catch (error) {
      console.error('Monitor all pending payments error:', error);
      res.status(500).json({ error: 'Failed to monitor pending payments' });
    }
  }

  /**
   * Get payment statistics
   */
  static async getPaymentStats(req: Request, res: Response) {
    try {
      const { userId } = req.query;

      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      const stats = await qrPaymentService.getPaymentStats(userId as string);

      res.json({ stats });
    } catch (error) {
      console.error('Get payment stats error:', error);
      res.status(500).json({ error: 'Failed to fetch payment statistics' });
    }
  }
}
