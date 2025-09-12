import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Get user profile
router.get('/profile', authMiddleware, UserController.getProfile);

// Update user profile
router.put('/profile', authMiddleware, UserController.updateProfile);

// Add blockchain address
router.post('/address', authMiddleware, UserController.addAddress);

// Remove blockchain address
router.delete(
    '/address/:addressId',
    authMiddleware,
    UserController.removeAddress
);

// Update KYC status (admin only - demo)
router.put('/kyc/:userId', authMiddleware, UserController.updateKYCStatus);

export default router;


// getProfile
// updateProfile
// addAddress
// removeAddress
// updateKYCStatus