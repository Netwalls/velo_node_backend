import { Router } from 'express';
import { WalletController } from '../controllers/walletController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Get all balances for the authenticated user
router.get('/balances', authMiddleware, WalletController.getBalances);

// Get all balances for a specific user by userId (admin/public)
router.get('/balances/:userId', WalletController.getBalancesByUserId);

// Starknet: Generate and deploy wallet
// router.post(
//     '/starknet/generate-and-deploy',
//     WalletController.generateAndDeployStarknetWallet
// );

export default router;
