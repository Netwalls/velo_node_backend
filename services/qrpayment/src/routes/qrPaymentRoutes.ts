import { Router } from 'express';
import { QRPaymentController } from '../controllers/QRPaymentController';
import { validate } from '../middleware/validation';
import {
  createPaymentSchema,
  getPaymentsSchema,
  paymentIdSchema,
  cancelPaymentSchema,
  monitorPaymentSchema,
  getStatsSchema,
} from '../schemas/paymentSchemas';

const router = Router();

/**
 * @swagger
 * /api/qrpayment/create:
 *   post:
 *     tags:
 *       - Payments
 *     summary: Create a new QR payment request
 *     description: Creates a new cryptocurrency payment request and generates QR code data
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePaymentRequest'
 *           examples:
 *             ethereum:
 *               summary: Ethereum payment request
 *               value:
 *                 userId: "user-123-uuid"
 *                 amount: 0.01
 *                 chain: "ethereum"
 *                 network: "testnet"
 *                 address: "0x742d35Cc6634C0532925a3b8D1e8b7ae8e6b3e47"
 *                 description: "Coffee payment - Order #12345"
 *             bitcoin:
 *               summary: Bitcoin payment request
 *               value:
 *                 userId: "user-456-uuid"
 *                 amount: 0.0005
 *                 chain: "bitcoin"
 *                 network: "testnet"
 *                 address: "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx"
 *                 description: "Product purchase"
 *             solana:
 *               summary: Solana payment request
 *               value:
 *                 userId: "user-789-uuid"
 *                 amount: 0.1
 *                 chain: "solana"
 *                 network: "devnet"
 *                 address: "DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK"
 *                 description: "Service payment"
 *     responses:
 *       201:
 *         description: Payment request created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "QR payment request created successfully"
 *                 payment:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     amount:
 *                       type: number
 *                     chain:
 *                       type: string
 *                     network:
 *                       type: string
 *                     address:
 *                       type: string
 *                     status:
 *                       type: string
 *                     qrData:
 *                       type: string
 *                       example: "ethereum:0x742d35Cc6634C0532925a3b8D1e8b7ae8e6b3e47?amount=0.01"
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Invalid request parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/create', validate(createPaymentSchema), QRPaymentController.createPayment);

/**
 * @swagger
 * /api/qrpayment/payments:
 *   get:
 *     tags:
 *       - Payments
 *     summary: Get all payment requests for a user
 *     description: Retrieves a paginated list of payment requests with optional filters
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to fetch payments for
 *         example: "user-123-uuid"
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, completed, failed, cancelled]
 *         description: Filter by payment status
 *       - in: query
 *         name: chain
 *         schema:
 *           type: string
 *           enum: [ethereum, bitcoin, solana, starknet, stellar, polkadot]
 *         description: Filter by blockchain
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *           minimum: 1
 *           maximum: 100
 *         description: Number of results per page
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *           minimum: 0
 *         description: Number of results to skip
 *     responses:
 *       200:
 *         description: List of payments retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 payments:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/MerchantPayment'
 *                 total:
 *                   type: number
 *                   description: Total number of payments
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: number
 *                     limit:
 *                       type: number
 *                     offset:
 *                       type: number
 *                     hasMore:
 *                       type: boolean
 *       400:
 *         description: Missing or invalid parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/payments', validate(getPaymentsSchema), QRPaymentController.getPayments);

/**
 * @swagger
 * /api/qrpayment/payments/{id}:
 *   get:
 *     tags:
 *       - Payments
 *     summary: Get a specific payment by ID
 *     description: Retrieves detailed information about a single payment request
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Payment ID
 *         example: "550e8400-e29b-41d4-a716-446655440000"
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Optional user ID for ownership verification
 *     responses:
 *       200:
 *         description: Payment details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 payment:
 *                   $ref: '#/components/schemas/MerchantPayment'
 *       404:
 *         description: Payment not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/payments/:id', validate(paymentIdSchema), QRPaymentController.getPaymentById);

/**
 * @swagger
 * /api/qrpayment/payments/{id}/cancel:
 *   post:
 *     tags:
 *       - Payments
 *     summary: Cancel a pending payment
 *     description: Cancels a payment request that is in pending status
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Payment ID to cancel
 *         example: "550e8400-e29b-41d4-a716-446655440000"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *                 description: User ID for ownership verification
 *                 example: "user-123-uuid"
 *     responses:
 *       200:
 *         description: Payment cancelled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Payment cancelled successfully"
 *                 payment:
 *                   $ref: '#/components/schemas/MerchantPayment'
 *       400:
 *         description: Cannot cancel payment (not pending or invalid user)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Payment not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/payments/:id/cancel', validate(cancelPaymentSchema), QRPaymentController.cancelPayment);

/**
 * @swagger
 * /api/qrpayment/payments/{id}/status:
 *   get:
 *     tags:
 *       - Monitoring
 *     summary: Check payment status on blockchain
 *     description: Queries the blockchain to check if payment has been received
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Payment ID
 *         example: "550e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: Blockchain status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 payment:
 *                   $ref: '#/components/schemas/MerchantPayment'
 *                 blockchainStatus:
 *                   $ref: '#/components/schemas/BlockchainStatus'
 *       404:
 *         description: Payment not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/payments/:id/status', validate(paymentIdSchema), QRPaymentController.checkPaymentStatus);

/**
 * @swagger
 * /api/qrpayment/monitor/{id}:
 *   post:
 *     tags:
 *       - Monitoring
 *     summary: Manually monitor a specific payment
 *     description: Checks blockchain for payment confirmation and updates status if confirmed
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Payment ID to monitor
 *         example: "550e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: Payment monitored successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 payment:
 *                   $ref: '#/components/schemas/MerchantPayment'
 *                 blockchainStatus:
 *                   $ref: '#/components/schemas/BlockchainStatus'
 *                 updated:
 *                   type: boolean
 *                   description: Whether payment status was updated
 *       404:
 *         description: Payment not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/monitor/:id', validate(monitorPaymentSchema), QRPaymentController.monitorPayment);

/**
 * @swagger
 * /api/qrpayment/monitor-all:
 *   post:
 *     tags:
 *       - Monitoring
 *     summary: Monitor all pending payments (for cron jobs)
 *     description: Checks all pending payments for blockchain confirmations. Intended for automated cron jobs.
 *     responses:
 *       200:
 *         description: All pending payments monitored
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Monitored 15 pending payments"
 *                 checked:
 *                   type: number
 *                   description: Number of payments checked
 *                 completed:
 *                   type: number
 *                   description: Number of payments that were completed
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       paymentId:
 *                         type: string
 *                         format: uuid
 *                       status:
 *                         type: string
 *                         enum: [completed, still_pending, error]
 *                       transactionHash:
 *                         type: string
 *                         nullable: true
 *                       error:
 *                         type: string
 *                         nullable: true
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/monitor-all', QRPaymentController.monitorAllPendingPayments);

/**
 * @swagger
 * /api/qrpayment/stats:
 *   get:
 *     tags:
 *       - Statistics
 *     summary: Get payment statistics for a user
 *     description: Retrieves comprehensive payment analytics and statistics
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to get statistics for
 *         example: "user-123-uuid"
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 stats:
 *                   $ref: '#/components/schemas/PaymentStats'
 *             example:
 *               stats:
 *                 total: 25
 *                 pending: 5
 *                 completed: 18
 *                 cancelled: 1
 *                 failed: 1
 *                 totalAmount: 1.25
 *       400:
 *         description: Missing userId parameter
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/stats', validate(getStatsSchema), QRPaymentController.getPaymentStats);

export default router;
