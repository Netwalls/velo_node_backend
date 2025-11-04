import { Router } from 'express';
import { FiatController } from '../controllers/fiatController';
import changellyRoute from './changellyRoute';

const router = Router();

// Mount Changelly endpoints under /fiat/changelly
router.use('/changelly', changellyRoute);

// router.post('/deposit/initiate', FiatController.initiateDeposit);
// router.post('/deposit/webhook', FiatController.paystackWebhook);

export default router;
