import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { RefreshToken } from '../entities/RefreshToken';
import { AuthRequest } from '../types';
import {
    generateAccessToken,
    generateRefreshToken,
    verifyRefreshToken,
} from '../utils/jwt';
import { generateOTP, getOTPExpiry, isOTPExpired } from '../utils/otp';
import { sendOTPEmail } from '../utils/email';

export class AuthController {
    // Register new user
    static async register(req: Request, res: Response): Promise<void> {
        try {
            const { email, password } = req.body;
            const userRepository = AppDataSource.getRepository(User);

            // Check if user already exists
            const existingUser = await userRepository.findOne({
                where: { email },
            });
            if (existingUser) {
                res.status(409).json({ error: 'User already exists' });
                return;
            }

            // Create new user
            const user = userRepository.create({
                email,
                password,
            });

            await userRepository.save(user);

            // Generate and send OTP
            const otp = generateOTP();
            user.emailOTP = otp;
            user.emailOTPExpiry = getOTPExpiry();
            await userRepository.save(user);

            // await sendOTPEmail(email, otp);
            console.log(`OTP for ${email}: ${otp}`);

            res.status(201).json({
                message:
                    'User registered successfully. Please verify your email.',
                userId: user.id,
            });
        } catch (error) {
            console.error('Registration error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    // Login user
    static async login(req: Request, res: Response): Promise<void> {
        try {
            const { email, password } = req.body;
            const userRepository = AppDataSource.getRepository(User);
            const refreshTokenRepository =
                AppDataSource.getRepository(RefreshToken);

            // Find user
            const user = await userRepository.findOne({ where: { email } });
            if (!user) {
                res.status(401).json({ error: 'Invalid credentials' });
                return;
            }

            // Check password
            const isValidPassword = await user.comparePassword(password);
            if (!isValidPassword) {
                res.status(401).json({ error: 'Invalid credentials' });
                return;
            }

            // Check email verification
            if (!user.isEmailVerified) {
                res.status(403).json({
                    error: 'Email not verified. Please verify your email before logging in.',
                });
                return;
            }

            // Generate tokens
            if (!user.id || !user.email) {
                res.status(500).json({ error: 'User data incomplete' });
                return;
            }
            const payload = { userId: user.id, email: user.email };
            const accessToken = generateAccessToken(payload);
            const refreshToken = generateRefreshToken(payload);

            // Save refresh token
            const refreshTokenEntity = refreshTokenRepository.create({
                token: refreshToken,
                userId: user.id,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            });
            await refreshTokenRepository.save(refreshTokenEntity);

            res.json({
                message: 'Login successful',
                accessToken,
                refreshToken,
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    isEmailVerified: user.isEmailVerified,
                },
            });
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    // Verify OTP
    static async verifyOTP(req: Request, res: Response): Promise<void> {
        try {
            const { email, otp } = req.body;
            const userRepository = AppDataSource.getRepository(User);

            const user = await userRepository.findOne({ where: { email } });
            if (!user) {
                res.status(404).json({ error: 'User not found' });
                return;
            }

            if (!user.emailOTP || !user.emailOTPExpiry) {
                res.status(400).json({
                    error: 'OTP not found. Please request a new one.',
                });
                return;
            }

            if (isOTPExpired(user.emailOTPExpiry)) {
                res.status(400).json({
                    error: 'OTP expired. Please request a new one.',
                });
                return;
            }

            if (user.emailOTP !== otp) {
                res.status(400).json({ error: 'Invalid OTP' });
                return;
            }

            // Mark email as verified
            user.isEmailVerified = true;
            user.emailOTP = undefined;
            user.emailOTPExpiry = undefined;
            await userRepository.save(user);

            res.json({ message: 'Email verified successfully' });
        } catch (error) {
            console.error('OTP verification error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    // Resend OTP
    static async resendOTP(req: Request, res: Response): Promise<void> {
        try {
            const { email } = req.body;
            const userRepository = AppDataSource.getRepository(User);

            const user = await userRepository.findOne({ where: { email } });
            if (!user) {
                res.status(404).json({ error: 'User not found' });
                return;
            }

            if (user.isEmailVerified) {
                res.status(400).json({ error: 'Email already verified' });
                return;
            }

            // Generate new OTP
            const otp = generateOTP();
            user.emailOTP = otp;
            user.emailOTPExpiry = getOTPExpiry();
            await userRepository.save(user);

            // await sendOTPEmail(email, otp);
            console.log(`OTP for ${email}: ${otp}`);

            res.json({ message: 'OTP sent successfully' });
        } catch (error) {
            console.error('Resend OTP error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    // Refresh token
    static async refreshToken(req: Request, res: Response): Promise<void> {
        try {
            const { refreshToken } = req.body;
            const refreshTokenRepository =
                AppDataSource.getRepository(RefreshToken);
            const userRepository = AppDataSource.getRepository(User);

            if (!refreshToken) {
                res.status(401).json({ error: 'Refresh token required' });
                return;
            }

            // Verify refresh token
            const decoded = verifyRefreshToken(refreshToken);
            const tokenEntity = await refreshTokenRepository.findOne({
                where: { token: refreshToken, isRevoked: false },
            });

            if (
                !tokenEntity ||
                !tokenEntity.expiresAt ||
                tokenEntity.expiresAt < new Date()
            ) {
                res.status(403).json({ error: 'Invalid refresh token' });
                return;
            }

            const user = await userRepository.findOne({
                where: { id: decoded.userId },
            });
            if (!user) {
                res.status(403).json({ error: 'User not found' });
                return;
            }

            // Generate new access token
            if (!user.id || !user.email) {
                res.status(500).json({ error: 'User data incomplete' });
                return;
            }
            const payload = { userId: user.id, email: user.email };
            const newAccessToken = generateAccessToken(payload);

            res.json({ accessToken: newAccessToken });
        } catch (error) {
            console.error('Token refresh error:', error);
            res.status(403).json({ error: 'Invalid refresh token' });
        }
    }

    // Logout
    static async logout(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { refreshToken } = req.body;
            const refreshTokenRepository =
                AppDataSource.getRepository(RefreshToken);

            if (refreshToken) {
                await refreshTokenRepository.update(
                    { token: refreshToken },
                    { isRevoked: true }
                );
            }

            res.json({ message: 'Logged out successfully' });
        } catch (error) {
            console.error('Logout error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    // Logout from all devices
    static async logoutAll(req: AuthRequest, res: Response): Promise<void> {
        try {
            const refreshTokenRepository =
                AppDataSource.getRepository(RefreshToken);

            if (req.user) {
                await refreshTokenRepository.update(
                    { userId: req.user.id },
                    { isRevoked: true }
                );
            }

            res.json({ message: 'Logged out from all devices successfully' });
        } catch (error) {
            console.error('Logout all error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}
