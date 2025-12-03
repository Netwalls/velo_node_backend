// services/auth-service/src/routes/auth.routes.ts
import { Router } from 'express';
import { AuthController } from '../controllers/authController';

const router = Router();

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/google', AuthController.googleSignIn);
// router.post('/google/signup', AuthController.googleSignup);

router.post('/verify-otp', AuthController.verifyOTP);
router.post('/resend-otp', AuthController.resendOTP);
router.post('/logout', AuthController.logout);
router.post('/forgot-password', AuthController.forgotPassword);

export default router;