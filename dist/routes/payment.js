"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const paymentController_1 = require("../controllers/paymentController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.post('/instant-buy', auth_1.authMiddleware, paymentController_1.PaymentController.instantBuy);
/**
 * Order Management
 */
router.get('/orders/:orderId', auth_1.authMiddleware, paymentController_1.PaymentController.getOrder);
/**
 * @route GET /api/payments/rates
 * @desc Get all current conversion rates
 * @access Public
 */
router.get('/rates', paymentController_1.PaymentController.getConversionRates);
/**
 * @route GET /api/payments/rate
 * @desc Get specific conversion rate between two currencies
 * @query from - Source currency (required)
 * @query to - Target currency (optional, defaults to USDT)
 * @access Public
 */
router.get('/rate', paymentController_1.PaymentController.getSpecificRate);
/**
 * @route POST /api/payments/calculate
 * @desc Calculate conversion without executing it
 * @body amount - Amount to convert (required)
 * @body fromCurrency - Source currency (required)
 * @body toCurrency - Target currency (optional, defaults to USDT)
 * @access Public
 */
router.post('/calculate', paymentController_1.PaymentController.calculateConversion);
/**
 * @route POST /api/payments/convert
 * @desc Execute manual conversion to USDT
 * @body amount - Amount to convert (required)
 * @body fromCurrency - Source currency (required)
 * @body fromAddress - Source wallet address (optional)
 * @access Private
 */
router.post('/convert', auth_1.authMiddleware, paymentController_1.PaymentController.convertToUSDT);
/**
 * @route GET /api/payments/balance
 * @desc Get user's USDT balance
 * @access Private
 */
router.get('/balance', auth_1.authMiddleware, paymentController_1.PaymentController.getUSDTBalance);
/**
 * @route GET /api/payments/history
 * @desc Get conversion history for the user
 * @query page - Page number (optional, defaults to 1)
 * @query limit - Items per page (optional, defaults to 20)
 * @access Private
 */
router.get('/history', auth_1.authMiddleware, paymentController_1.PaymentController.getConversionHistory);
/**
 * @route DELETE /api/payments/conversion/:id
 * @desc Cancel a pending conversion
 * @param id - Conversion ID
 * @access Private
 */
router.delete('/conversion/:id', auth_1.authMiddleware, paymentController_1.PaymentController.cancelConversion);
/**
 * Nellobytes third-party integrations
 * These endpoints call external Nellobytes API for airtime, databundle and cable
 */
router.post('/airtime', auth_1.authMiddleware, paymentController_1.PaymentController.buyAirtime);
router.post('/databundle', auth_1.authMiddleware, paymentController_1.PaymentController.buyDatabundle);
router.post('/cable', auth_1.authMiddleware, paymentController_1.PaymentController.buyCable);
// Crypto-payable airtime order (create order)
router.post('/airtime/crypto', auth_1.authMiddleware, paymentController_1.PaymentController.createCryptoAirtimeOrder);
// Attach a tx to an order (manual flow)
router.post('/orders/:orderId/attach-tx', auth_1.authMiddleware, paymentController_1.PaymentController.attachTxToOrder);
// Get order details
router.get('/orders/:orderId', auth_1.authMiddleware, paymentController_1.PaymentController.getOrder);
// Query or cancel by provider RequestID
router.get('/nellobytes/query/:requestId', auth_1.authMiddleware, paymentController_1.PaymentController.queryNellobytes);
router.post('/nellobytes/cancel/:requestId', auth_1.authMiddleware, paymentController_1.PaymentController.cancelNellobytes);
/**
 * @route POST /api/payments/webhook/detect
 * @desc Webhook endpoint for automatic payment detection
 * @body userId - User ID (required)
 * @body currency - Currency received (required)
 * @body amount - Amount received (required)
 * @body fromAddress - Source address (required)
 * @body txHash - Transaction hash (required)
 * @access Public (in production, should be secured with API keys)
 */
router.post('/webhook/detect', paymentController_1.PaymentController.simulatePaymentDetection);
exports.default = router;
//# sourceMappingURL=payment.js.map