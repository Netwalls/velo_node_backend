import { Router } from 'express';
import { MerchantController } from '../controllers/merchantControler';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/create', authMiddleware, MerchantController.createPayment);
router.get('/my-payments', authMiddleware, MerchantController.getPayments);

export default router;