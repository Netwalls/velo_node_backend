import { Router } from 'express';
import AdminController from '../controllers/adminController';
import { authMiddleware } from '../middleware/auth';
import adminMiddleware from '../middleware/admin';

const router = Router();

// Protect the admin stats route
router.get('/stats', authMiddleware, adminMiddleware, AdminController.getStats);

// Delete user by id (admin only)
router.delete(
	'/users/:id',
	authMiddleware,
	adminMiddleware,
	AdminController.deleteUser
);

export default router;
