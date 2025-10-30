"use strict";
// Get user profile by ID
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const userController_1 = require("../controllers/userController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Get user profile
router.get('/profile', auth_1.authMiddleware, userController_1.UserController.getProfile);
router.get('/profile/:userId', auth_1.authMiddleware, userController_1.UserController.getProfileById);
// Update user profile
router.put('/profile', auth_1.authMiddleware, userController_1.UserController.updateProfile);
// Check username availability (public)
router.get('/username/:username/availability', userController_1.UserController.checkUsernameAvailability);
// Get username suggestions (requires auth)
router.get('/username/suggestions', auth_1.authMiddleware, userController_1.UserController.getUsernameSuggestions);
// Add blockchain address
router.post('/address', auth_1.authMiddleware, userController_1.UserController.addAddress);
// Set transaction PIN (4-digit)
router.post('/transaction-pin', auth_1.authMiddleware, userController_1.UserController.setTransactionPin);
// Verify transaction PIN
router.post('/transaction-pin/verify', auth_1.authMiddleware, userController_1.UserController.verifyTransactionPin);
// Remove blockchain address
router.delete('/address/:addressId', auth_1.authMiddleware, userController_1.UserController.removeAddress);
// Update KYC status (admin only - demo)
router.put('/kyc/:userId', auth_1.authMiddleware, userController_1.UserController.updateKYCStatus);
// Delete user account
router.delete('/delete', auth_1.authMiddleware, userController_1.UserController.deleteAccount);
router.delete('/delete-by-email/:email', userController_1.UserController.deleteAccountByEmail);
exports.default = router;
// getProfile
// updateProfile
// addAddress
// removeAddress
// updateKYCStatus
//# sourceMappingURL=userRoute.js.map