import { Request, Response } from 'express';
import { AuthRequest } from '../types';
export declare class UserController {
    /**
     * Get user profile by ID (admin or public endpoint).
     * Fetches user details, KYC document, and addresses for the given userId param.
     * Returns 404 if not found.
     */
    static getProfileById(req: AuthRequest, res: Response): Promise<void>;
    /**
     * Get profile for the currently authenticated user.
     * Fetches user details, KYC document, and addresses for req.user!.id.
     * Returns 404 if not found.
     */
    static getProfile(req: AuthRequest, res: Response): Promise<void>;
    /**
     * Update the profile of the currently authenticated user.
     * Allows updating first name, last name, phone number, username, display picture, and bank details.
     * Validates username uniqueness if provided.
     * Returns the updated user profile.
     */
    static updateProfile(req: AuthRequest, res: Response): Promise<void>;
    /**
     * Add a new blockchain address for the authenticated user.
     * Checks for duplicates before adding.
     * Returns all addresses after addition.
     */
    static addAddress(req: AuthRequest, res: Response): Promise<void>;
    /**
     * Remove a blockchain address for the authenticated user.
     * Expects addressId in req.params.
     * Returns all addresses after removal.
     */
    static removeAddress(req: AuthRequest, res: Response): Promise<void>;
    /**
     * Update the KYC status for a user (admin only, simplified for demo).
     * Expects userId in req.params and status/rejectionReason in req.body.
     * Updates both the user and KYC document.
     */
    static updateKYCStatus(req: AuthRequest, res: Response): Promise<void>;
    /**
     * Check if a username is available
     * Public endpoint - no authentication required
     */
    static checkUsernameAvailability(req: AuthRequest, res: Response): Promise<void>;
    /**
     * Get username suggestions based on user's name
     * Requires authentication
     */
    static getUsernameSuggestions(req: AuthRequest, res: Response): Promise<void>;
    /**
     * Set a 4-digit transaction PIN for the authenticated user.
     * Expects { pin: '1234' } in body. Stores hashed pin in DB.
     */
    static setTransactionPin(req: AuthRequest, res: Response): Promise<void>;
    /**
     * Verify a provided 4-digit PIN against stored hash.
     * Expects { pin: '1234' } in body.
     */
    static verifyTransactionPin(req: AuthRequest, res: Response): Promise<void>;
    /**
     * Delete the account of the currently authenticated user.
     * Removes the user and all related data (addresses, KYC documents).
     */
    static deleteAccount(req: AuthRequest, res: Response): Promise<void>;
    /**
     * Delete a user account (admin only).
     * Expects userId in req.params.
     */
    static adminDeleteAccount(req: Request, res: Response): Promise<void>;
    /**
     * Delete a user account by email (no auth required).
     * Expects email in req.params.
     */
    static deleteAccountByEmail(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=userController.d.ts.map