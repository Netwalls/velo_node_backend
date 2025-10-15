import { Router } from 'express';
import AdminController from '../controllers/adminController';
import { authMiddleware } from '../middleware/auth';
import adminMiddleware from '../middleware/admin';

const router = Router();

// Protect the admin stats route
router.get('/stats', authMiddleware, adminMiddleware, AdminController.getStats);

export default router;
