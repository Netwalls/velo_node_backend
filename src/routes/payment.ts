import { Router } from 'express';
import { PaymentController } from '../controllers/paymentController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

/**
 * @route GET /api/payments/rates
 * @desc Get all current conversion rates
 * @access Public
 */
router.get('/rates', PaymentController.getConversionRates);

/**
 * @route GET /api/payments/rate
 * @desc Get specific conversion rate between two currencies
 * @query from - Source currency (required)
 * @query to - Target currency (optional, defaults to USDT)
 * @access Public
 */
router.get('/rate', PaymentController.getSpecificRate);

/**
 * @route POST /api/payments/calculate
 * @desc Calculate conversion without executing it
 * @body amount - Amount to convert (required)
 * @body fromCurrency - Source currency (required)
 * @body toCurrency - Target currency (optional, defaults to USDT)
 * @access Public
 */
router.post('/calculate', PaymentController.calculateConversion);

/**
 * @route POST /api/payments/convert
 * @desc Execute manual conversion to USDT
 * @body amount - Amount to convert (required)
 * @body fromCurrency - Source currency (required)
 * @body fromAddress - Source wallet address (optional)
 * @access Private
 */
router.post('/convert', authMiddleware, PaymentController.convertToUSDT);

/**
 * @route GET /api/payments/balance
 * @desc Get user's USDT balance
 * @access Private
 */
router.get('/balance', authMiddleware, PaymentController.getUSDTBalance);

/**
 * @route GET /api/payments/history
 * @desc Get conversion history for the user
 * @query page - Page number (optional, defaults to 1)
 * @query limit - Items per page (optional, defaults to 20)
 * @access Private
 */
router.get('/history', authMiddleware, PaymentController.getConversionHistory);

/**
 * @route DELETE /api/payments/conversion/:id
 * @desc Cancel a pending conversion
 * @param id - Conversion ID
 * @access Private
 */
router.delete(
    '/conversion/:id',
    authMiddleware,
    PaymentController.cancelConversion
);

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
router.post('/webhook/detect', PaymentController.simulatePaymentDetection);

export default router;
