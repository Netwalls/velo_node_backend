import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authMiddleware } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import {
    forgotPasswordSchema,
    verifyResetTokenSchema,
    resetPasswordSchema,
} from '../validation/auth';

const router = Router();

// Register new user
router.post('/register', AuthController.register);

// Login user
router.post('/login', AuthController.login);

// Verify OTP
router.post('/verify-otp', AuthController.verifyOTP);

// Resend OTP
router.post('/resend-otp', AuthController.resendOTP);

// Refresh token
router.post('/refresh-token', AuthController.refreshToken);

// Forgot password
router.post(
    '/forgot-password',
    validateRequest(forgotPasswordSchema),
    AuthController.forgotPassword
);

// Verify reset token
router.post(
    '/verify-reset-token',
    validateRequest(verifyResetTokenSchema),
    AuthController.verifyResetToken
);

// Reset password
router.post(
    '/reset-password',
    validateRequest(resetPasswordSchema),
    AuthController.resetPassword
);

// Logout
router.post('/logout', authMiddleware, AuthController.logout);

// Logout from all devices
router.post('/logout-all', authMiddleware, AuthController.logoutAll);

// Delete user by ID (expects :id param)
router.delete(
    '/delete-user/:id',
    authMiddleware,
    AuthController.deleteUserById
);

export default router;
