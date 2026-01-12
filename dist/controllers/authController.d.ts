import { Request, Response } from "express";
import { AuthRequest } from "../types";
export declare class AuthController {
    /**
     * Delete a user by ID (from route param).
     * Expects 'id' as req.params.id.
     * Responds with success or error if not found.
     */
    static deleteUserById(req: Request, res: Response): Promise<void>;
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
    static register(req: Request, res: Response): Promise<void>;
    /**
     * Login user.
     * - Finds user by email and checks password.
     * - Verifies email is confirmed.
     * - Generates JWT access and refresh tokens.
     * - Saves refresh token to the database.
     * - Returns tokens and basic user info.
     */
    static login(req: Request, res: Response): Promise<void>;
    /**
     * Google Sign-in / Sign-up check
     * Expects either { idToken } (Google ID token) or { email } in the body.
     * If user exists -> issue JWTs and return user + tokens.
     * If user does NOT exist -> return { exists: false, email, name } so frontend can route to account creation.
     */
    static googleSignIn(req: Request, res: Response): Promise<any>;
    /**
     * Google Sign-up
     * - Verifies idToken with Google
     * - Ensures email_verified is true
     * - Creates a new user (if not exists) and generates wallets/addresses
     * - Issues access + refresh tokens and returns user + tokens
     */
    static googleSignup(req: Request, res: Response): Promise<any>;
    /**
     * Verify OTP for email verification.
     * - Looks up user by email.
     * - Checks OTP and expiry.
     * - Marks email as verified if OTP is valid.
     * - Returns success or error.
     */
    static verifyOTP(req: Request, res: Response): Promise<any>;
    /**
     * Resend OTP for email verification.
     * - Finds user by email.
     * - Generates a new OTP and expiry.
     * - Saves OTP to user and logs it (email sending is commented out).
     * - Returns success or error.
     */
    static resendOTP(req: Request, res: Response): Promise<void>;
    /**
     * Refresh JWT access token using a valid refresh token.
     * - Verifies the refresh token and checks expiry/revocation.
     * - Finds the user and issues a new access token.
     * - Returns the new access token or error.
     */
    static refreshToken(req: Request, res: Response): Promise<void>;
    /**
     * Logout user by revoking the provided refresh token.
     * - Marks the refresh token as revoked in the database.
     * - Returns a success message.
     */
    static logout(req: AuthRequest, res: Response): Promise<void>;
    /**
     * Logout user from all devices by revoking all refresh tokens for the user.
     * - Marks all refresh tokens for the user as revoked in the database.
     * - Returns a success message.
     */
    static logoutAll(req: AuthRequest, res: Response): Promise<void>;
    /**
     * Initiate forgot password process
     * - Validates email exists
     * - Generates secure reset token
     * - Sends reset email with token
     * - Sets token expiry (15 minutes)
     */
    static forgotPassword(req: Request, res: Response): Promise<void>;
    /**
     * Verify password reset token
     * - Validates reset token and expiry
     * - Returns success if token is valid
     */
    static verifyResetToken(req: Request, res: Response): Promise<void>;
    /**
     * Reset password with token
     * - Validates reset token and expiry
     * - Updates password
     * - Clears reset token
     * - Revokes all existing refresh tokens for security
     */
    static resetPassword(req: Request, res: Response): Promise<void>;
    /**
     * Map chain names to internal format
     * - Converts common chain names to internal identifiers
     * - Used for consistency in address handling
     */
    static mapChainName(chain: string): string;
    /**
     * Helper to sort addresses by desired chain order.
     */
    static sortAddresses(addresses: any[]): any[];
}
//# sourceMappingURL=authController.d.ts.map