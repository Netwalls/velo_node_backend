"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const userService_1 = require("../services/userService");
const jwt_1 = require("../utils/jwt");
const otp_1 = require("../utils/otp");
const emailService_1 = require("../services/emailService");
const notificationService_1 = require("../services/notificationService");
const database_1 = require("../config/database");
const User_1 = require("../entities/User");
const RefreshToken_1 = require("../entities/RefreshToken");
const keygen_1 = require("../utils/keygen");
const UserAddress_1 = require("../entities/UserAddress");
class AuthController {
    static async register(req, res) {
        try {
            const { email, password } = req.body;
            if (!email || !password)
                return res.status(400).json({ error: 'Email and password required' });
            const created = await (0, userService_1.createUserIfNotExists)(email, password);
            if (!created)
                return res.status(409).json({ error: 'User already exists' });
            // generate wallets and save addresses asynchronously without blocking response
            (async () => {
                try {
                    const eth = (0, keygen_1.generateEthWallet)();
                    const btc = (0, keygen_1.generateBtcWallet)();
                    const sol = (0, keygen_1.generateSolWallet)();
                    const stellar = (0, keygen_1.generateStellarWallet)();
                    const polkadot = await (0, keygen_1.generatePolkadotWallet)();
                    const strk = (0, keygen_1.generateStrkWallet)();
                    const tron = (0, keygen_1.generateEthWallet)();
                    const addresses = [
                        { chain: 'ethereum', network: 'mainnet', address: eth.mainnet.address, encryptedPrivateKey: (0, keygen_1.encrypt)(eth.mainnet.privateKey) },
                        { chain: 'ethereum', network: 'testnet', address: eth.testnet.address, encryptedPrivateKey: (0, keygen_1.encrypt)(eth.testnet.privateKey) },
                        { chain: 'bitcoin', network: 'mainnet', address: btc.mainnet.address, encryptedPrivateKey: (0, keygen_1.encrypt)(btc.mainnet.privateKey) },
                        { chain: 'bitcoin', network: 'testnet', address: btc.testnet.address, encryptedPrivateKey: (0, keygen_1.encrypt)(btc.testnet.privateKey) },
                        { chain: 'solana', network: 'mainnet', address: sol.mainnet.address, encryptedPrivateKey: (0, keygen_1.encrypt)(sol.mainnet.privateKey) },
                        { chain: 'solana', network: 'testnet', address: sol.testnet.address, encryptedPrivateKey: (0, keygen_1.encrypt)(sol.testnet.privateKey) },
                        { chain: 'starknet', network: 'mainnet', address: strk.mainnet.address, encryptedPrivateKey: (0, keygen_1.encrypt)(strk.mainnet.privateKey) },
                        { chain: 'starknet', network: 'testnet', address: strk.testnet.address, encryptedPrivateKey: (0, keygen_1.encrypt)(strk.testnet.privateKey) },
                        { chain: 'usdt_erc20', network: 'mainnet', address: eth.mainnet.address, encryptedPrivateKey: (0, keygen_1.encrypt)(eth.mainnet.privateKey) },
                        { chain: 'usdt_erc20', network: 'testnet', address: eth.testnet.address, encryptedPrivateKey: (0, keygen_1.encrypt)(eth.testnet.privateKey) },
                        { chain: 'usdt_trc20', network: 'mainnet', address: tron.mainnet.address, encryptedPrivateKey: (0, keygen_1.encrypt)(tron.mainnet.privateKey) },
                        { chain: 'usdt_trc20', network: 'testnet', address: tron.testnet.address, encryptedPrivateKey: (0, keygen_1.encrypt)(tron.testnet.privateKey) },
                        { chain: 'stellar', network: 'mainnet', address: stellar.mainnet.address, encryptedPrivateKey: (0, keygen_1.encrypt)(stellar.mainnet.privateKey) },
                        { chain: 'stellar', network: 'testnet', address: stellar.testnet.address, encryptedPrivateKey: (0, keygen_1.encrypt)(stellar.testnet.privateKey) },
                        { chain: 'polkadot', network: 'mainnet', address: polkadot.mainnet.address, encryptedPrivateKey: (0, keygen_1.encrypt)(polkadot.mainnet.privateKey) },
                        { chain: 'polkadot', network: 'testnet', address: polkadot.testnet.address, encryptedPrivateKey: (0, keygen_1.encrypt)(polkadot.testnet.privateKey) },
                    ];
                    const addressRepo = database_1.AppDataSource.getRepository(UserAddress_1.UserAddress);
                    for (const a of addresses) {
                        try {
                            await addressRepo.save({ ...a, user: created, userId: created.id });
                        }
                        catch (err) {
                            console.error('Failed to save address', err);
                        }
                    }
                }
                catch (err) {
                    console.error('Background wallet generation failed', err);
                }
            })();
            // OTP generation and email
            const otp = (0, otp_1.generateOTP)();
            created.emailOTP = otp;
            created.emailOTPExpiry = (0, otp_1.getOTPExpiry)();
            await database_1.AppDataSource.getRepository(User_1.User).save(created);
            await (0, emailService_1.sendRegistrationEmails)(email, otp);
            if (created.id) {
                await notificationService_1.NotificationService.notifyRegistration(created.id, { email, registrationDate: new Date() });
            }
            return res.status(201).json({ message: 'User registered successfully. Please verify your email.', userId: created.id });
        }
        catch (err) {
            console.error('Register error:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }
    static async login(req, res) {
        try {
            const { email, password } = req.body;
            if (!email || !password)
                return res.status(400).json({ error: 'Email and password required' });
            const user = await (0, userService_1.findUserByEmail)(email);
            if (!user)
                return res.status(401).json({ error: 'Invalid credentials' });
            const valid = await user.comparePassword(password);
            if (!valid)
                return res.status(401).json({ error: 'Invalid credentials' });
            if (!user.isEmailVerified)
                return res.status(403).json({ error: 'Email not verified. Please verify your email before logging in.' });
            const payload = { userId: user.id, email: user.email };
            const accessToken = (0, jwt_1.generateAccessToken)(payload);
            const refreshToken = (0, jwt_1.generateRefreshToken)(payload);
            const refreshRepo = database_1.AppDataSource.getRepository(RefreshToken_1.RefreshToken);
            const tokenEntity = refreshRepo.create({ token: refreshToken, userId: user.id, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) });
            await refreshRepo.save(tokenEntity);
            // fire-and-forget post-login address generation + notification
            (async () => {
                try {
                    const addressRepo = database_1.AppDataSource.getRepository(UserAddress_1.UserAddress);
                    const existing = await addressRepo.find({ where: { userId: user.id } });
                    const chains = existing.map((e) => e.chain);
                    const toCreate = [];
                    if (!chains.includes('stellar')) {
                        const stellar = (0, keygen_1.generateStellarWallet)();
                        toCreate.push({ chain: 'stellar', network: 'mainnet', address: stellar.mainnet.address, encryptedPrivateKey: (0, keygen_1.encrypt)(stellar.mainnet.privateKey), user, userId: user.id });
                    }
                    if (!chains.includes('polkadot')) {
                        const polkadot = await (0, keygen_1.generatePolkadotWallet)();
                        toCreate.push({ chain: 'polkadot', network: 'mainnet', address: polkadot.mainnet.address, encryptedPrivateKey: (0, keygen_1.encrypt)(polkadot.mainnet.privateKey), user, userId: user.id });
                    }
                    for (const r of toCreate)
                        try {
                            await addressRepo.save(r);
                        }
                        catch (e) {
                            console.error('Save generated address', e);
                        }
                }
                catch (e) {
                    console.error('Post-login address generation failed', e);
                }
            })();
            try {
                if (user.id)
                    await notificationService_1.NotificationService.notifyLogin(user.id, { loginTime: new Date(), userAgent: req.headers['user-agent'], ip: req.ip });
            }
            catch (nErr) {
                console.error('Notify login failed', nErr);
            }
            return res.json({ message: 'Login successful', accessToken, refreshToken, user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, isEmailVerified: user.isEmailVerified, hasTransactionPin: !!user.transactionPin } });
        }
        catch (err) {
            console.error('Login error:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }
    static async verifyOTP(req, res) {
        try {
            const { email, otp } = req.body;
            const userRepository = database_1.AppDataSource.getRepository(User_1.User);
            const user = await userRepository.findOne({ where: { email } });
            if (!user)
                return res.status(404).json({ error: 'User not found' });
            if (!user.emailOTP || !user.emailOTPExpiry)
                return res.status(400).json({ error: 'OTP not found. Please request a new one.' });
            if ((0, otp_1.isOTPExpired)(user.emailOTPExpiry))
                return res.status(400).json({ error: 'OTP expired. Please request a new one.' });
            if (user.emailOTP !== otp)
                return res.status(400).json({ error: 'Invalid OTP' });
            user.isEmailVerified = true;
            user.emailOTP = undefined;
            user.emailOTPExpiry = undefined;
            await userRepository.save(user);
            try {
                if (user.id)
                    await notificationService_1.NotificationService.notifyOTPVerified(user.id, { verificationTime: new Date(), email: user.email });
            }
            catch (nErr) {
                console.error('Notify OTP verified failed', nErr);
            }
            return res.json({ message: 'Email verified successfully' });
        }
        catch (err) {
            console.error('OTP verification error:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }
    static async resendOTP(req, res) {
        try {
            const { email } = req.body;
            const userRepository = database_1.AppDataSource.getRepository(User_1.User);
            const user = await userRepository.findOne({ where: { email } });
            if (!user)
                return res.status(404).json({ error: 'User not found' });
            if (user.isEmailVerified)
                return res.status(400).json({ error: 'Email already verified' });
            const otp = (0, otp_1.generateOTP)();
            user.emailOTP = otp;
            user.emailOTPExpiry = (0, otp_1.getOTPExpiry)();
            await userRepository.save(user);
            try {
                await (0, emailService_1.sendOtp)(email, otp);
            }
            catch (e) {
                console.error('Send OTP failed', e);
            }
            return res.json({ message: 'OTP sent successfully' });
        }
        catch (err) {
            console.error('Resend OTP error:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }
    static async refreshToken(req, res) {
        try {
            const { refreshToken } = req.body;
            if (!refreshToken)
                return res.status(401).json({ error: 'Refresh token required' });
            const refreshRepo = database_1.AppDataSource.getRepository(RefreshToken_1.RefreshToken);
            const decoded = (0, jwt_1.verifyRefreshToken)(refreshToken);
            const tokenEntity = await refreshRepo.findOne({ where: { token: refreshToken, isRevoked: false } });
            if (!tokenEntity || !tokenEntity.expiresAt || tokenEntity.expiresAt < new Date())
                return res.status(403).json({ error: 'Invalid refresh token' });
            const userRepo = database_1.AppDataSource.getRepository(User_1.User);
            const user = await userRepo.findOne({ where: { id: decoded.userId } });
            if (!user)
                return res.status(403).json({ error: 'User not found' });
            const payload = { userId: user.id, email: user.email };
            const newAccessToken = (0, jwt_1.generateAccessToken)(payload);
            return res.json({ accessToken: newAccessToken });
        }
        catch (err) {
            console.error('Token refresh error:', err);
            return res.status(403).json({ error: 'Invalid refresh token' });
        }
    }
    static async logout(req, res) {
        try {
            const { refreshToken } = req.body;
            const refreshRepo = database_1.AppDataSource.getRepository(RefreshToken_1.RefreshToken);
            if (refreshToken)
                await refreshRepo.update({ token: refreshToken }, { isRevoked: true });
            return res.json({ message: 'Logged out successfully' });
        }
        catch (err) {
            console.error('Logout error:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }
    static async logoutAll(req, res) {
        try {
            const refreshRepo = database_1.AppDataSource.getRepository(RefreshToken_1.RefreshToken);
            const user = req.user;
            if (user)
                await refreshRepo.update({ userId: user.id }, { isRevoked: true });
            return res.json({ message: 'Logged out from all devices successfully' });
        }
        catch (err) {
            console.error('Logout all error:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }
    static async forgotPassword(req, res) {
        try {
            const { email } = req.body;
            if (!email)
                return res.status(400).json({ error: 'Email is required' });
            const userRepository = database_1.AppDataSource.getRepository(User_1.User);
            const user = await userRepository.findOne({ where: { email } });
            if (!user)
                return res.json({ message: 'If the email exists, you will receive a password reset link' });
            const resetToken = (0, otp_1.generateOTP)();
            const resetExpiry = new Date();
            resetExpiry.setMinutes(resetExpiry.getMinutes() + 15);
            user.passwordResetToken = resetToken;
            user.passwordResetExpiry = resetExpiry;
            await userRepository.save(user);
            try {
                await (0, emailService_1.sendPasswordReset)(email, resetToken);
            }
            catch (emailError) {
                console.error('Failed to send reset email:', emailError);
            }
            try {
                if (user.id)
                    await notificationService_1.NotificationService.createNotification(user.id, 'SECURITY_ALERT', 'Password Reset Requested', 'A password reset was requested for your account', { email, timestamp: new Date(), ipAddress: req.ip });
            }
            catch (notificationError) {
                console.error('Failed to create reset notification:', notificationError);
            }
            return res.json({ message: 'If the email exists, you will receive a password reset link' });
        }
        catch (err) {
            console.error('Forgot password error:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }
    static async verifyResetToken(req, res) {
        try {
            const { email, token } = req.body;
            if (!email || !token)
                return res.status(400).json({ error: 'Email and reset token are required' });
            const userRepository = database_1.AppDataSource.getRepository(User_1.User);
            const user = await userRepository.findOne({ where: { email } });
            if (!user)
                return res.status(400).json({ error: 'Invalid reset token' });
            if (user.passwordResetToken !== token || !user.passwordResetExpiry || new Date() > user.passwordResetExpiry) {
                return res.status(400).json({ error: 'Invalid or expired reset token' });
            }
            return res.json({ message: 'Reset token is valid', canResetPassword: true });
        }
        catch (err) {
            console.error('Verify reset token error:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }
    static async resetPassword(req, res) {
        try {
            const { email, token, newPassword } = req.body;
            if (!email || !token || !newPassword)
                return res.status(400).json({ error: 'Email, reset token, and new password are required' });
            if (newPassword.length < 6)
                return res.status(400).json({ error: 'Password must be at least 6 characters long' });
            const userRepository = database_1.AppDataSource.getRepository(User_1.User);
            const user = await userRepository.findOne({ where: { email } });
            if (!user)
                return res.status(400).json({ error: 'Invalid reset token' });
            if (user.passwordResetToken !== token || !user.passwordResetExpiry || new Date() > user.passwordResetExpiry)
                return res.status(400).json({ error: 'Invalid or expired reset token' });
            user.password = newPassword;
            user.passwordResetToken = undefined;
            user.passwordResetExpiry = undefined;
            await userRepository.save(user);
            const refreshTokenRepository = database_1.AppDataSource.getRepository(RefreshToken_1.RefreshToken);
            await refreshTokenRepository.update({ userId: user.id }, { isRevoked: true });
            try {
                await (0, emailService_1.sendPasswordReset)(user.email, '');
            }
            catch (emailError) {
                console.error('Failed to send password change confirmation:', emailError);
            }
            try {
                if (user.id)
                    await notificationService_1.NotificationService.createNotification(user.id, 'PASSWORD_CHANGE', 'Password Changed', 'Your password has been successfully changed', { email, timestamp: new Date(), ipAddress: req.ip });
            }
            catch (notificationError) {
                console.error('Failed to create password change notification:', notificationError);
            }
            return res.json({ message: 'Password reset successfully. Please log in with your new password.' });
        }
        catch (err) {
            console.error('Reset password error:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }
}
exports.AuthController = AuthController;
