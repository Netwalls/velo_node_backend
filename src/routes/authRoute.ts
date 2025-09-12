import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authMiddleware } from '../middleware/auth';

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

// Logout
router.post('/logout', authMiddleware, AuthController.logout);

// Logout from all devices
router.post('/logout-all', authMiddleware, AuthController.logoutAll);

export default router;
