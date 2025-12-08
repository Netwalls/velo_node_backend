import { Router } from 'express';
import { RampController } from '../controllers/rampController';

const router = Router();

router.post('/session', RampController.session);
router.post('/on-ramp', RampController.onRamp);
router.post('/off-ramp/banks', RampController.getBanks);
router.post('/off-ramp', RampController.offRamp);
router.get('/rates', RampController.rates);
router.post('/transactions', RampController.transactions);

export default router;