import { Router } from 'express';
import { WalletController } from '../controllers/walletController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Get all balances for the authenticated user
router.get('/balances', authMiddleware, WalletController.getBalances);

// Get user wallet addresses
router.get('/addresses', authMiddleware, WalletController.getWalletAddresses);

// Get user testnet addresses (chain and address only)
router.get(
    '/addresses/testnet',
    authMiddleware,
    WalletController.getTestnetAddresses
);

// Get user mainnet addresses (chain and address only)
router.get(
    '/addresses/mainnet',
    authMiddleware,
    WalletController.getMainnetAddresses
);

// Get all balances for a specific user by userId (admin/public)
router.get('/balances/:userId', WalletController.getBalancesByUserId);

// Starknet: Generate and deploy wallet
// router.post(
//     '/starknet/generate-and-deploy',
//     WalletController.generateAndDeployStarknetWallet
// );

export default router;
