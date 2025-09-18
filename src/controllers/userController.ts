import { Response } from 'express';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { UserAddress } from '../entities/UserAddress';
import { KYCDocument } from '../entities/KYCDocument';
import { AuthRequest, KYCStatus } from '../types';

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
                    isEmailVerified: user.isEmailVerified,
                    kycStatus: user.kycStatus,
                    kyc: user.kycDocument,
                    addresses: user.addresses,
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
                    isEmailVerified: user.isEmailVerified,
                    kycStatus: user.kycStatus,
                    kyc: user.kycDocument,
                    addresses: user.addresses,
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
     * Allows updating first name, last name, and phone number.
     * Returns the updated user profile.
     */
    static async updateProfile(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { firstName, lastName, phoneNumber } = req.body;
            const userRepository = AppDataSource.getRepository(User);

            await userRepository.update(
                { id: req.user!.id },
                { firstName, lastName, phoneNumber }
            );

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
                },
            });
        } catch (error) {
            console.error('Update profile error:', error);
            res.status(500).json({ error: 'Internal server error' });
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
}
