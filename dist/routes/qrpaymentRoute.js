"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// routes/merchantRoutes.ts
const express_1 = require("express");
const QRPaymentController_1 = require("../controllers/QRPaymentController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// ============================================
// PAYMENT MANAGEMENT ROUTES
// ============================================
/**
 * @route   POST /api/merchant/payments
 * @desc    Create a new payment request with QR code
 * @access  Private (requires authentication)
 * @body    {
 *   amount: number,
 *   chain: 'bitcoin' | 'ethereum' | 'solana' | 'starknet' | 'polkadot' | 'usdt-erc20' | 'usdt-trc20',
 *   network: 'mainnet' | 'testnet',
 *   ethAddress?: string,
 *   btcAddress?: string,
 *   solAddress?: string,
 *   strkAddress?: string,
 *   polkadotAddress?: string,
 *   usdtErc20Address?: string,
 *   usdtTrc20Address?: string,
 *   description?: string
 * }
 */
router.post('/payments', auth_1.authMiddleware, QRPaymentController_1.MerchantController.createPayment);
/**
 * @route   GET /api/merchant/payments
 * @desc    Get all payment requests for the authenticated merchant
 * @access  Private (requires authentication)
 * @query   {
 *   status?: 'pending' | 'completed' | 'cancelled',
 *   chain?: string,
 *   limit?: number (default: 50),
 *   offset?: number (default: 0)
 * }
 */
router.get('/payments', auth_1.authMiddleware, QRPaymentController_1.MerchantController.getPayments);
/**
 * @route   GET /api/merchant/payments/stats
 * @desc    Get payment statistics and summary for the merchant
 * @access  Private (requires authentication)
 * @returns {
 *   stats: {
 *     total: number,
 *     pending: number,
 *     completed: number,
 *     cancelled: number,
 *     totalAmount: number
 *   }
 * }
 */
router.get('/payments/stats', auth_1.authMiddleware, QRPaymentController_1.MerchantController.getPaymentStats);
/**
 * @route   GET /api/merchant/payments/:id
 * @desc    Get a specific payment by ID
 * @access  Private (requires authentication)
 * @params  id - Payment ID
 */
router.get('/payments/:id', auth_1.authMiddleware, QRPaymentController_1.MerchantController.getPaymentById);
/**
 * @route   POST /api/merchant/payments/:id/cancel
 * @desc    Cancel a pending payment
 * @access  Private (requires authentication)
 * @params  id - Payment ID
 * @note    Only pending payments can be cancelled
 */
router.post('/payments/:id/cancel', auth_1.authMiddleware, QRPaymentController_1.MerchantController.cancelPayment);
/**
 * @route   POST /api/merchant/payments/:id/monitor
 * @desc    Manually check blockchain for payment confirmation
 * @access  Private (requires authentication)
 * @params  id - Payment ID
 * @returns {
 *   payment: MerchantPayment,
 *   blockchainStatus: {
 *     confirmed: boolean,
 *     transactionHash?: string,
 *     confirmations?: number,
 *     error?: string
 *   }
 * }
 */
router.post('/payments/:id/monitor', auth_1.authMiddleware, QRPaymentController_1.MerchantController.monitorPayment);
// ============================================
// ADMIN/SYSTEM ROUTES (Optional - for testing/admin)
// ============================================
/**
 * @route   POST /api/merchant/payments/monitor-all
 * @desc    Monitor all pending payments (used by cron job or admin)
 * @access  Public (should be protected by API key or admin middleware)
 * @note    This endpoint is typically called by a cron job
 *          Consider adding admin authentication or API key validation
 */
router.post('/payments/monitor-all', QRPaymentController_1.MerchantController.monitorAllPendingPayments);
exports.default = router;
//# sourceMappingURL=qrpaymentRoute.js.map