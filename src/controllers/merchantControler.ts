import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import {
    MerchantPayment,
    MerchantPaymentStatus,
} from '../entities/MerchantPayment';
import { Notification } from '../entities/Notification';
import { NotificationType } from '../types/index';
import { AuthRequest } from '../types';
import axios from 'axios';

function isValidEthAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
}
function isValidBtcAddress(address: string): boolean {
    return /^[13mn2][a-zA-Z0-9]{25,39}$/.test(address);
}

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

            // Add this block to determine the address
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
                address, // <-- set the address field
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

            res.json({ message: 'Payment request created', payment });
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
            const payments = await paymentRepo.find({ where: { userId } });
            res.json({ payments });
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch payments' });
        }
    }
}
