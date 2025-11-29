import crypto from 'crypto';
import { Request, Response } from 'express';
import { FiatTransaction } from '../entities/FiatTransaction';
import { paystackConfig } from '../services/paystack/config';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import initializeTransaction, {
  InitPaymentInput,
} from '../services/paystack/paystackService';
import { nanoid } from 'nanoid';
import calculateTotalCharge from '../services/paystack/feeService';
import dotenv from 'dotenv';
dotenv.config();

interface PaystackWebhookBody {
  event: string;
  data: {
    reference: string;
    amount: number;
    [key: string]: any;
  };
}

const fundWallet = async (req: Request, res: Response) => {
  try {
    const userRepository = AppDataSource.getRepository(User);
    const transactionRepository = AppDataSource.getRepository(FiatTransaction);

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const user = await userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { amount, paymentDescription, crypto } = req.body;

    if (!amount || typeof amount !== 'number' || isNaN(amount)) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    if (amount < 1000) {
      return res
        .status(400)
        .json({ error: 'Amount to be funded must be greater than 1000NGN' });
    }

    // Generate unique reference
    const paymentReference = `VELO_REF_${Date.now()}_${nanoid(8)}`;

    const fees = calculateTotalCharge(Number(amount));

    const response = await initializeTransaction({
      amount: fees.totalToCharge,
      customerEmail: user.email,
      crypto: crypto,
      paymentReference: paymentReference,
      paymentDescription: 'Wallet Funding',
      redirectUrl: `${process.env.FRONTEND_DOMAIN}/dashboard`,
    });

    // Save transaction in DB
    const transaction = transactionRepository.create({
      userId: user.id,
      amount: fees.userAmount,
      reference: paymentReference,
      crypto,
      status: 'pending',
      paymentDescription,
    });

    await transactionRepository.save(transaction);

    // Return response for frontend
    return res.status(200).json({
      message: 'Transaction initialized. Please complete payment.',
      checkoutUrl: response.data.authorization_url,
      reference: paymentReference,
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fund wallet' });
  }
};

const verifyTransactionWithWebhook = async (
  req: Request<{}, {}, PaystackWebhookBody>,
  res: Response
) => {
  try {
    const signature = req.headers['x-paystack-signature'] as string;
    const payload = JSON.stringify(req.body);

    if (!paystackConfig.secretKey) {
      throw new Error('PAYSTACK_SECRET_KEY is not set in environment');
    }

    const expectedSignature = crypto
      .createHmac('sha512', paystackConfig.secretKey)
      .update(payload)
      .digest('hex');

    if (signature !== expectedSignature) {
      logger.warn('Invalid Paystack webhook signature');
      return res
        .status(430)
        .json({ success: false, error: 'Invalid signature' });
    }

    const { event, data } = req.body;

    if (event !== 'charge.success') {
      return res.status(200).json({
        message: 'Paystack Webhook acknowledged: Skipped processing',
      });
    }

    const reference = data.reference;
    const amountPaid = data.amount / 100; // convert kobo → Naira

    const transactionRepository = AppDataSource.getRepository(FiatTransaction);

    const transaction = await transactionRepository.findOne({
      where: { reference },
    });

    if (!transaction) {
      return res
        .status(404)
        .json({ success: false, error: 'Transaction not found' });
    }

    if (transaction.status === 'success') {
      return res.status(200).json({
        message: 'Transaction has been processed earlier',
      });
    }

    // Mark transaction as successful
    transaction.status = 'success';
    await transactionRepository.save(transaction);

    return res.status(200).json({
      success: true,
      message: 'Transaction verified successfully',
      reference,
      amountPaid,
    });
  } catch (error: any) {
    return res
      .status(500)
      .json({ success: false, error: 'Internal server error' });
  }
};



export { fundWallet, verifyTransactionWithWebhook };
