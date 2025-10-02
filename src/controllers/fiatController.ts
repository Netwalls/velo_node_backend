import axios from 'axios';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { Request, Response } from 'express';
import { UserAddress } from '../entities/UserAddress';
import { ChainType, NetworkType } from '../types';

export class FiatController {
    static async initiateDeposit(req: Request, res: Response) {
        const { amount, email } = req.body; // amount in NGN, email of user

        try {
            const response = await axios.post(
                'https://api.paystack.co/transaction/initialize',
                {
                    email,
                    amount: amount * 100, // Paystack expects kobo
                },
                {
                    headers: {
                        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                        'Content-Type': 'application/json',
                    },
                }
            );
            const data = response.data as { data: { authorization_url: string } };
            res.json({
                authorization_url: data.data.authorization_url,
            });
        } catch (error) {
            res.status(500).json({
                error: 'Failed to initiate Paystack payment',
            });
        }
    }

    static async paystackWebhook(req: Request, res: Response) {
        try {
            const event = req.body;

            // Optionally: verify Paystack signature here for security

            if (event.event === 'charge.success') {
                const { email, amount } = event.data;

                // 1. Find user by email
                const userRepo = AppDataSource.getRepository(User);
                const user = await userRepo.findOne({ where: { email } });

                if (!user) {
                    console.log(
                        `User with email ${email} not found for Paystack webhook.`
                    );
                    return res.sendStatus(200);
                }

                // 2. Get real ETH/NGN rate
                const ethPriceNgn = await FiatController.getEthPriceInNGN();

                // 3. Convert NGN to ETH
                const amountNgn = amount / 100; // kobo to NGN
                const cryptoAmount = amountNgn / ethPriceNgn;

                // 4. Credit user's ETH wallet
                if (user.id) {
                    await FiatController.creditUserEthWallet(user.id, cryptoAmount);
                } else {
                    console.error(`User ID is undefined for user with email ${email}`);
                    return res.sendStatus(200);
                }

                // 5. Log transaction
                console.log(
                    `Paystack deposit successful for user ${email}: NGN ${amountNgn}, credited ${cryptoAmount} ETH`
                );

                return res.sendStatus(200);
            }

            res.sendStatus(200);
        } catch (error) {
            console.error('Paystack webhook error:', error);
            res.sendStatus(500);
        }
    }

    // Helper to get ETH/NGN price from CoinGecko
    static async getEthPriceInNGN(): Promise<number> {
        const resp = await axios.get(
            'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=ngn'
        );
        const data = resp.data as { ethereum: { ngn: number } };
        return data.ethereum.ngn;
    }

    // Helper to credit user's ETH wallet
    static async creditUserEthWallet(userId: string, amountEth: number) {
        const addressRepo = AppDataSource.getRepository(UserAddress);
        const ethWallet = await addressRepo.findOne({
    where: { userId, chain: ChainType.ETHEREUM, network: NetworkType.TESTNET },
});
        if (!ethWallet) throw new Error('ETH wallet not found for user');
        ethWallet.lastKnownBalance =
            Number(ethWallet.lastKnownBalance || 0) + amountEth;
        await addressRepo.save(ethWallet);
    }
}
