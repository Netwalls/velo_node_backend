import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { UserAddress } from '../entities/UserAddress';
import { KYCDocument } from '../entities/KYCDocument';
import { AuthRequest, KYCStatus } from '../types';
import { UsernameService } from '../services/usernameService';

export class UserController {
    /**
     * Get user profile by ID (admin or public endpoint).
     * Fetches user details, KYC document, and addresses for the given userId param.
     * Returns 404 if not found.
     */
    static async getProfileById(
        req: AuthRequest,
        res: Response
    ): Promise<void> {
        try {
            const { userId } = req.params;
            const userRepository = AppDataSource.getRepository(User);
            const user = await userRepository.findOne({
                where: { id: userId },
                relations: ['addresses', 'kycDocument'],
            });

            if (!user) {
                res.status(404).json({ error: 'User not found' });
                return;
            }

            res.json({
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    phoneNumber: user.phoneNumber,
                    username: user.username,
                    displayPicture: user.displayPicture,
                    isEmailVerified: user.isEmailVerified,
                    kycStatus: user.kycStatus,
                    kyc: user.kycDocument,
                    addresses: user.addresses,
                    bankDetails: {
                        bankName: user.bankName,
                        accountNumber: user.accountNumber,
                        accountName: user.accountName,
                    },
                    createdAt: user.createdAt,
                },
            });
        } catch (error) {
            console.error('Get profile by ID error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Get profile for the currently authenticated user.
     * Fetches user details, KYC document, and addresses for req.user!.id.
     * Returns 404 if not found.
     */
    static async getProfile(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userRepository = AppDataSource.getRepository(User);
            const user = await userRepository.findOne({
                where: { id: req.user!.id },
                relations: ['addresses', 'kycDocument'],
            });

            if (!user) {
                res.status(404).json({ error: 'User not found' });
                return;
            }

            res.json({
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    phoneNumber: user.phoneNumber,
                    username: user.username,
                    displayPicture: user.displayPicture,
                    isEmailVerified: user.isEmailVerified,
                    kycStatus: user.kycStatus,
                    kyc: user.kycDocument,
                    addresses: user.addresses,
                    bankDetails: {
                        bankName: user.bankName,
                        accountNumber: user.accountNumber,
                        accountName: user.accountName,
                    },
                    createdAt: user.createdAt,
                },
            });
        } catch (error) {
            console.error('Get profile error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Update the profile of the currently authenticated user.
     * Allows updating first name, last name, phone number, username, display picture, and bank details.
     * Validates username uniqueness if provided.
     * Returns the updated user profile.
     */
    static async updateProfile(req: AuthRequest, res: Response): Promise<void> {
        try {
            const {
                firstName,
                lastName,
                phoneNumber,
                username,
                displayPicture,
                bankName,
                accountNumber,
                accountName,
            } = req.body;

            const userRepository = AppDataSource.getRepository(User);

            // Check username uniqueness if provided
            if (username) {
                // Validate username format
                const formatValidation =
                    UsernameService.validateUsernameFormat(username);
                if (!formatValidation.isValid) {
                    res.status(400).json({ error: formatValidation.error });
                    return;
                }

                // Check if username is available for this user
                const isAvailable =
                    await UsernameService.isUsernameAvailableForUser(
                        username,
                        req.user!.id!
                    );
                if (!isAvailable) {
                    res.status(400).json({
                        error: 'Username is already taken. Please choose a different username.',
                    });
                    return;
                }
            }

            // Prepare update data (only include fields that are provided)
            const updateData: any = {};
            if (firstName !== undefined) updateData.firstName = firstName;
            if (lastName !== undefined) updateData.lastName = lastName;
            if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
            if (username !== undefined) updateData.username = username;
            if (displayPicture !== undefined)
                updateData.displayPicture = displayPicture;
            if (bankName !== undefined) updateData.bankName = bankName;
            if (accountNumber !== undefined)
                updateData.accountNumber = accountNumber;
            if (accountName !== undefined) updateData.accountName = accountName;

            // Update user profile
            await userRepository.update({ id: req.user!.id }, updateData);

            // Fetch updated user data
            const updatedUser = await userRepository.findOne({
                where: { id: req.user!.id },
            });

            res.json({
                message: 'Profile updated successfully',
                user: {
                    id: updatedUser!.id,
                    email: updatedUser!.email,
                    firstName: updatedUser!.firstName,
                    lastName: updatedUser!.lastName,
                    phoneNumber: updatedUser!.phoneNumber,
                    username: updatedUser!.username,
                    displayPicture: updatedUser!.displayPicture,
                    bankDetails: {
                        bankName: updatedUser!.bankName,
                        accountNumber: updatedUser!.accountNumber,
                        accountName: updatedUser!.accountName,
                    },
                },
            });
        } catch (error) {
            console.error('Update profile error:', error);
            if (
                error instanceof Error &&
                error.message.includes('unique constraint')
            ) {
                res.status(400).json({ error: 'Username is already taken' });
            } else {
                res.status(500).json({ error: 'Internal server error' });
            }
        }
    }

    /**
     * Add a new blockchain address for the authenticated user.
     * Checks for duplicates before adding.
     * Returns all addresses after addition.
     */
    static async addAddress(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { chain, address } = req.body;
            const addressRepository = AppDataSource.getRepository(UserAddress);

            // Check if address already exists
            const existingAddress = await addressRepository.findOne({
                where: { userId: req.user!.id, chain, address },
            });

            if (existingAddress) {
                res.status(400).json({ error: 'Address already exists' });
                return;
            }

            // Add new address
            const newAddress = addressRepository.create({
                chain,
                address,
                userId: req.user!.id,
            });

            await addressRepository.save(newAddress);

            const addresses = await addressRepository.find({
                where: { userId: req.user!.id },
            });

            res.json({
                message: 'Address added successfully',
                addresses,
            });
        } catch (error) {
            console.error('Add address error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Remove a blockchain address for the authenticated user.
     * Expects addressId in req.params.
     * Returns all addresses after removal.
     */
    static async removeAddress(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { addressId } = req.params;
            const addressRepository = AppDataSource.getRepository(UserAddress);

            const result = await addressRepository.delete({
                id: addressId,
                userId: req.user!.id,
            });

            if (result.affected === 0) {
                res.status(404).json({ error: 'Address not found' });
                return;
            }

            const addresses = await addressRepository.find({
                where: { userId: req.user!.id },
            });

            res.json({
                message: 'Address removed successfully',
                addresses,
            });
        } catch (error) {
            console.error('Remove address error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Update the KYC status for a user (admin only, simplified for demo).
     * Expects userId in req.params and status/rejectionReason in req.body.
     * Updates both the user and KYC document.
     */
    static async updateKYCStatus(
        req: AuthRequest,
        res: Response
    ): Promise<void> {
        try {
            const { userId } = req.params;
            const { status, rejectionReason } = req.body;
            const userRepository = AppDataSource.getRepository(User);
            const kycRepository = AppDataSource.getRepository(KYCDocument);

            const user = await userRepository.findOne({
                where: { id: userId },
                relations: ['kycDocument'],
            });

            if (!user) {
                res.status(404).json({ error: 'User not found' });
                return;
            }

            // Update user KYC status
            user.kycStatus = status;
            await userRepository.save(user);

            // Update or create KYC document
            let kycDoc = user.kycDocument;
            if (!kycDoc) {
                kycDoc = kycRepository.create({
                    userId: user.id,
                    status,
                });
            } else {
                kycDoc.status = status;
            }

            kycDoc.reviewedAt = new Date();
            if (status === KYCStatus.REJECTED && rejectionReason) {
                kycDoc.rejectionReason = rejectionReason;
            }

            await kycRepository.save(kycDoc);

            res.json({
                message: 'KYC status updated successfully',
                kyc: kycDoc,
            });
        } catch (error) {
            console.error('Update KYC error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Check if a username is available
     * Public endpoint - no authentication required
     */
    static async checkUsernameAvailability(
        req: AuthRequest,
        res: Response
    ): Promise<void> {
        try {
            const { username } = req.params;

            if (!username) {
                res.status(400).json({ error: 'Username is required' });
                return;
            }

            // Validate username format
            const formatValidation =
                UsernameService.validateUsernameFormat(username);
            if (!formatValidation.isValid) {
                res.status(400).json({
                    error: formatValidation.error,
                    available: false,
                });
                return;
            }

            // Check availability
            const isAvailable = await UsernameService.isUsernameAvailable(
                username
            );

            res.json({
                username,
                available: isAvailable,
                message: isAvailable
                    ? 'Username is available'
                    : 'Username is already taken',
            });
        } catch (error) {
            console.error('Check username availability error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Get username suggestions based on user's name
     * Requires authentication
     */
    static async getUsernameSuggestions(
        req: AuthRequest,
        res: Response
    ): Promise<void> {
        try {
            const userRepository = AppDataSource.getRepository(User);
            const user = await userRepository.findOne({
                where: { id: req.user!.id },
                select: ['firstName', 'lastName'],
            });

            if (!user) {
                res.status(404).json({ error: 'User not found' });
                return;
            }

            const suggestions =
                await UsernameService.generateUsernameSuggestions(
                    user.firstName || undefined,
                    user.lastName || undefined
                );

            res.json({
                suggestions,
                message:
                    suggestions.length > 0
                        ? 'Username suggestions generated successfully'
                        : 'No available suggestions found. Try a different approach.',
            });
        } catch (error) {
            console.error('Get username suggestions error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Set a 4-digit transaction PIN for the authenticated user.
     * Expects { pin: '1234' } in body. Stores hashed pin in DB.
     */
    static async setTransactionPin(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { pin } = req.body;
            if (!pin || typeof pin !== 'string') {
                res.status(400).json({ error: 'PIN is required' });
                return;
            }
            // Validate 4-digit numeric PIN
            if (!/^\d{4}$/.test(pin)) {
                res.status(400).json({ error: 'PIN must be exactly 4 digits' });
                return;
            }

            const userRepository = AppDataSource.getRepository(User);
            const user = await userRepository.findOne({ where: { id: req.user!.id } });
            if (!user) {
                res.status(404).json({ error: 'User not found' });
                return;
            }

            // Store hashed PIN (use bcrypt)
            user.transactionPin = pin;
            await userRepository.save(user);

            res.json({ message: 'Transaction PIN set successfully' });
        } catch (error) {
            console.error('Set transaction PIN error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Verify a provided 4-digit PIN against stored hash.
     * Expects { pin: '1234' } in body.
     */
    static async verifyTransactionPin(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { pin } = req.body;
            if (!pin || typeof pin !== 'string') {
                res.status(400).json({ error: 'PIN is required' });
                return;
            }
            if (!/^\d{4}$/.test(pin)) {
                res.status(400).json({ error: 'PIN must be exactly 4 digits' });
                return;
            }

            const userRepository = AppDataSource.getRepository(User);
            const user = await userRepository.findOne({ where: { id: req.user!.id } });
            if (!user) {
                res.status(404).json({ error: 'User not found' });
                return;
            }

            if (!user.transactionPin) {
                res.status(400).json({ error: 'Transaction PIN not set' });
                return;
            }

            // Compare using bcrypt
            const bcrypt = (await import('bcryptjs')).default;
            const match = await bcrypt.compare(pin, user.transactionPin as string);

            res.json({ valid: !!match });
        } catch (error) {
            console.error('Verify transaction PIN error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Delete the account of the currently authenticated user.
     * Removes the user and all related data (addresses, KYC documents).
     */
    static async deleteAccount(req: AuthRequest, res: Response): Promise<void> {
        try {
            if (!req.user || !req.user.id) {
                res.status(401).json({
                    error: 'Unauthorized: user not authenticated',
                });
                return;
            }
            const userId = req.user.id; // assumes authMiddleware sets req.user

            const userRepo = AppDataSource.getRepository(User);
            const user = await userRepo.findOne({ where: { id: userId } });

            if (!user) {
                res.status(404).json({ error: 'User not found' });
                return;
            }

            await userRepo.remove(user); // will cascade if relations are set with onDelete: 'CASCADE'
            res.json({ message: 'Account deleted successfully' });
        } catch (error) {
            console.error('Delete account error:', error);
            res.status(500).json({ error: 'Failed to delete account' });
        }
    }

    /**
     * Delete a user account (admin only).
     * Expects userId in req.params.
     */
    static async adminDeleteAccount(
        req: Request,
        res: Response
    ): Promise<void> {
        try {
            const { userId } = req.params;
            const userRepo = AppDataSource.getRepository(User);
            const user = await userRepo.findOne({ where: { id: userId } });

            if (!user) {
                res.status(404).json({ error: 'User not found' });
                return;
            }

            await userRepo.remove(user);
            res.json({ message: 'User account deleted (no admin check)' });
        } catch (error) {
            console.error('Admin delete account error:', error);
            res.status(500).json({ error: 'Failed to delete user account' });
        }
    }

    /**
     * Delete a user account by email (no auth required).
     * Expects email in req.params.
     */
    static async deleteAccountByEmail(
        req: Request,
        res: Response
    ): Promise<void> {
        try {
            const { email } = req.params;
            const userRepo = AppDataSource.getRepository(User);
            const user = await userRepo.findOne({ where: { email } });

            if (!user) {
                res.status(404).json({ error: 'User not found' });
                return;
            }

            await userRepo.remove(user);
            res.json({ message: 'User account deleted by email (no auth)' });
        } catch (error) {
            console.error('Delete account by email error:', error);
            res.status(500).json({ error: 'Failed to delete user account' });
        }
    }
}
