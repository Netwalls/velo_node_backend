import { Router } from 'express';
import { SplitPaymentController } from '../controllers/SplitPaymentController';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

// Protect all routes with JWT authentication
router.use(authenticateJWT);

/**
 * @swagger
 * components:
 *   schemas:
 *     RecipientInput:
 *       type: object
 *       required:
 *         - address
 *         - amount
 *       properties:
 *         address:
 *           type: string
 *           description: Wallet address of the recipient
 *           example: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F"
 *         name:
 *           type: string
 *           description: Name of the recipient (optional)
 *           example: "John Doe"
 *         email:
 *           type: string
 *           description: Email of the recipient (optional)
 *           example: "john@example.com"
 *         amount:
 *           type: string
 *           description: Amount to send (in string format for precision)
 *           example: "10.50"
 *     
 *     CreateSplitPaymentRequest:
 *       type: object
 *       required:
 *         - title
 *         - chain
 *         - network
 *         - fromAddress
 *         - recipients
 *       properties:
 *         title:
 *           type: string
 *           description: Title of the split payment bundle
 *           example: "Marketing Team Payroll - Oct"
 *         description:
 *           type: string
 *           description: Optional description
 *           example: "Monthly payout for the marketing department"
 *         chain:
 *           type: string
 *           description: Blockchain identifier
 *           enum: [ethereum, usdt_erc20, bitcoin, solana, stellar, polkadot, starknet, strk]
 *           example: "ethereum"
 *         network:
 *           type: string
 *           description: Network identifier
 *           enum: [mainnet, testnet]
 *           example: "testnet"
 *         fromAddress:
 *           type: string
 *           description: Sender's wallet address (must be managed by the system)
 *           example: "0xSenderAddress..."
 *         recipients:
 *           type: array
 *           description: List of recipients
 *           items:
 *             $ref: '#/components/schemas/RecipientInput'
 *
 *     SplitPaymentResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: "Split payment template created successfully"
 *         splitPayment:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *             title:
 *               type: string
 *             totalAmount:
 *               type: string
 *             totalRecipients:
 *               type: integer
 *             status:
 *               type: string
 *         recipients:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/RecipientInput'
 *
 *     ExecuteSplitPaymentRequest:
 *       type: object
 *       properties:
 *         transactionPin:
 *           type: string
 *           description: User's transaction PIN for authorization
 *           example: "123456"
 */

/**
 * @swagger
 * /api/splitpayment/create:
 *   post:
 *     summary: Create a new split payment template
 *     description: Creates a reusable template for splitting payments to multiple recipients. Does not execute the payment immediately.
 *     tags: [Split Payment]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateSplitPaymentRequest'
 *     responses:
 *       201:
 *         description: Split payment template created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SplitPaymentResponse'
 *       400:
 *         description: Validation error (missing fields, invalid addresses, or negative amounts)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               ValidationError:
 *                 value:
 *                   error: "Missing required fields: title, chain, network, fromAddress, recipients"
 *       404:
 *         description: Sender address not found or not owned by user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/create', SplitPaymentController.createSplitPayment);

/**
 * @swagger
 * /api/splitpayment/execute/{id}:
 *   post:
 *     summary: Execute a split payment
 *     description: Executes an existing split payment template. Requires transaction PIN unless disabled by configuration. validates balances, calculates fees, and processes transfers.
 *     tags: [Split Payment]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The ID of the split payment template to execute
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ExecuteSplitPaymentRequest'
 *     responses:
 *       200:
 *         description: Split payment executed successfully (or partially)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 executionId:
 *                   type: string
 *                   format: uuid
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       recipient:
 *                         type: string
 *                       status:
 *                         type: string
 *                         enum: [SUCCESS, FAILED]
 *                       txHash:
 *                         type: string
 *                       error:
 *                         type: string
 *       400:
 *         description: Invalid request or missing PIN
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Invalid transaction PIN
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Split payment template not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Execution failed due to server or blockchain error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/execute/:id', SplitPaymentController.executeSplitPayment);

export default router;
