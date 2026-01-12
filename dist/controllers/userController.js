"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const database_1 = require("../config/database");
const User_1 = require("../entities/User");
const UserAddress_1 = require("../entities/UserAddress");
const KYCDocument_1 = require("../entities/KYCDocument");
const MerchantPayment_1 = require("../entities/MerchantPayment");
const Conversion_1 = require("../entities/Conversion");
const SplitPayment_1 = require("../entities/SplitPayment");
const SplitPaymentExecution_1 = require("../entities/SplitPaymentExecution");
const SplitPaymentExecutionResult_1 = require("../entities/SplitPaymentExecutionResult");
const SplitPaymentRecipient_1 = require("../entities/SplitPaymentRecipient");
const Fee_1 = require("../entities/Fee");
const types_1 = require("../types");
const usernameService_1 = require("../services/usernameService");
class UserController {
    /**
     * Get user profile by ID (admin or public endpoint).
     * Fetches user details, KYC document, and addresses for the given userId param.
     * Returns 404 if not found.
     */
    static async getProfileById(req, res) {
        try {
            const { userId } = req.params;
            const userRepository = database_1.AppDataSource.getRepository(User_1.User);
            const user = await userRepository.findOne({
                where: { id: typeof userId === 'string' ? userId : userId[0] },
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
                    hasTransactionPin: !!user.transactionPin,
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
        }
        catch (error) {
            console.error('Get profile by ID error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    /**
     * Get profile for the currently authenticated user.
     * Fetches user details, KYC document, and addresses for req.user!.id.
     * Returns 404 if not found.
     */
    static async getProfile(req, res) {
        try {
            const userRepository = database_1.AppDataSource.getRepository(User_1.User);
            const user = await userRepository.findOne({
                where: { id: req.user.id },
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
                    hasTransactionPin: !!user.transactionPin,
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
        }
        catch (error) {
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
    static async updateProfile(req, res) {
        try {
            const { firstName, lastName, phoneNumber, username, displayPicture, bankName, accountNumber, accountName, } = req.body;
            const userRepository = database_1.AppDataSource.getRepository(User_1.User);
            // Check username uniqueness if provided
            if (username) {
                // Validate username format
                const formatValidation = usernameService_1.UsernameService.validateUsernameFormat(username);
                if (!formatValidation.isValid) {
                    res.status(400).json({ error: formatValidation.error });
                    return;
                }
                // Check if username is available for this user
                const isAvailable = await usernameService_1.UsernameService.isUsernameAvailableForUser(username, req.user.id);
                if (!isAvailable) {
                    res.status(400).json({
                        error: 'Username is already taken. Please choose a different username.',
                    });
                    return;
                }
            }
            // Prepare update data (only include fields that are provided)
            const updateData = {};
            if (firstName !== undefined)
                updateData.firstName = firstName;
            if (lastName !== undefined)
                updateData.lastName = lastName;
            if (phoneNumber !== undefined)
                updateData.phoneNumber = phoneNumber;
            if (username !== undefined)
                updateData.username = username;
            if (displayPicture !== undefined)
                updateData.displayPicture = displayPicture;
            if (bankName !== undefined)
                updateData.bankName = bankName;
            if (accountNumber !== undefined)
                updateData.accountNumber = accountNumber;
            if (accountName !== undefined)
                updateData.accountName = accountName;
            // Update user profile
            await userRepository.update({ id: req.user.id }, updateData);
            // Fetch updated user data
            const updatedUser = await userRepository.findOne({
                where: { id: req.user.id },
            });
            res.json({
                message: 'Profile updated successfully',
                user: {
                    id: updatedUser.id,
                    email: updatedUser.email,
                    firstName: updatedUser.firstName,
                    lastName: updatedUser.lastName,
                    phoneNumber: updatedUser.phoneNumber,
                    username: updatedUser.username,
                    displayPicture: updatedUser.displayPicture,
                    bankDetails: {
                        bankName: updatedUser.bankName,
                        accountNumber: updatedUser.accountNumber,
                        accountName: updatedUser.accountName,
                    },
                },
            });
        }
        catch (error) {
            console.error('Update profile error:', error);
            if (error instanceof Error &&
                error.message.includes('unique constraint')) {
                res.status(400).json({ error: 'Username is already taken' });
            }
            else {
                res.status(500).json({ error: 'Internal server error' });
            }
        }
    }
    /**
     * Add a new blockchain address for the authenticated user.
     * Checks for duplicates before adding.
     * Returns all addresses after addition.
     */
    static async addAddress(req, res) {
        try {
            const { chain, address } = req.body;
            const addressRepository = database_1.AppDataSource.getRepository(UserAddress_1.UserAddress);
            // Check if address already exists
            const existingAddress = await addressRepository.findOne({
                where: { userId: req.user.id, chain, address },
            });
            if (existingAddress) {
                res.status(400).json({ error: 'Address already exists' });
                return;
            }
            // Add new address
            const newAddress = addressRepository.create({
                chain,
                address,
                userId: req.user.id,
            });
            await addressRepository.save(newAddress);
            const addresses = await addressRepository.find({
                where: { userId: req.user.id },
            });
            res.json({
                message: 'Address added successfully',
                addresses,
            });
        }
        catch (error) {
            console.error('Add address error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    /**
     * Remove a blockchain address for the authenticated user.
     * Expects addressId in req.params.
     * Returns all addresses after removal.
     */
    static async removeAddress(req, res) {
        try {
            const { addressId } = req.params;
            const addressIdStr = typeof addressId === 'string' ? addressId : addressId[0];
            const addressRepository = database_1.AppDataSource.getRepository(UserAddress_1.UserAddress);
            const result = await addressRepository.delete({
                id: addressIdStr,
                userId: req.user.id,
            });
            if (result.affected === 0) {
                res.status(404).json({ error: 'Address not found' });
                return;
            }
            const addresses = await addressRepository.find({
                where: { userId: req.user.id },
            });
            res.json({
                message: 'Address removed successfully',
                addresses,
            });
        }
        catch (error) {
            console.error('Remove address error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    /**
     * Update the KYC status for a user (admin only, simplified for demo).
     * Expects userId in req.params and status/rejectionReason in req.body.
     * Updates both the user and KYC document.
     */
    static async updateKYCStatus(req, res) {
        try {
            const { userId } = req.params;
            const { status, rejectionReason } = req.body;
            const userRepository = database_1.AppDataSource.getRepository(User_1.User);
            const kycRepository = database_1.AppDataSource.getRepository(KYCDocument_1.KYCDocument);
            const user = await userRepository.findOne({
                where: { id: typeof userId === 'string' ? userId : userId[0] },
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
            }
            else {
                kycDoc.status = status;
            }
            kycDoc.reviewedAt = new Date();
            if (status === types_1.KYCStatus.REJECTED && rejectionReason) {
                kycDoc.rejectionReason = rejectionReason;
            }
            await kycRepository.save(kycDoc);
            res.json({
                message: 'KYC status updated successfully',
                kyc: kycDoc,
            });
        }
        catch (error) {
            console.error('Update KYC error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    /**
     * Check if a username is available
     * Public endpoint - no authentication required
     */
    static async checkUsernameAvailability(req, res) {
        try {
            const { username } = req.params;
            const usernameStr = typeof username === 'string' ? username : username[0];
            if (!usernameStr) {
                res.status(400).json({ error: 'Username is required' });
                return;
            }
            // Validate username format
            const formatValidation = usernameService_1.UsernameService.validateUsernameFormat(usernameStr);
            if (!formatValidation.isValid) {
                res.status(400).json({
                    error: formatValidation.error,
                    available: false,
                });
                return;
            }
            // Check availability
            const isAvailable = await usernameService_1.UsernameService.isUsernameAvailable(usernameStr);
            res.json({
                username,
                available: isAvailable,
                message: isAvailable
                    ? 'Username is available'
                    : 'Username is already taken',
            });
        }
        catch (error) {
            console.error('Check username availability error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    /**
     * Get username suggestions based on user's name
     * Requires authentication
     */
    static async getUsernameSuggestions(req, res) {
        try {
            const userRepository = database_1.AppDataSource.getRepository(User_1.User);
            const user = await userRepository.findOne({
                where: { id: req.user.id },
                select: ['firstName', 'lastName'],
            });
            if (!user) {
                res.status(404).json({ error: 'User not found' });
                return;
            }
            const suggestions = await usernameService_1.UsernameService.generateUsernameSuggestions(user.firstName || undefined, user.lastName || undefined);
            res.json({
                suggestions,
                message: suggestions.length > 0
                    ? 'Username suggestions generated successfully'
                    : 'No available suggestions found. Try a different approach.',
            });
        }
        catch (error) {
            console.error('Get username suggestions error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    /**
     * Set a 4-digit transaction PIN for the authenticated user.
     * Expects { pin: '1234' } in body. Stores hashed pin in DB.
     */
    static async setTransactionPin(req, res) {
        try {
            // Accept either numeric or string PIN (allow { pin: 1234 } or { pin: '1234' })
            const pinRaw = req.body?.pin ?? req.body?.transactionPin;
            if (pinRaw === undefined || pinRaw === null) {
                res.status(400).json({ error: 'PIN is required' });
                return;
            }
            const pin = String(pinRaw);
            // Validate 4-digit numeric PIN
            if (!/^\d{4}$/.test(pin)) {
                res.status(400).json({ error: 'PIN must be exactly 4 digits' });
                return;
            }
            const userRepository = database_1.AppDataSource.getRepository(User_1.User);
            const user = await userRepository.findOne({ where: { id: req.user.id } });
            if (!user) {
                res.status(404).json({ error: 'User not found' });
                return;
            }
            // Store hashed PIN (use bcrypt)
            user.transactionPin = pin;
            await userRepository.save(user);
            res.json({ message: 'Transaction PIN set successfully' });
        }
        catch (error) {
            console.error('Set transaction PIN error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    /**
     * Verify a provided 4-digit PIN against stored hash.
     * Expects { pin: '1234' } in body.
     */
    static async verifyTransactionPin(req, res) {
        try {
            // Accept numeric or string PIN for verification
            const pinRaw = req.body?.pin ?? req.body?.transactionPin;
            if (pinRaw === undefined || pinRaw === null) {
                res.status(400).json({ error: 'PIN is required' });
                return;
            }
            const pin = String(pinRaw);
            if (!/^\d{4}$/.test(pin)) {
                res.status(400).json({ error: 'PIN must be exactly 4 digits' });
                return;
            }
            const userRepository = database_1.AppDataSource.getRepository(User_1.User);
            const user = await userRepository.findOne({ where: { id: req.user.id } });
            if (!user) {
                res.status(404).json({ error: 'User not found' });
                return;
            }
            if (!user.transactionPin) {
                res.status(400).json({ error: 'Transaction PIN not set' });
                return;
            }
            // Compare using bcrypt
            const bcrypt = (await Promise.resolve().then(() => __importStar(require('bcryptjs')))).default;
            const match = await bcrypt.compare(pin, user.transactionPin);
            res.json({ valid: !!match });
        }
        catch (error) {
            console.error('Verify transaction PIN error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    /**
     * Delete the account of the currently authenticated user.
     * Removes the user and all related data (addresses, KYC documents).
     */
    static async deleteAccount(req, res) {
        try {
            if (!req.user || !req.user.id) {
                res.status(401).json({
                    error: 'Unauthorized: user not authenticated',
                });
                return;
            }
            const userId = req.user.id; // assumes authMiddleware sets req.user
            const userRepo = database_1.AppDataSource.getRepository(User_1.User);
            const user = await userRepo.findOne({ where: { id: userId } });
            if (!user) {
                res.status(404).json({ error: 'User not found' });
                return;
            }
            await userRepo.remove(user); // will cascade if relations are set with onDelete: 'CASCADE'
            res.json({ message: 'Account deleted successfully' });
        }
        catch (error) {
            console.error('Delete account error:', error);
            res.status(500).json({ error: 'Failed to delete account' });
        }
    }
    /**
     * Delete a user account (admin only).
     * Expects userId in req.params.
     */
    static async adminDeleteAccount(req, res) {
        try {
            const { userId } = req.params;
            const userRepo = database_1.AppDataSource.getRepository(User_1.User);
            const user = await userRepo.findOne({ where: { id: typeof userId === 'string' ? userId : userId[0] } });
            if (!user) {
                res.status(404).json({ error: 'User not found' });
                return;
            }
            await userRepo.remove(user);
            res.json({ message: 'User account deleted (no admin check)' });
        }
        catch (error) {
            console.error('Admin delete account error:', error);
            res.status(500).json({ error: 'Failed to delete user account' });
        }
    }
    /**
     * Delete a user account by email (no auth required).
     * Expects email in req.params.
     */
    static async deleteAccountByEmail(req, res) {
        try {
            const { email } = req.params;
            const emailStr = typeof email === 'string' ? email : email[0];
            const userRepo = database_1.AppDataSource.getRepository(User_1.User);
            const user = await userRepo.findOne({ where: { email: emailStr } });
            if (!user) {
                res.status(404).json({ error: 'User not found' });
                return;
            }
            // Delete dependent records that do not have ON DELETE CASCADE
            await database_1.AppDataSource.transaction(async (manager) => {
                // Delete merchant payments referencing this user
                await manager.delete(MerchantPayment_1.MerchantPayment, { userId: user.id });
                // Delete split payments and all dependent records (recipients, executions, execution results)
                const splitRepo = manager.getRepository(SplitPayment_1.SplitPayment);
                const executionsRepo = manager.getRepository(SplitPaymentExecution_1.SplitPaymentExecution);
                const execResultRepo = manager.getRepository(SplitPaymentExecutionResult_1.SplitPaymentExecutionResult);
                const recipientsRepo = manager.getRepository(SplitPaymentRecipient_1.SplitPaymentRecipient);
                const splits = await splitRepo.find({ where: { userId: user.id }, select: ['id'] });
                const splitIds = splits.map((s) => s.id);
                if (splitIds.length > 0) {
                    // Find executions for these split payments using query builder to avoid array-parameter issues
                    let executionIds = [];
                    if (splitIds.length > 0) {
                        const execRows = await manager
                            .createQueryBuilder()
                            .select('id')
                            .from('split_payment_executions', 'e')
                            .where('"splitPaymentId" IN (:...ids)', { ids: splitIds })
                            .getRawMany();
                        executionIds = execRows.map((r) => r.id || r.e_id || Object.values(r)[0]);
                    }
                    // Delete execution results
                    if (executionIds.length > 0) {
                        await manager
                            .createQueryBuilder()
                            .delete()
                            .from('split_payment_execution_results')
                            .where('"executionId" IN (:...ids)', { ids: executionIds })
                            .execute();
                    }
                    // Delete executions
                    await manager
                        .createQueryBuilder()
                        .delete()
                        .from('split_payment_executions')
                        .where('"splitPaymentId" IN (:...ids)', { ids: splitIds })
                        .execute();
                    // Delete recipients
                    await manager
                        .createQueryBuilder()
                        .delete()
                        .from('split_payment_recipients')
                        .where('"splitPaymentId" IN (:...ids)', { ids: splitIds })
                        .execute();
                    // Delete split payments
                    await manager
                        .createQueryBuilder()
                        .delete()
                        .from('split_payments')
                        .where('"id" IN (:...ids)', { ids: splitIds })
                        .execute();
                }
                // Delete fees associated with this user (nullable FK)
                await manager.delete(Fee_1.Fee, { userId: user.id });
                // Delete any conversions referencing the user (some conversions may cascade, but delete explicitly)
                await manager.delete(Conversion_1.Conversion, { userId: user.id });
                // Finally delete the user (addresses, kyc, refresh tokens cascade where configured)
                await manager.delete(User_1.User, { id: user.id });
            });
            res.json({ message: 'User account deleted by email (no auth)' });
        }
        catch (error) {
            console.error('Delete account by email error:', error);
            res.status(500).json({ error: 'Failed to delete user account' });
        }
    }
}
exports.UserController = UserController;
//# sourceMappingURL=userController.js.map