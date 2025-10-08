// controllers/MerchantController.ts
import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import {
    MerchantPayment,
    MerchantPaymentStatus,
} from '../entities/MerchantPayment';
import { Notification } from '../entities/Notification';
import { NotificationType } from '../types/index';
import { AuthRequest } from '../types';
import { PaymentMonitorService } from '../utils/PaymentMonitorService';

function isValidEthAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
}
function isValidBtcAddress(address: string): boolean {
    return /^[13mn2][a-zA-Z0-9]{25,39}$/.test(address);
}

// Create singleton instance of monitoring service
const paymentMonitor = new PaymentMonitorService();

export class MerchantController {
    // Create a new payment request
    static async createPayment(req: AuthRequest, res: Response) {
        try {
            const {
                amount,
                chain,
                network,
                ethAddress,
                btcAddress,
                solAddress,
                strkAddress,
                usdtErc20Address,
                usdtTrc20Address,
            } = req.body;
            const userId = req.user!.id;

            // Determine the address
            const address =
                ethAddress ||
                btcAddress ||
                solAddress ||
                strkAddress ||
                usdtErc20Address ||
                usdtTrc20Address;

            if (!address) {
                return res
                    .status(400)
                    .json({ error: 'At least one address must be provided.' });
            }

            if (chain === 'bitcoin' && !isValidBtcAddress(address)) {
                return res
                    .status(400)
                    .json({ error: 'Invalid Bitcoin address for BTC payment' });
            }
            if (chain === 'ethereum' && !isValidEthAddress(address)) {
                return res
                    .status(400)
                    .json({
                        error: 'Invalid Ethereum address for ETH payment',
                    });
            }

            const paymentRepo = AppDataSource.getRepository(MerchantPayment);

            const payment = paymentRepo.create({
                userId,
                amount,
                chain,
                network,
                ethAddress,
                btcAddress,
                solAddress,
                strkAddress,
                usdtErc20Address,
                usdtTrc20Address,
                address,
                status: MerchantPaymentStatus.PENDING,
            });
            await paymentRepo.save(payment);

            await AppDataSource.getRepository(Notification).save({
                userId,
                type: NotificationType.QR_PAYMENT_CREATED,
                title: 'QR Payment Created',
                message: `You created a QR payment request for ${amount} on ${chain}`,
                details: {
                    amount,
                    chain,
                    network,
                    paymentId: payment.id,
                },
                isRead: false,
                createdAt: new Date(),
            });

            // Start monitoring the payment
            await paymentMonitor.startMonitoring(payment.id);

            res.json({ 
                message: 'Payment request created and monitoring started', 
                payment 
            });
        } catch (error) {
            console.error('Create payment error:', error);
            res.status(500).json({ error: 'Failed to create payment request' });
        }
    }

    // Get all payment requests for the merchant
    static async getPayments(req: AuthRequest, res: Response) {
        try {
            const userId = req.user!.id;
            const paymentRepo = AppDataSource.getRepository(MerchantPayment);
            const payments = await paymentRepo.find({ 
                where: { userId },
                order: { createdAt: 'DESC' }
            });
            res.json({ payments });
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch payments' });
        }
    }

    // Get a single payment by ID
    static async getPaymentById(req: AuthRequest, res: Response) {
        try {
            const userId = req.user!.id;
            const { paymentId } = req.params;
            
            const paymentRepo = AppDataSource.getRepository(MerchantPayment);
            const payment = await paymentRepo.findOne({ 
                where: { 
                    id: paymentId,
                    userId 
                } 
            });

            if (!payment) {
                return res.status(404).json({ error: 'Payment not found' });
            }

            res.json({ payment });
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch payment' });
        }
    }

    // Manually check payment status (on-demand)
    static async checkPaymentStatus(req: AuthRequest, res: Response) {
        try {
            const userId = req.user!.id;
            const { paymentId } = req.params;
            
            const paymentRepo = AppDataSource.getRepository(MerchantPayment);
            const payment = await paymentRepo.findOne({ 
                where: { 
                    id: paymentId,
                    userId 
                } 
            });

            if (!payment) {
                return res.status(404).json({ error: 'Payment not found' });
            }

            // Trigger immediate check
            await paymentMonitor.startMonitoring(paymentId);

            // Fetch updated payment
            const updatedPayment = await paymentRepo.findOne({ 
                where: { id: paymentId } 
            });

            res.json({ 
                message: 'Payment status check initiated',
                payment: updatedPayment 
            });
        } catch (error) {
            console.error('Check payment status error:', error);
            res.status(500).json({ error: 'Failed to check payment status' });
        }
    }

    // Cancel a pending payment
    static async cancelPayment(req: AuthRequest, res: Response) {
        try {
            const userId = req.user!.id;
            const { paymentId } = req.params;
            
            const paymentRepo = AppDataSource.getRepository(MerchantPayment);
            const payment = await paymentRepo.findOne({ 
                where: { 
                    id: paymentId,
                    userId 
                } 
            });

            if (!payment) {
                return res.status(404).json({ error: 'Payment not found' });
            }

            if (payment.status !== MerchantPaymentStatus.PENDING) {
                return res.status(400).json({ 
                    error: 'Only pending payments can be cancelled' 
                });
            }

            payment.status = MerchantPaymentStatus.FAILED;
            await paymentRepo.save(payment);

            // Stop monitoring
            paymentMonitor.stopMonitoring(paymentId);

            await AppDataSource.getRepository(Notification).save({
                userId,
                type: NotificationType.QR_PAYMENT_CREATED,
                title: 'Payment Cancelled',
                message: `Payment request for ${payment.amount} ${payment.chain} was cancelled`,
                details: {
                    paymentId: payment.id,
                },
                isRead: false,
                createdAt: new Date(),
            });

            res.json({ 
                message: 'Payment cancelled successfully',
                payment 
            });
        } catch (error) {
            console.error('Cancel payment error:', error);
            res.status(500).json({ error: 'Failed to cancel payment' });
        }
    }

    // Initialize monitoring service (call on app startup)
    static async initializeMonitoring(): Promise<void> {
        await paymentMonitor.monitorAllPendingPayments();
    }

    // Cleanup monitoring service (call on app shutdown)
    static cleanupMonitoring(): void {
        paymentMonitor.cleanup();
    }
}

export { paymentMonitor };