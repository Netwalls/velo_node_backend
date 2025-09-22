import { Response } from 'express';
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
}
