"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const database_1 = require("../config/database");
const User_1 = require("../entities/User");
const RefreshToken_1 = require("../entities/RefreshToken");
const jwt_1 = require("../utils/jwt");
const otp_1 = require("../utils/otp");
const mailtrap_1 = require("../utils/mailtrap");
const resendOtpTemplate_1 = require("../utils/resendOtpTemplate");
const passwordResetTemplates_1 = require("../utils/passwordResetTemplates");
const keygen_1 = require("../utils/keygen");
const userService_1 = require("../services/userService");
const emailService_1 = require("../services/emailService");
const notificationService_1 = require("../services/notificationService");
const UserAddress_1 = require("../entities/UserAddress");
const types_1 = require("../types");
const types_2 = require("../types");
class AuthController {
    /**
     * Delete a user by ID (from route param).
     * Expects 'id' as req.params.id.
     * Responds with success or error if not found.
     */
    static async deleteUserById(req, res) {
        try {
            const { id } = req.params;
            if (!id) {
                res.status(400).json({
                    error: 'User ID required in URL param',
                });
                return;
            }
            const userRepository = database_1.AppDataSource.getRepository(User_1.User);
            const user = await userRepository.findOne({ where: { id } });
            if (!user) {
                res.status(404).json({ error: 'User not found' });
                return;
            }
            await userRepository.remove(user);
            res.json({ message: 'User deleted successfully' });
        }
        catch (error) {
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
    static async register(req, res) {
        try {
            const { email, password } = req.body;
            // Create user if not exists
            const user = await (0, userService_1.createUserIfNotExists)(email, password);
            if (!user) {
                res.status(409).json({ error: 'User already exists' });
                return;
            }
            // Generate all wallets directly
            const eth = (0, keygen_1.generateEthWallet)();
            const btc = (0, keygen_1.generateBtcWallet)();
            const sol = (0, keygen_1.generateSolWallet)();
            const stellar = (0, keygen_1.generateStellarWallet)();
            const polkadot = await (0, keygen_1.generatePolkadotWallet)();
            const strk = (0, keygen_1.generateStrkWallet)();
            // For USDT, we'll use the same addresses as ETH (since USDT-ERC20 uses Ethereum addresses)
            // and generate separate Tron addresses for USDT-TRC20
            const tron = (0, keygen_1.generateEthWallet)(); // Tron uses similar address generation
            // Prepare addresses array for saving and response
            const addresses = [
                {
                    chain: 'ethereum',
                    network: 'mainnet',
                    address: eth.mainnet.address,
                    encryptedPrivateKey: (0, keygen_1.encrypt)(eth.mainnet.privateKey),
                },
                {
                    chain: 'ethereum',
                    network: 'testnet',
                    address: eth.testnet.address,
                    encryptedPrivateKey: (0, keygen_1.encrypt)(eth.testnet.privateKey),
                },
                {
                    chain: 'bitcoin',
                    network: 'mainnet',
                    address: btc.mainnet.address,
                    encryptedPrivateKey: (0, keygen_1.encrypt)(btc.mainnet.privateKey),
                },
                {
                    chain: 'bitcoin',
                    network: 'testnet',
                    address: btc.testnet.address,
                    encryptedPrivateKey: (0, keygen_1.encrypt)(btc.testnet.privateKey),
                },
                {
                    chain: 'solana',
                    network: 'mainnet',
                    address: sol.mainnet.address,
                    encryptedPrivateKey: (0, keygen_1.encrypt)(sol.mainnet.privateKey),
                },
                {
                    chain: 'solana',
                    network: 'testnet',
                    address: sol.testnet.address,
                    encryptedPrivateKey: (0, keygen_1.encrypt)(sol.testnet.privateKey),
                },
                {
                    chain: 'starknet',
                    network: 'mainnet',
                    address: strk.mainnet.address,
                    encryptedPrivateKey: (0, keygen_1.encrypt)(strk.mainnet.privateKey),
                },
                {
                    chain: 'starknet',
                    network: 'testnet',
                    address: strk.testnet.address,
                    encryptedPrivateKey: (0, keygen_1.encrypt)(strk.testnet.privateKey),
                },
                // USDT addresses - using ETH addresses for ERC-20 USDT
                {
                    chain: 'usdt_erc20',
                    network: 'mainnet',
                    address: eth.mainnet.address, // Same as ETH mainnet
                    encryptedPrivateKey: (0, keygen_1.encrypt)(eth.mainnet.privateKey),
                },
                {
                    chain: 'usdt_erc20',
                    network: 'testnet',
                    address: eth.testnet.address, // Same as ETH testnet
                    encryptedPrivateKey: (0, keygen_1.encrypt)(eth.testnet.privateKey),
                },
                // USDT TRC-20 addresses (Tron network)
                {
                    chain: 'usdt_trc20',
                    network: 'mainnet',
                    address: tron.mainnet.address,
                    encryptedPrivateKey: (0, keygen_1.encrypt)(tron.mainnet.privateKey),
                },
                {
                    chain: 'usdt_trc20',
                    network: 'testnet',
                    address: tron.testnet.address,
                    encryptedPrivateKey: (0, keygen_1.encrypt)(tron.testnet.privateKey),
                },
                // Stellar
                {
                    chain: 'stellar',
                    network: 'mainnet',
                    address: stellar.mainnet.address,
                    encryptedPrivateKey: (0, keygen_1.encrypt)(stellar.mainnet.privateKey),
                },
                {
                    chain: 'stellar',
                    network: 'testnet',
                    address: stellar.testnet.address,
                    encryptedPrivateKey: (0, keygen_1.encrypt)(stellar.testnet.privateKey),
                },
                // Polkadot
                {
                    chain: 'polkadot',
                    network: 'mainnet',
                    address: polkadot.mainnet.address,
                    encryptedPrivateKey: (0, keygen_1.encrypt)(polkadot.mainnet.privateKey),
                },
                {
                    chain: 'polkadot',
                    network: 'testnet',
                    address: polkadot.testnet.address,
                    encryptedPrivateKey: (0, keygen_1.encrypt)(polkadot.testnet.privateKey),
                },
            ];
            // Save all generated addresses to the database directly
            const addressRepo = database_1.AppDataSource.getRepository(UserAddress_1.UserAddress);
            for (const addr of addresses) {
                try {
                    await addressRepo.save({
                        ...addr,
                        user,
                        userId: user.id,
                        chain: types_2.ChainType[addr.chain.toUpperCase()],
                        network: types_1.NetworkType[addr.network.toUpperCase()],
                    });
                    console.log('[DEBUG] Saved address:', {
                        ...addr,
                        userId: user.id,
                    });
                }
                catch (err) {
                    console.error('[DEBUG] Failed to save address:', { ...addr, userId: user.id }, err);
                }
            }
            // Generate and save OTP for email verification
            const otp = (0, otp_1.generateOTP)();
            user.emailOTP = otp;
            user.emailOTPExpiry = (0, otp_1.getOTPExpiry)();
            await database_1.AppDataSource.getRepository(User_1.User).save(user);
            // Send registration verification email and OTP
            await (0, emailService_1.sendRegistrationEmails)(email, otp);
            // Create registration notification
            try {
                if (user.id) {
                    await notificationService_1.NotificationService.notifyRegistration(user.id, {
                        email,
                        registrationDate: new Date(),
                        addressCount: addresses.length,
                    });
                    console.log('[DEBUG] Registration notification created for user:', user.id);
                }
            }
            catch (notificationError) {
                console.error('[DEBUG] Failed to create registration notification:', notificationError);
                // Don't fail registration if notification fails
            }
            // Return user profile with addresses (no private keys)
            const userAddresses = addresses.map((a) => ({
                chain: AuthController.mapChainName(a.chain),
                network: a.network,
                address: a.address,
            }));
            // Sort addresses before sending
            const sortedAddresses = AuthController.sortAddresses(userAddresses);
            // Always log sorted addresses for debugging
            console.log('[DEBUG] Sorted addresses:', JSON.stringify(sortedAddresses, null, 2));
            res.status(201).json({
                message: 'User registered successfully. Please verify your email.',
                userId: user.id,
                addresses: sortedAddresses,
            });
        }
        catch (error) {
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
    static async login(req, res) {
        try {
            const { email, password } = req.body;
            const userRepository = database_1.AppDataSource.getRepository(User_1.User);
            const refreshTokenRepository = database_1.AppDataSource.getRepository(RefreshToken_1.RefreshToken);
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
            const accessToken = (0, jwt_1.generateAccessToken)(payload);
            const refreshToken = (0, jwt_1.generateRefreshToken)(payload);
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
                    hasTransactionPin: !!user.transactionPin,
                },
            });
            // After successful login, ensure user has Stellar and Polkadot addresses
            try {
                const addressRepo = database_1.AppDataSource.getRepository('UserAddress');
                const existing = await addressRepo.find({ where: { userId: user.id } });
                const chains = existing.map((e) => e.chain);
                const toCreate = [];
                if (!chains.includes('stellar')) {
                    const stellar = (0, keygen_1.generateStellarWallet)();
                    toCreate.push({
                        chain: 'stellar',
                        network: 'mainnet',
                        address: stellar.mainnet.address,
                        encryptedPrivateKey: (0, keygen_1.encrypt)(stellar.mainnet.privateKey),
                        user,
                        userId: user.id,
                    });
                }
                if (!chains.includes('polkadot')) {
                    const polkadot = await (0, keygen_1.generatePolkadotWallet)();
                    toCreate.push({
                        chain: 'polkadot',
                        network: 'mainnet',
                        address: polkadot.mainnet.address,
                        encryptedPrivateKey: (0, keygen_1.encrypt)(polkadot.mainnet.privateKey),
                        user,
                        userId: user.id,
                    });
                }
                if (toCreate.length) {
                    for (const row of toCreate) {
                        try {
                            await addressRepo.save(row);
                        }
                        catch (err) {
                            console.error('Failed to save generated address on login', err);
                        }
                    }
                }
            }
            catch (err) {
                console.error('Post-login address generation failed', err);
            }
            // Create login notification
            try {
                if (user.id) {
                    await notificationService_1.NotificationService.notifyLogin(user.id, {
                        loginTime: new Date(),
                        userAgent: req.headers['user-agent'],
                        ip: req.ip || req.connection.remoteAddress,
                    });
                    console.log('[DEBUG] Login notification created for user:', user.id);
                }
            }
            catch (notificationError) {
                console.error('[DEBUG] Failed to create login notification:', notificationError);
                // Don't fail login if notification fails
            }
        }
        catch (error) {
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
    static async verifyOTP(req, res) {
        try {
            const { email, otp } = req.body;
            const userRepository = database_1.AppDataSource.getRepository(User_1.User);
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
            if ((0, otp_1.isOTPExpired)(user.emailOTPExpiry)) {
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
            // Create OTP verification notification
            try {
                if (user.id) {
                    await notificationService_1.NotificationService.notifyOTPVerified(user.id, {
                        verificationTime: new Date(),
                        email: user.email,
                    });
                    console.log('[DEBUG] OTP verification notification created for user:', user.id);
                }
            }
            catch (notificationError) {
                console.error('[DEBUG] Failed to create OTP verification notification:', notificationError);
                // Don't fail verification if notification fails
            }
            res.json({ message: 'Email verified successfully' });
        }
        catch (error) {
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
    static async resendOTP(req, res) {
        try {
            const { email } = req.body;
            const userRepository = database_1.AppDataSource.getRepository(User_1.User);
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
            const otp = (0, otp_1.generateOTP)();
            user.emailOTP = otp;
            user.emailOTPExpiry = (0, otp_1.getOTPExpiry)();
            await userRepository.save(user);
            // Send OTP email using Mailtrap
            try {
                await (0, mailtrap_1.sendMailtrapMail)({
                    to: email,
                    subject: 'Your OTP Code',
                    text: `Your OTP code is: ${otp}`,
                    html: (0, resendOtpTemplate_1.resendOtpTemplate)(email, otp),
                });
            }
            catch (mailErr) {
                console.error('Mailtrap send error:', mailErr);
            }
            console.log(`OTP for ${email}: ${otp}`);
            res.json({ message: 'OTP sent successfully' });
        }
        catch (error) {
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
    static async refreshToken(req, res) {
        try {
            const { refreshToken } = req.body;
            const refreshTokenRepository = database_1.AppDataSource.getRepository(RefreshToken_1.RefreshToken);
            const userRepository = database_1.AppDataSource.getRepository(User_1.User);
            if (!refreshToken) {
                res.status(401).json({ error: 'Refresh token required' });
                return;
            }
            // Verify refresh token and check if not revoked/expired
            const decoded = (0, jwt_1.verifyRefreshToken)(refreshToken);
            const tokenEntity = await refreshTokenRepository.findOne({
                where: { token: refreshToken, isRevoked: false },
            });
            if (!tokenEntity ||
                !tokenEntity.expiresAt ||
                tokenEntity.expiresAt < new Date()) {
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
            const newAccessToken = (0, jwt_1.generateAccessToken)(payload);
            res.json({ accessToken: newAccessToken });
        }
        catch (error) {
            console.error('Token refresh error:', error);
            res.status(403).json({ error: 'Invalid refresh token' });
        }
    }
    /**
     * Logout user by revoking the provided refresh token.
     * - Marks the refresh token as revoked in the database.
     * - Returns a success message.
     */
    static async logout(req, res) {
        try {
            const { refreshToken } = req.body;
            const refreshTokenRepository = database_1.AppDataSource.getRepository(RefreshToken_1.RefreshToken);
            // Revoke the refresh token if provided
            if (refreshToken) {
                await refreshTokenRepository.update({ token: refreshToken }, { isRevoked: true });
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
        }
        catch (error) {
            console.error('Logout error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    /**
     * Logout user from all devices by revoking all refresh tokens for the user.
     * - Marks all refresh tokens for the user as revoked in the database.
     * - Returns a success message.
     */
    static async logoutAll(req, res) {
        try {
            const refreshTokenRepository = database_1.AppDataSource.getRepository(RefreshToken_1.RefreshToken);
            // Revoke all refresh tokens for the user
            if (req.user) {
                await refreshTokenRepository.update({ userId: req.user.id }, { isRevoked: true });
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
        }
        catch (error) {
            console.error('Logout all error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    /**
     * Initiate forgot password process
     * - Validates email exists
     * - Generates secure reset token
     * - Sends reset email with token
     * - Sets token expiry (15 minutes)
     */
    static async forgotPassword(req, res) {
        try {
            const { email } = req.body;
            if (!email) {
                res.status(400).json({ error: 'Email is required' });
                return;
            }
            const userRepository = database_1.AppDataSource.getRepository(User_1.User);
            const user = await userRepository.findOne({ where: { email } });
            if (!user) {
                // Don't reveal if email exists or not for security
                res.json({
                    message: 'If the email exists, you will receive a password reset link',
                });
                return;
            }
            // Generate secure reset token
            const resetToken = (0, otp_1.generateOTP)(); // 6-digit code for simplicity
            const resetExpiry = new Date();
            resetExpiry.setMinutes(resetExpiry.getMinutes() + 15); // 15 minutes expiry
            // Save reset token to user
            user.passwordResetToken = resetToken;
            user.passwordResetExpiry = resetExpiry;
            await userRepository.save(user);
            // Send password reset email
            try {
                await (0, mailtrap_1.sendMailtrapMail)({
                    to: email,
                    subject: 'Password Reset Request',
                    text: (0, passwordResetTemplates_1.passwordResetRequestText)(email, resetToken),
                    html: (0, passwordResetTemplates_1.passwordResetRequestTemplate)(email, resetToken),
                });
                console.log(`Password reset email sent to: ${email}`);
                console.log(`Reset token: ${resetToken} (expires: ${resetExpiry})`);
            }
            catch (emailError) {
                console.error('Failed to send reset email:', emailError);
                // Still return success to not reveal email existence
            }
            // Create notification
            try {
                if (user.id) {
                    await notificationService_1.NotificationService.createNotification(user.id, types_1.NotificationType.SECURITY_ALERT, 'Password Reset Requested', 'A password reset was requested for your account', {
                        email,
                        timestamp: new Date(),
                        ipAddress: req.ip,
                    });
                }
            }
            catch (notificationError) {
                console.error('Failed to create reset notification:', notificationError);
            }
            res.json({
                message: 'If the email exists, you will receive a password reset link',
            });
        }
        catch (error) {
            console.error('Forgot password error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    /**
     * Verify password reset token
     * - Validates reset token and expiry
     * - Returns success if token is valid
     */
    static async verifyResetToken(req, res) {
        try {
            const { email, token } = req.body;
            if (!email || !token) {
                res.status(400).json({
                    error: 'Email and reset token are required',
                });
                return;
            }
            const userRepository = database_1.AppDataSource.getRepository(User_1.User);
            const user = await userRepository.findOne({ where: { email } });
            if (!user) {
                res.status(400).json({ error: 'Invalid reset token' });
                return;
            }
            // Debug logging
            console.log('=== PASSWORD RESET TOKEN VERIFICATION DEBUG ===');
            console.log('Provided email:', email);
            console.log('Provided token:', token);
            console.log('Stored token in DB:', user.passwordResetToken);
            console.log('Token expiry in DB:', user.passwordResetExpiry);
            console.log('Current time:', new Date());
            console.log('Token matches:', user.passwordResetToken === token);
            console.log('Token exists:', !!user.passwordResetToken);
            console.log('Expiry exists:', !!user.passwordResetExpiry);
            console.log('Is expired:', user.passwordResetExpiry
                ? new Date() > user.passwordResetExpiry
                : 'N/A');
            console.log('===============================================');
            // Check if token matches and hasn't expired
            if (user.passwordResetToken !== token ||
                !user.passwordResetExpiry ||
                new Date() > user.passwordResetExpiry) {
                let errorDetails = [];
                if (user.passwordResetToken !== token) {
                    errorDetails.push('Token mismatch');
                }
                if (!user.passwordResetExpiry) {
                    errorDetails.push('No expiry set');
                }
                if (user.passwordResetExpiry &&
                    new Date() > user.passwordResetExpiry) {
                    errorDetails.push('Token expired');
                }
                console.log('Verification failed. Reasons:', errorDetails.join(', '));
                res.status(400).json({
                    error: 'Invalid or expired reset token',
                    debug: errorDetails, // Remove this in production
                });
                return;
            }
            res.json({
                message: 'Reset token is valid',
                canResetPassword: true,
            });
        }
        catch (error) {
            console.error('Verify reset token error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    /**
     * Reset password with token
     * - Validates reset token and expiry
     * - Updates password
     * - Clears reset token
     * - Revokes all existing refresh tokens for security
     */
    static async resetPassword(req, res) {
        try {
            const { email, token, newPassword } = req.body;
            if (!email || !token || !newPassword) {
                res.status(400).json({
                    error: 'Email, reset token, and new password are required',
                });
                return;
            }
            if (newPassword.length < 6) {
                res.status(400).json({
                    error: 'Password must be at least 6 characters long',
                });
                return;
            }
            const userRepository = database_1.AppDataSource.getRepository(User_1.User);
            const user = await userRepository.findOne({ where: { email } });
            if (!user) {
                res.status(400).json({ error: 'Invalid reset token' });
                return;
            }
            // Debug logging
            console.log('=== PASSWORD RESET DEBUG ===');
            console.log('Provided email:', email);
            console.log('Provided token:', token);
            console.log('Stored token in DB:', user.passwordResetToken);
            console.log('Token expiry in DB:', user.passwordResetExpiry);
            console.log('Current time:', new Date());
            console.log('Token matches:', user.passwordResetToken === token);
            console.log('Token exists:', !!user.passwordResetToken);
            console.log('Expiry exists:', !!user.passwordResetExpiry);
            console.log('Is expired:', user.passwordResetExpiry
                ? new Date() > user.passwordResetExpiry
                : 'N/A');
            console.log('=============================');
            // Check if token matches and hasn't expired
            if (user.passwordResetToken !== token ||
                !user.passwordResetExpiry ||
                new Date() > user.passwordResetExpiry) {
                let errorDetails = [];
                if (user.passwordResetToken !== token) {
                    errorDetails.push('Token mismatch');
                }
                if (!user.passwordResetExpiry) {
                    errorDetails.push('No expiry set');
                }
                if (user.passwordResetExpiry &&
                    new Date() > user.passwordResetExpiry) {
                    errorDetails.push('Token expired');
                }
                console.log('Reset failed. Reasons:', errorDetails.join(', '));
                res.status(400).json({
                    error: 'Invalid or expired reset token',
                    debug: errorDetails, // Remove this in production
                });
                return;
            }
            // Update password (will be automatically hashed by @BeforeUpdate)
            user.password = newPassword;
            // Clear reset token
            user.passwordResetToken = undefined;
            user.passwordResetExpiry = undefined;
            await userRepository.save(user);
            // Revoke all existing refresh tokens for security
            const refreshTokenRepository = database_1.AppDataSource.getRepository(RefreshToken_1.RefreshToken);
            await refreshTokenRepository.update({ userId: user.id }, { isRevoked: true });
            // Send password change confirmation email
            try {
                await (0, mailtrap_1.sendMailtrapMail)({
                    to: email,
                    subject: 'Password Changed Successfully',
                    text: (0, passwordResetTemplates_1.passwordChangedText)(email),
                    html: (0, passwordResetTemplates_1.passwordChangedTemplate)(email),
                });
            }
            catch (emailError) {
                console.error('Failed to send password change confirmation:', emailError);
            }
            // Create notification
            try {
                if (user.id) {
                    await notificationService_1.NotificationService.createNotification(user.id, types_1.NotificationType.PASSWORD_CHANGE, 'Password Changed', 'Your password has been successfully changed', {
                        email,
                        timestamp: new Date(),
                        ipAddress: req.ip,
                    });
                }
            }
            catch (notificationError) {
                console.error('Failed to create password change notification:', notificationError);
            }
            res.json({
                message: 'Password reset successfully. Please log in with your new password.',
            });
        }
        catch (error) {
            console.error('Reset password error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    /**
     * Map chain names to internal format
     * - Converts common chain names to internal identifiers
     * - Used for consistency in address handling
     */
    static mapChainName(chain) {
        switch (chain) {
            case 'ethereum':
                return 'eth';
            case 'bitcoin':
                return 'btc';
            case 'solana':
                return 'sol';
            case 'starknet':
                return 'strk';
            case 'stellar':
                return 'xlm';
            case 'polkadot':
                return 'dot';
            case 'usdt_erc20':
                return 'usdterc20';
            case 'usdt_trc20':
                return 'usdttrc20';
            default:
                return chain;
        }
    }
    /**
     * Helper to sort addresses by desired chain order.
     */
    static sortAddresses(addresses) {
        const order = ['eth', 'btc', 'xlm', 'dot', 'sol', 'strk', 'usdterc20', 'usdttrc20'];
        return addresses.sort((a, b) => {
            const aIndex = order.indexOf(a.chain);
            const bIndex = order.indexOf(b.chain);
            return aIndex - bIndex;
        });
    }
}
exports.AuthController = AuthController;
//# sourceMappingURL=authController.js.map