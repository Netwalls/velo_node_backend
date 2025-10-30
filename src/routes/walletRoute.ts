import { Router } from 'express';
import { WalletController } from '../controllers/walletController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Get all balances for the authenticated user
// router.get('/balances', authMiddleware, WalletController.getBalances);

// Get testnet balances for the authenticated user
router.get(
    '/balances/testnet',
    authMiddleware,
    WalletController.getTestnetBalances
);

// Get mainnet balances for the authenticated user
router.get(
    '/balances/mainnet',
    authMiddleware,
    WalletController.getMainnetBalances
);

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

router.post('/check-deposits', async (req, res) => {
    await WalletController.checkForDeposits();
    res.json({ message: 'Deposit check complete' });
});

router.post('/send', authMiddleware, async (req, res) => {
    await WalletController.sendTransaction(req, res);
});

// Debug probe for Alchemy endpoints (requires auth)
router.get('/debug/alchemy-probe', authMiddleware, async (req, res) => {
    await WalletController.alchemyProbe(req as any, res as any);
});

export default router;
