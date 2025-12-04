"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const auth_2 = require("../validation/auth");
const router = (0, express_1.Router)();
// Register new user (strict rate limit: 5 reqs/min)
router.post('/register', 
// createRateLimiter({ windowMs: 60 * 1000, max: 5, message: 'Too many registration attempts, please try again in a minute.' }),
authController_1.AuthController.register);
// Login user (rate limit: 10 reqs/min)
router.post('/login', 
// createRateLimiter({ windowMs: 60 * 1000, max: 10, message: 'Too many login attempts, please try again in a minute.' }),
authController_1.AuthController.login);
// Google Sign-in check: returns tokens if user exists, otherwise { exists: false }
router.post('/google', authController_1.AuthController.googleSignIn);
// Google Sign-up: create account using Google id_token
router.post('/google/signup', authController_1.AuthController.googleSignup);
// Verify OTP
router.post('/verify-otp', authController_1.AuthController.verifyOTP);
// Resend OTP
router.post('/resend-otp', authController_1.AuthController.resendOTP);
// Refresh token
router.post('/refresh-token', authController_1.AuthController.refreshToken);
// Forgot password
router.post('/forgot-password', (0, validation_1.validateRequest)(auth_2.forgotPasswordSchema), authController_1.AuthController.forgotPassword);
// Verify reset token
router.post('/verify-reset-token', (0, validation_1.validateRequest)(auth_2.verifyResetTokenSchema), authController_1.AuthController.verifyResetToken);
// Reset password
router.post('/reset-password', (0, validation_1.validateRequest)(auth_2.resetPasswordSchema), authController_1.AuthController.resetPassword);
// Logout
router.post('/logout', auth_1.authMiddleware, authController_1.AuthController.logout);
// Logout from all devices
router.post('/logout-all', auth_1.authMiddleware, authController_1.AuthController.logoutAll);
// Delete user by ID (expects :id param)
router.delete('/delete-user/:id', auth_1.authMiddleware, authController_1.AuthController.deleteUserById);
exports.default = router;
//# sourceMappingURL=authRoute.js.map