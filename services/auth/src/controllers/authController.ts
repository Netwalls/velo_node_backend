import { Request, Response } from 'express';
import { createUserIfNotExists, findUserByEmail } from '../services/userService';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { generateOTP, getOTPExpiry, isOTPExpired } from '../utils/otp';
import { sendRegistrationEmails, sendOtp, sendPasswordReset } from '../services/emailService';
import { NotificationService } from '../services/notificationService';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { RefreshToken } from '../entities/RefreshToken';
import { encrypt, generateEthWallet, generateBtcWallet, generateSolWallet, generateStrkWallet, generateStellarWallet, generatePolkadotWallet } from '../utils/keygen';
import { UserAddress } from '../entities/UserAddress';

export class AuthController {
        static async register(req: Request, res: Response): Promise<any> {
        try {
            const { email, password } = req.body;
            if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

            const created = await createUserIfNotExists(email, password);
            if (!created) return res.status(409).json({ error: 'User already exists' });

            // generate wallets and save addresses synchronously so we can return them in the response
            const savedAddresses: Array<{ chain: string; network: string; address: string }> = [];
            try {
                const eth = generateEthWallet();
                const btc = generateBtcWallet();
                const sol = generateSolWallet();
                const stellar = generateStellarWallet();
                const polkadot = await generatePolkadotWallet();
                const strk = generateStrkWallet();

                const tron = generateEthWallet();
                const addresses = [
                    { chain: 'ethereum', network: 'mainnet', address: eth.mainnet.address, encryptedPrivateKey: encrypt(eth.mainnet.privateKey) },
                    { chain: 'ethereum', network: 'testnet', address: eth.testnet.address, encryptedPrivateKey: encrypt(eth.testnet.privateKey) },
                    { chain: 'bitcoin', network: 'mainnet', address: btc.mainnet.address, encryptedPrivateKey: encrypt(btc.mainnet.privateKey) },
                    { chain: 'bitcoin', network: 'testnet', address: btc.testnet.address, encryptedPrivateKey: encrypt(btc.testnet.privateKey) },
                    { chain: 'solana', network: 'mainnet', address: sol.mainnet.address, encryptedPrivateKey: encrypt(sol.mainnet.privateKey) },
                    { chain: 'solana', network: 'testnet', address: sol.testnet.address, encryptedPrivateKey: encrypt(sol.testnet.privateKey) },
                    { chain: 'starknet', network: 'mainnet', address: strk.mainnet.address, encryptedPrivateKey: encrypt(strk.mainnet.privateKey) },
                    { chain: 'starknet', network: 'testnet', address: strk.testnet.address, encryptedPrivateKey: encrypt(strk.testnet.privateKey) },
                    { chain: 'usdt_erc20', network: 'mainnet', address: eth.mainnet.address, encryptedPrivateKey: encrypt(eth.mainnet.privateKey) },
                    { chain: 'usdt_erc20', network: 'testnet', address: eth.testnet.address, encryptedPrivateKey: encrypt(eth.testnet.privateKey) },
                    { chain: 'usdt_trc20', network: 'mainnet', address: tron.mainnet.address, encryptedPrivateKey: encrypt(tron.mainnet.privateKey) },
                    { chain: 'usdt_trc20', network: 'testnet', address: tron.testnet.address, encryptedPrivateKey: encrypt(tron.testnet.privateKey) },
                    { chain: 'stellar', network: 'mainnet', address: stellar.mainnet.address, encryptedPrivateKey: encrypt(stellar.mainnet.privateKey) },
                    { chain: 'stellar', network: 'testnet', address: stellar.testnet.address, encryptedPrivateKey: encrypt(stellar.testnet.privateKey) },
                    { chain: 'polkadot', network: 'mainnet', address: polkadot.mainnet.address, encryptedPrivateKey: encrypt(polkadot.mainnet.privateKey) },
                    { chain: 'polkadot', network: 'testnet', address: polkadot.testnet.address, encryptedPrivateKey: encrypt(polkadot.testnet.privateKey) },
                ];

                const addressRepo = AppDataSource.getRepository(UserAddress);
                for (const a of addresses) {
                    try {
                        const s = await addressRepo.save({ ...a, user: created, userId: created.id });
                        savedAddresses.push({ chain: a.chain, network: a.network, address: a.address });
                        console.log(`Saved wallet address for user=${created.id} chain=${a.chain} network=${a.network} address=${a.address}`);
                    } catch (err) {
                        console.error('Failed to save address', err);
                    }
                }
                if (savedAddresses.length) console.log(`Wallet generation completed for user=${created.id}: ${savedAddresses.length} addresses saved`);
            } catch (err) {
                console.error('Wallet generation failed', err);
            }

            // OTP generation and email
            const otp = generateOTP();
            created.emailOTP = otp;
            created.emailOTPExpiry = getOTPExpiry();
            await AppDataSource.getRepository(User).save(created);
            await sendRegistrationEmails(email, otp);
            if (created.id) {
                await NotificationService.notifyRegistration(created.id, { email, registrationDate: new Date() });
            }

            const chainMap: Record<string, string> = {
                ethereum: 'eth',
                bitcoin: 'btc',
                solana: 'sol',
                stellar: 'xlm',
                polkadot: 'dot',
                starknet: 'strk',
                usdt_erc20: 'usdterc20',
                usdt_trc20: 'usdttrc20',
            };

            const formattedAddresses = savedAddresses.map((a) => ({
                chain: chainMap[a.chain] || a.chain,
                network: a.network,
                address: a.address,
            }));

            return res.status(201).json({
                message: 'User registered successfully. Please verify your email.',
                userId: created.id,
                addresses: formattedAddresses,
            });
        } catch (err) {
            console.error('Register error:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }

        static async login(req: Request, res: Response): Promise<any> {
        try {
            const { email, password } = req.body;
            if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
            const user = await findUserByEmail(email);
            if (!user) return res.status(401).json({ error: 'Invalid credentials' });
            const valid = await user.comparePassword(password);
            if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
            if (!user.isEmailVerified) return res.status(403).json({ error: 'Email not verified. Please verify your email before logging in.' });
            const payload = { userId: user.id, email: user.email };
            const accessToken = generateAccessToken(payload);
            const refreshToken = generateRefreshToken(payload);
            const refreshRepo = AppDataSource.getRepository(RefreshToken);
            const tokenEntity = refreshRepo.create({ token: refreshToken, userId: user.id, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) });
            await refreshRepo.save(tokenEntity);
            // fire-and-forget post-login address generation + notification
            (async () => {
                try {
                    const addressRepo = AppDataSource.getRepository(UserAddress as any);
                    const existing = await addressRepo.find({ where: { userId: user.id } });
                    const chains = existing.map((e: any) => e.chain);
                    const toCreate: any[] = [];
                    if (!chains.includes('stellar')) {
                        const stellar = generateStellarWallet();
                        toCreate.push({ chain: 'stellar', network: 'mainnet', address: stellar.mainnet.address, encryptedPrivateKey: encrypt(stellar.mainnet.privateKey), user, userId: user.id });
                    }
                    if (!chains.includes('polkadot')) {
                        const polkadot = await generatePolkadotWallet();
                        toCreate.push({ chain: 'polkadot', network: 'mainnet', address: polkadot.mainnet.address, encryptedPrivateKey: encrypt(polkadot.mainnet.privateKey), user, userId: user.id });
                    }
                    const savedPost: any[] = [];
                    for (const r of toCreate) {
                        try {
                            const s = await addressRepo.save(r);
                            savedPost.push(s);
                            console.log(`Post-login: saved generated address for user=${user.id} chain=${r.chain} network=${r.network} address=${r.address}`);
                        } catch (e) {
                            console.error('Save generated address', e);
                        }
                    }
                    if (savedPost.length) console.log(`Post-login address generation completed for user=${user.id}: ${savedPost.length} addresses saved`);
                } catch (e) { console.error('Post-login address generation failed', e); }
            })();
            try { if (user.id) await NotificationService.notifyLogin(user.id, { loginTime: new Date(), userAgent: req.headers['user-agent'], ip: req.ip }); } catch (nErr) { console.error('Notify login failed', nErr); }
            return res.json({ message: 'Login successful', accessToken, refreshToken, user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, isEmailVerified: user.isEmailVerified, hasTransactionPin: !!user.transactionPin } });
        } catch (err) {
            console.error('Login error:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }

        static async verifyOTP(req: Request, res: Response): Promise<any> {
        try {
            const { email, otp } = req.body;
            const userRepository = AppDataSource.getRepository(User);
            const user = await userRepository.findOne({ where: { email } });
            if (!user) return res.status(404).json({ error: 'User not found' });
            if (!user.emailOTP || !user.emailOTPExpiry) return res.status(400).json({ error: 'OTP not found. Please request a new one.' });
            if (isOTPExpired(user.emailOTPExpiry)) return res.status(400).json({ error: 'OTP expired. Please request a new one.' });
            if (user.emailOTP !== otp) return res.status(400).json({ error: 'Invalid OTP' });
            user.isEmailVerified = true; user.emailOTP = undefined; user.emailOTPExpiry = undefined; await userRepository.save(user);
            try { if (user.id) await NotificationService.notifyOTPVerified(user.id, { verificationTime: new Date(), email: user.email }); } catch (nErr) { console.error('Notify OTP verified failed', nErr); }
            return res.json({ message: 'Email verified successfully' });
        } catch (err) { console.error('OTP verification error:', err); return res.status(500).json({ error: 'Internal server error' }); }
    }

        static async resendOTP(req: Request, res: Response): Promise<any> {
        try {
            const { email } = req.body;
            const userRepository = AppDataSource.getRepository(User);
            const user = await userRepository.findOne({ where: { email } });
            if (!user) return res.status(404).json({ error: 'User not found' });
            if (user.isEmailVerified) return res.status(400).json({ error: 'Email already verified' });
            const otp = generateOTP(); user.emailOTP = otp; user.emailOTPExpiry = getOTPExpiry(); await userRepository.save(user);
            try { await sendOtp(email, otp); } catch (e) { console.error('Send OTP failed', e); }
            return res.json({ message: 'OTP sent successfully' });
        } catch (err) { console.error('Resend OTP error:', err); return res.status(500).json({ error: 'Internal server error' }); }
    }

        static async refreshToken(req: Request, res: Response): Promise<any> {
        try {
            const { refreshToken } = req.body; if (!refreshToken) return res.status(401).json({ error: 'Refresh token required' });
            const refreshRepo = AppDataSource.getRepository(RefreshToken); const decoded = verifyRefreshToken(refreshToken);
            const tokenEntity = await refreshRepo.findOne({ where: { token: refreshToken, isRevoked: false } });
            if (!tokenEntity || !tokenEntity.expiresAt || tokenEntity.expiresAt < new Date()) return res.status(403).json({ error: 'Invalid refresh token' });
            const userRepo = AppDataSource.getRepository(User); const user = await userRepo.findOne({ where: { id: decoded.userId } }); if (!user) return res.status(403).json({ error: 'User not found' });
            const payload = { userId: user.id, email: user.email }; const newAccessToken = generateAccessToken(payload); return res.json({ accessToken: newAccessToken });
        } catch (err) { console.error('Token refresh error:', err); return res.status(403).json({ error: 'Invalid refresh token' }); }
    }

        static async logout(req: Request, res: Response): Promise<any> {
        try {
            const { refreshToken } = req.body; const refreshRepo = AppDataSource.getRepository(RefreshToken); if (refreshToken) await refreshRepo.update({ token: refreshToken }, { isRevoked: true }); return res.json({ message: 'Logged out successfully' });
        } catch (err) { console.error('Logout error:', err); return res.status(500).json({ error: 'Internal server error' }); }
    }

        static async logoutAll(req: Request, res: Response): Promise<any> {
        try { const refreshRepo = AppDataSource.getRepository(RefreshToken); const user = (req as any).user; if (user) await refreshRepo.update({ userId: user.id }, { isRevoked: true }); return res.json({ message: 'Logged out from all devices successfully' }); } catch (err) { console.error('Logout all error:', err); return res.status(500).json({ error: 'Internal server error' }); }
    }

        static async forgotPassword(req: Request, res: Response): Promise<any> {
        try {
            const { email } = req.body; if (!email) return res.status(400).json({ error: 'Email is required' });
            const userRepository = AppDataSource.getRepository(User); const user = await userRepository.findOne({ where: { email } });
            if (!user) return res.json({ message: 'If the email exists, you will receive a password reset link' });
            const resetToken = generateOTP(); const resetExpiry = new Date(); resetExpiry.setMinutes(resetExpiry.getMinutes() + 15);
            user.passwordResetToken = resetToken; user.passwordResetExpiry = resetExpiry; await userRepository.save(user);
            try { await sendPasswordReset(email, resetToken); } catch (emailError) { console.error('Failed to send reset email:', emailError); }
            try { if (user.id) await NotificationService.createNotification(user.id, 'SECURITY_ALERT', 'Password Reset Requested', 'A password reset was requested for your account', { email, timestamp: new Date(), ipAddress: req.ip }); } catch (notificationError) { console.error('Failed to create reset notification:', notificationError); }
            return res.json({ message: 'If the email exists, you will receive a password reset link' });
        } catch (err) { console.error('Forgot password error:', err); return res.status(500).json({ error: 'Internal server error' }); }
    }

        static async verifyResetToken(req: Request, res: Response): Promise<any> {
        try {
            const { email, token } = req.body; if (!email || !token) return res.status(400).json({ error: 'Email and reset token are required' });
            const userRepository = AppDataSource.getRepository(User); const user = await userRepository.findOne({ where: { email } }); if (!user) return res.status(400).json({ error: 'Invalid reset token' });
            if (user.passwordResetToken !== token || !user.passwordResetExpiry || new Date() > user.passwordResetExpiry) {
                return res.status(400).json({ error: 'Invalid or expired reset token' });
            }
            return res.json({ message: 'Reset token is valid', canResetPassword: true });
        } catch (err) { console.error('Verify reset token error:', err); return res.status(500).json({ error: 'Internal server error' }); }
    }

        static async resetPassword(req: Request, res: Response): Promise<any> {
        try {
            const { email, token, newPassword } = req.body; if (!email || !token || !newPassword) return res.status(400).json({ error: 'Email, reset token, and new password are required' });
            if (newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters long' });
            const userRepository = AppDataSource.getRepository(User); const user = await userRepository.findOne({ where: { email } }); if (!user) return res.status(400).json({ error: 'Invalid reset token' });
            if (user.passwordResetToken !== token || !user.passwordResetExpiry || new Date() > user.passwordResetExpiry) return res.status(400).json({ error: 'Invalid or expired reset token' });
            user.password = newPassword; user.passwordResetToken = undefined; user.passwordResetExpiry = undefined; await userRepository.save(user);
            const refreshTokenRepository = AppDataSource.getRepository(RefreshToken); await refreshTokenRepository.update({ userId: user.id }, { isRevoked: true });
            try { await sendPasswordReset(user.email, ''); } catch (emailError) { console.error('Failed to send password change confirmation:', emailError); }
            try { if (user.id) await NotificationService.createNotification(user.id, 'PASSWORD_CHANGE', 'Password Changed', 'Your password has been successfully changed', { email, timestamp: new Date(), ipAddress: req.ip }); } catch (notificationError) { console.error('Failed to create password change notification:', notificationError); }
            return res.json({ message: 'Password reset successfully. Please log in with your new password.' });
        } catch (err) { console.error('Reset password error:', err); return res.status(500).json({ error: 'Internal server error' }); }
    }
}
