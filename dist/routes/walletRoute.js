"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const walletController_1 = require("../controllers/walletController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Get all balances for the authenticated user
// router.get('/balances', authMiddleware, WalletController.getBalances);
// Get testnet balances for the authenticated user
router.get('/balances/testnet', auth_1.authMiddleware, walletController_1.WalletController.getTestnetBalances);
// Get mainnet balances for the authenticated user
router.get('/balances/mainnet', auth_1.authMiddleware, walletController_1.WalletController.getMainnetBalances);
// Get user wallet addresses
router.get('/addresses', auth_1.authMiddleware, walletController_1.WalletController.getWalletAddresses);
// Get user testnet addresses (chain and address only)
router.get('/addresses/testnet', auth_1.authMiddleware, walletController_1.WalletController.getTestnetAddresses);
// Get user mainnet addresses (chain and address only)
router.get('/addresses/mainnet', auth_1.authMiddleware, walletController_1.WalletController.getMainnetAddresses);
router.post('/check-deposits', async (req, res) => {
    await walletController_1.WalletController.checkForDeposits();
    res.json({ message: 'Deposit check complete' });
});
router.post('/send', auth_1.authMiddleware, async (req, res) => {
    await walletController_1.WalletController.sendTransaction(req, res);
});
// Debug probe for Alchemy endpoints (requires auth)
router.get('/debug/alchemy-probe', auth_1.authMiddleware, async (req, res) => {
    await walletController_1.WalletController.alchemyProbe(req, res);
});
exports.default = router;
//# sourceMappingURL=walletRoute.js.map