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
import { sendMailtrapMail } from '../utils/mailtrap';
import { resendOtpTemplate } from '../utils/resendOtpTemplate';
import {
    generateEthWallet,
    generateBtcWallet,
    generateSolWallet,
    generateStrkWallet,
    encrypt,
} from '../utils/keygen';
import {
    createUserIfNotExists,
    saveUserAddresses,
} from '../services/userService';
import { sendRegistrationEmails } from '../services/emailService';
import { UserAddress } from '../entities/UserAddress';
import { NetworkType } from '../types';
import { ChainType } from '../types';

export class AuthController {
    /**
     * Delete a user by ID (from route param).
     * Expects 'id' as req.params.id.
     * Responds with success or error if not found.
     */
    static async deleteUserById(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            if (!id) {
                res.status(400).json({
                    error: 'User ID required in URL param',
                });
                return;
            }
            const userRepository = AppDataSource.getRepository(User);
            const user = await userRepository.findOne({ where: { id } });
            if (!user) {
                res.status(404).json({ error: 'User not found' });
                return;
            }
            await userRepository.remove(user);
            res.json({ message: 'User deleted successfully' });
        } catch (error) {
            console.error('Delete user error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    /**
     * Register a new user.
     * - Checks if the user already exists by email.
     * - Creates a new user and saves to the database.
     * - Generates wallets for ETH, BTC, SOL, STRK and encrypts their private keys.
     * - Stores all addresses in the UserAddress table.
     * - Generates and saves an OTP for email verification.
     * - (Email sending is commented out, but logs OTP to console.)
     * - Returns the user ID and addresses (without private keys).
     */
    static async register(req: Request, res: Response): Promise<void> {
        try {
            const { email, password } = req.body;
            // Create user if not exists
            const user = await createUserIfNotExists(email, password);
            if (!user) {
                res.status(409).json({ error: 'User already exists' });
                return;
            }
            // Generate all wallets directly
            const eth = generateEthWallet();
            const btc = generateBtcWallet();
            const sol = generateSolWallet();
            const strk = generateStrkWallet('argentx');

            // Prepare addresses array for saving and response
            const addresses = [
                {
                    chain: 'ethereum',
                    network: 'mainnet',
                    address: eth.mainnet.address,
                    privateKey: encrypt(eth.mainnet.privateKey),
                },
                {
                    chain: 'ethereum',
                    network: 'testnet',
                    address: eth.testnet.address,
                    privateKey: encrypt(eth.testnet.privateKey),
                },
                {
                    chain: 'bitcoin',
                    network: 'mainnet',
                    address: btc.mainnet.address,
                    privateKey: encrypt(btc.mainnet.privateKey),
                },
                {
                    chain: 'bitcoin',
                    network: 'testnet',
                    address: btc.testnet.address,
                    privateKey: encrypt(btc.testnet.privateKey),
                },
                {
                    chain: 'solana',
                    network: 'mainnet',
                    address: sol.mainnet.address,
                    privateKey: encrypt(sol.mainnet.privateKey),
                },
                {
                    chain: 'solana',
                    network: 'testnet',
                    address: sol.testnet.address,
                    privateKey: encrypt(sol.testnet.privateKey),
                },
                {
                    chain: 'starknet',
                    network: 'mainnet',
                    address: strk.mainnet.address,
                    privateKey: encrypt(strk.mainnet.privateKey),
                },
                {
                    chain: 'starknet',
                    network: 'testnet',
                    address: strk.testnet.address,
                    privateKey: encrypt(strk.testnet.privateKey),
                },
            ];

            // Save all generated addresses to the database directly
            const addressRepo = AppDataSource.getRepository(UserAddress);
            for (const addr of addresses) {
                try {
                    await addressRepo.save({
                        ...addr,
                        user,
                        userId: user.id,
                        chain: ChainType[
                            addr.chain.toUpperCase() as keyof typeof ChainType
                        ],
                        network:
                            NetworkType[
                                addr.network.toUpperCase() as keyof typeof NetworkType
                            ],
                    });
                    console.log('[DEBUG] Saved address:', {
                        ...addr,
                        userId: user.id,
                    });
                } catch (err) {
                    console.error(
                        '[DEBUG] Failed to save address:',
                        { ...addr, userId: user.id },
                        err
                    );
                }
            }

            // Generate and save OTP for email verification
            const otp = generateOTP();
            user.emailOTP = otp;
            user.emailOTPExpiry = getOTPExpiry();
            await AppDataSource.getRepository(User).save(user);

            // Send registration verification email and OTP
            // await sendRegistrationEmails(email, otp);

            // Return user profile with addresses (no private keys)
            const userAddresses = addresses.map((a) => ({
                chain: a.chain,
                network: a.network,
                address: a.address,
            }));
            res.status(201).json({
                message:
                    'User registered successfully. Please verify your email.',
                userId: user.id,
                addresses: userAddresses,
            });
        } catch (error) {
            console.error('Registration error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Login user.
     * - Finds user by email and checks password.
     * - Verifies email is confirmed.
     * - Generates JWT access and refresh tokens.
     * - Saves refresh token to the database.
     * - Returns tokens and basic user info.
     */
    static async login(req: Request, res: Response): Promise<void> {
        try {
            const { email, password } = req.body;
            const userRepository = AppDataSource.getRepository(User);
            const refreshTokenRepository =
                AppDataSource.getRepository(RefreshToken);

            // Find user by email
            const user = await userRepository.findOne({ where: { email } });
            if (!user) {
                res.status(401).json({ error: 'Invalid credentials' });
                return;
            }

            // Check password using User entity's comparePassword method
            const isValidPassword = await user.comparePassword(password);
            if (!isValidPassword) {
                res.status(401).json({ error: 'Invalid credentials' });
                return;
            }

            // Ensure email is verified before allowing login
            if (!user.isEmailVerified) {
                res.status(403).json({
                    error: 'Email not verified. Please verify your email before logging in.',
                });
                return;
            }

            // Generate JWT tokens
            if (!user.id || !user.email) {
                res.status(500).json({ error: 'User data incomplete' });
                return;
            }
            const payload = { userId: user.id, email: user.email };
            const accessToken = generateAccessToken(payload);
            const refreshToken = generateRefreshToken(payload);

            // Save refresh token to DB for session management
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

            // Optionally send login notification email (commented out)
            //      await sendMail(
            //     email,
            //     'Login Notification',
            //     loginNotificationTemplate(email)
            // );
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Verify OTP for email verification.
     * - Looks up user by email.
     * - Checks OTP and expiry.
     * - Marks email as verified if OTP is valid.
     * - Returns success or error.
     */
    static async verifyOTP(req: Request, res: Response): Promise<void> {
        try {
            const { email, otp } = req.body;
            const userRepository = AppDataSource.getRepository(User);

            // Find user by email
            const user = await userRepository.findOne({ where: { email } });
            if (!user) {
                res.status(404).json({ error: 'User not found' });
                return;
            }

            // Ensure OTP and expiry are present
            if (!user.emailOTP || !user.emailOTPExpiry) {
                res.status(400).json({
                    error: 'OTP not found. Please request a new one.',
                });
                return;
            }

            // Check if OTP is expired
            if (isOTPExpired(user.emailOTPExpiry)) {
                res.status(400).json({
                    error: 'OTP expired. Please request a new one.',
                });
                return;
            }

            // Check if OTP matches
            if (user.emailOTP !== otp) {
                res.status(400).json({ error: 'Invalid OTP' });
                return;
            }

            // Mark email as verified and clear OTP fields
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

    /**
     * Resend OTP for email verification.
     * - Finds user by email.
     * - Generates a new OTP and expiry.
     * - Saves OTP to user and logs it (email sending is commented out).
     * - Returns success or error.
     */
    static async resendOTP(req: Request, res: Response): Promise<void> {
        try {
            const { email } = req.body;
            const userRepository = AppDataSource.getRepository(User);

            // Find user by email
            const user = await userRepository.findOne({ where: { email } });
            if (!user) {
                res.status(404).json({ error: 'User not found' });
                return;
            }

            // Prevent resending OTP if already verified
            if (user.isEmailVerified) {
                res.status(400).json({ error: 'Email already verified' });
                return;
            }

            // Generate new OTP and expiry
            const otp = generateOTP();
            user.emailOTP = otp;
            user.emailOTPExpiry = getOTPExpiry();
            await userRepository.save(user);

            // Send OTP email using Mailtrap
            try {
                await sendMailtrapMail({
                    to: email,
                    subject: 'Your OTP Code',
                    text: `Your OTP code is: ${otp}`,
                    html: resendOtpTemplate(email, otp),
                });
            } catch (mailErr) {
                console.error('Mailtrap send error:', mailErr);
            }
            console.log(`OTP for ${email}: ${otp}`);

            res.json({ message: 'OTP sent successfully' });
        } catch (error) {
            console.error('Resend OTP error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Refresh JWT access token using a valid refresh token.
     * - Verifies the refresh token and checks expiry/revocation.
     * - Finds the user and issues a new access token.
     * - Returns the new access token or error.
     */
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

            // Verify refresh token and check if not revoked/expired
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

            // Find user by ID from decoded token
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

    /**
     * Logout user by revoking the provided refresh token.
     * - Marks the refresh token as revoked in the database.
     * - Returns a success message.
     */
    static async logout(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { refreshToken } = req.body;
            const refreshTokenRepository =
                AppDataSource.getRepository(RefreshToken);

            // Revoke the refresh token if provided
            if (refreshToken) {
                await refreshTokenRepository.update(
                    { token: refreshToken },
                    { isRevoked: true }
                );
            }

            res.json({ message: 'Logged out successfully' });
            //           if (req.user && req.user.email) {
            //     await sendMail(
            //         req.user.email,
            //         'Logout Notification',
            //         logoutNotificationTemplate(req.user.email)
            //     );
            // }
            // Optionally send logout notification email (commented out)
        } catch (error) {
            console.error('Logout error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Logout user from all devices by revoking all refresh tokens for the user.
     * - Marks all refresh tokens for the user as revoked in the database.
     * - Returns a success message.
     */
    static async logoutAll(req: AuthRequest, res: Response): Promise<void> {
        try {
            const refreshTokenRepository =
                AppDataSource.getRepository(RefreshToken);

            // Revoke all refresh tokens for the user
            if (req.user) {
                await refreshTokenRepository.update(
                    { userId: req.user.id },
                    { isRevoked: true }
                );
            }

            res.json({ message: 'Logged out from all devices successfully' });
            //            if (req.user && req.user.email) {
            //     await sendMail(
            //         req.user.email,
            //         'Logout Notification',
            //         logoutNotificationTemplate(req.user.email)
            //     );
            // }
            // Optionally send logout notification email (commented out)
        } catch (error) {
            console.error('Logout all error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}
