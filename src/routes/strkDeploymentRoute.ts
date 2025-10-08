import { Router } from 'express';
import { StrkController } from '../controllers/StrkDeploymentController';
import { authMiddleware } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';

const router = Router();


router.get(
    '/balances/testnet/deploy',
    authMiddleware,
    StrkController.getTestnetBalancesDeploy
);

// Get mainnet balances for the authenticated user
router.get(
    '/balances/mainnet/deploy',
    authMiddleware,
    StrkController.getMainnetBalancesDeploy
);

export default router;