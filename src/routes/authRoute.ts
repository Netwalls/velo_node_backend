import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authMiddleware } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import createRateLimiter from '../middleware/rateLimiter';
import {
    forgotPasswordSchema,
    verifyResetTokenSchema,
    resetPasswordSchema,
} from '../validation/auth';

const router = Router();

// Register new user (strict rate limit: 5 reqs/min)
router.post(
    '/register',
    createRateLimiter({ windowMs: 60 * 1000, max: 5, message: 'Too many registration attempts, please try again in a minute.' }),
    AuthController.register
);

// Login user (rate limit: 10 reqs/min)
router.post(
    '/login',
    createRateLimiter({ windowMs: 60 * 1000, max: 10, message: 'Too many login attempts, please try again in a minute.' }),
    AuthController.login
);

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
