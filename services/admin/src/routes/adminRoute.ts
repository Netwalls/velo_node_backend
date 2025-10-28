import { Router } from 'express';
import AdminController from '../controllers/adminController';

const router = Router();

// Simple API-key based protection handled in server.ts (middleware)
router.delete('/users/:id', AdminController.deleteUser);

export default router;
