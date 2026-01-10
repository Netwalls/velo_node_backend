import { Router } from 'express';
import AdminControllerV2 from '../controllers/AdminControllerV2';

const router = Router();

// ==================== USER MANAGEMENT ====================

/**
 * @swagger
 * /admin/v2/users:
 *   get:
 *     tags: [User Management]
 *     summary: List all users with filters
 *     description: Retrieve paginated list of users with search and filter capabilities
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by email, phone, first name, or last name
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, suspended, banned]
 *         description: Filter by user status
 *       - in: query
 *         name: kycStatus
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
 *         description: Filter by KYC status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Successfully retrieved users
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/PaginatedResponse'
 *                 - type: object
 *                   properties:
 *                     users:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/User'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/users', AdminControllerV2.listUsers);

/**
 * @swagger
 * /admin/v2/users/{userId}:
 *   get:
 *     tags: [User Management]
 *     summary: Get detailed user information
 *     description: Retrieve comprehensive user details including KYC, transactions, fraud alerts, and audit logs
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *     responses:
 *       200:
 *         description: User details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 kycDocs:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/KYCDocument'
 *                 transactionStats:
 *                   type: object
 *                   properties:
 *                     count:
 *                       type: integer
 *                     totalVolume:
 *                       type: number
 *                 recentTransactions:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Transaction'
 *                 fraudAlerts:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/FraudAlert'
 *                 auditLogs:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AdminAuditLog'
 *       500:
 *         description: Server error
 */
router.get('/users/:userId', AdminControllerV2.getUserDetails);

/**
 * @swagger
 * /admin/v2/users/{userId}/suspend:
 *   post:
 *     tags: [User Management]
 *     summary: Suspend a user account
 *     description: Suspend user account and create audit log entry
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for suspension
 *     responses:
 *       200:
 *         description: User suspended successfully
 *       500:
 *         description: Server error
 */
router.post('/users/:userId/suspend', AdminControllerV2.suspendUser);

/**
 * @swagger
 * /admin/v2/users/{userId}/ban:
 *   post:
 *     tags: [User Management]
 *     summary: Ban a user account
 *     description: Permanently ban user account and create audit log entry
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: User banned successfully
 */
router.post('/users/:userId/ban', AdminControllerV2.banUser);

/**
 * @swagger
 * /admin/v2/users/{userId}/unlock:
 *   post:
 *     tags: [User Management]
 *     summary: Unlock/reactivate a user account
 *     description: Reactivate suspended or banned user account
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: User unlocked successfully
 */
router.post('/users/:userId/unlock', AdminControllerV2.unlockUser);

/**
 * @swagger
 * /admin/v2/users-segmentation:
 *   get:
 *     tags: [User Management]
 *     summary: Get user segmentation statistics
 *     description: Retrieve user counts grouped by status and KYC status
 *     responses:
 *       200:
 *         description: Segmentation stats retrieved successfully
 */
router.get('/users-segmentation', AdminControllerV2.getUserSegmentation);

// ==================== TRANSACTION MONITORING ====================

/**
 * @swagger
 * /admin/v2/transactions:
 *   get:
 *     tags: [Transaction Monitoring]
 *     summary: List transactions with advanced filters
 *     description: Search and filter transactions by multiple criteria
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, failed]
 *       - in: query
 *         name: chain
 *         schema:
 *           type: string
 *       - in: query
 *         name: minAmount
 *         schema:
 *           type: number
 *       - in: query
 *         name: maxAmount
 *         schema:
 *           type: number
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by transaction ID or hash
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Transactions retrieved successfully
 */
router.get('/transactions', AdminControllerV2.listTransactions);

/**
 * @swagger
 * /admin/v2/transactions/{transactionId}:
 *   get:
 *     tags: [Transaction Monitoring]
 *     summary: Get transaction details
 *     parameters:
 *       - in: path
 *         name: transactionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Transaction details retrieved
 */
router.get('/transactions/:transactionId', AdminControllerV2.getTransactionDetails);

/**
 * @swagger
 * /admin/v2/transactions/{transactionId}/flag:
 *   post:
 *     tags: [Transaction Monitoring]
 *     summary: Flag a transaction for review
 *     parameters:
 *       - in: path
 *         name: transactionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Transaction flagged successfully
 */
router.post('/transactions/:transactionId/flag', AdminControllerV2.flagTransaction);

/**
 * @swagger
 * /admin/v2/transactions-stats:
 *   get:
 *     tags: [Transaction Monitoring]
 *     summary: Get transaction statistics
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Stats retrieved successfully
 */
router.get('/transactions-stats', AdminControllerV2.getTransactionStats);

/**
 * @swagger
 * /admin/v2/transactions-export:
 *   get:
 *     tags: [Transaction Monitoring]
 *     summary: Export transactions to CSV format
 *     responses:
 *       200:
 *         description: Transactions exported successfully
 */
router.get('/transactions-export', AdminControllerV2.exportTransactions);

// ==================== KYC/AML COMPLIANCE ====================

/**
 * @swagger
 * /admin/v2/kyc:
 *   get:
 *     tags: [KYC/AML Compliance]
 *     summary: List KYC documents for review
 *     description: Get pending KYC documents sorted by submission date (oldest first)
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
 *           default: pending
 *       - in: query
 *         name: verificationType
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: KYC documents retrieved successfully
 */
router.get('/kyc', AdminControllerV2.listPendingKYC);

/**
 * @swagger
 * /admin/v2/kyc/{kycId}:
 *   get:
 *     tags: [KYC/AML Compliance]
 *     summary: Get KYC document details with risk score
 *     parameters:
 *       - in: path
 *         name: kycId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: KYC details with automated risk scoring
 */
router.get('/kyc/:kycId', AdminControllerV2.getKYCDetails);

/**
 * @swagger
 * /admin/v2/kyc/{kycId}/approve:
 *   post:
 *     tags: [KYC/AML Compliance]
 *     summary: Approve KYC document
 *     description: Approve KYC and update user status
 *     parameters:
 *       - in: path
 *         name: kycId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: KYC approved successfully
 */
router.post('/kyc/:kycId/approve', AdminControllerV2.approveKYC);

/**
 * @swagger
 * /admin/v2/kyc/{kycId}/reject:
 *   post:
 *     tags: [KYC/AML Compliance]
 *     summary: Reject KYC document
 *     parameters:
 *       - in: path
 *         name: kycId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: KYC rejected successfully
 */
router.post('/kyc/:kycId/reject', AdminControllerV2.rejectKYC);

/**
 * @swagger
 * /admin/v2/kyc-stats:
 *   get:
 *     tags: [KYC/AML Compliance]
 *     summary: Get KYC statistics
 *     responses:
 *       200:
 *         description: KYC stats including avg review time
 */
router.get('/kyc-stats', AdminControllerV2.getKYCStats);

// ==================== FRAUD & RISK ====================

/**
 * @swagger
 * /admin/v2/fraud-alerts:
 *   get:
 *     tags: [Fraud & Risk]
 *     summary: List fraud alerts
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, reviewed, confirmed_fraud, false_positive]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Fraud alerts retrieved
 */
router.get('/fraud-alerts', AdminControllerV2.listFraudAlerts);

/**
 * @swagger
 * /admin/v2/fraud-alerts/{alertId}/review:
 *   post:
 *     tags: [Fraud & Risk]
 *     summary: Review fraud alert
 *     description: Review and take action on fraud alert. Confirming fraud auto-suspends user.
 *     parameters:
 *       - in: path
 *         name: alertId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [reviewed, confirmed_fraud, false_positive]
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Fraud alert reviewed
 */
router.post('/fraud-alerts/:alertId/review', AdminControllerV2.reviewFraudAlert);

/**
 * @swagger
 * /admin/v2/fraud-stats:
 *   get:
 *     tags: [Fraud & Risk]
 *     summary: Get fraud statistics
 *     responses:
 *       200:
 *         description: Fraud stats by type and status
 */
router.get('/fraud-stats', AdminControllerV2.getFraudStats);

/**
 * @swagger
 * /admin/v2/blocklist:
 *   get:
 *     tags: [Fraud & Risk]
 *     summary: List blocklist entries
 *     responses:
 *       200:
 *         description: Active blocklist entries
 *   post:
 *     tags: [Fraud & Risk]
 *     summary: Add entry to blocklist
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - value
 *               - reason
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [email, phone, ip, card, country, wallet_address]
 *               value:
 *                 type: string
 *               reason:
 *                 type: string
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Added to blocklist
 */
router.get('/blocklist', AdminControllerV2.listBlocklist);
router.post('/blocklist', AdminControllerV2.addToBlocklist);

/**
 * @swagger
 * /admin/v2/blocklist/{blocklistId}:
 *   delete:
 *     tags: [Fraud & Risk]
 *     summary: Remove entry from blocklist
 *     parameters:
 *       - in: path
 *         name: blocklistId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Removed from blocklist
 */
router.delete('/blocklist/:blocklistId', AdminControllerV2.removeFromBlocklist);

// ==================== SUPPORT ====================

/**
 * @swagger
 * /admin/v2/support/tickets:
 *   get:
 *     tags: [Customer Support]
 *     summary: List support tickets
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [open, in_progress, waiting_user, resolved, closed]
 *       - in: query
 *         name: assignedTo
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Support tickets retrieved
 */
router.get('/support/tickets', AdminControllerV2.listSupportTickets);

/**
 * @swagger
 * /admin/v2/support/tickets/{ticketId}:
 *   get:
 *     tags: [Customer Support]
 *     summary: Get ticket details
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Ticket details retrieved
 */
router.get('/support/tickets/:ticketId', AdminControllerV2.getSupportTicketDetails);

/**
 * @swagger
 * /admin/v2/support/tickets/{ticketId}/assign:
 *   post:
 *     tags: [Customer Support]
 *     summary: Assign ticket to current admin
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Ticket assigned
 */
router.post('/support/tickets/:ticketId/assign', AdminControllerV2.assignSupportTicket);

/**
 * @swagger
 * /admin/v2/support/tickets/{ticketId}/status:
 *   patch:
 *     tags: [Customer Support]
 *     summary: Update ticket status
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [open, in_progress, waiting_user, resolved, closed]
 *     responses:
 *       200:
 *         description: Status updated
 */
router.patch('/support/tickets/:ticketId/status', AdminControllerV2.updateSupportTicketStatus);

/**
 * @swagger
 * /admin/v2/support/tickets/{ticketId}/notes:
 *   post:
 *     tags: [Customer Support]
 *     summary: Add internal note to ticket
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - note
 *             properties:
 *               note:
 *                 type: string
 *     responses:
 *       200:
 *         description: Note added
 */
router.post('/support/tickets/:ticketId/notes', AdminControllerV2.addSupportNote);

/**
 * @swagger
 * /admin/v2/support-stats:
 *   get:
 *     tags: [Customer Support]
 *     summary: Get support statistics
 *     responses:
 *       200:
 *         description: Support stats including avg resolution time
 */
router.get('/support-stats', AdminControllerV2.getSupportStats);

// ==================== ANALYTICS ====================

/**
 * @swagger
 * /admin/v2/analytics/dau:
 *   get:
 *     tags: [Analytics]
 *     summary: Get Daily Active Users
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: DAU data retrieved
 */
router.get('/analytics/dau', AdminControllerV2.getDailyActiveUsers);

/**
 * @swagger
 * /admin/v2/analytics/transaction-volume:
 *   get:
 *     tags: [Analytics]
 *     summary: Get transaction volume chart
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: granularity
 *         schema:
 *           type: string
 *           enum: [day, week, month]
 *           default: day
 *     responses:
 *       200:
 *         description: Transaction volume data
 */
router.get('/analytics/transaction-volume', AdminControllerV2.getTransactionVolumeChart);

/**
 * @swagger
 * /admin/v2/analytics/provider-performance:
 *   get:
 *     tags: [Analytics]
 *     summary: Get provider performance metrics
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Provider performance data
 */
router.get('/analytics/provider-performance', AdminControllerV2.getProviderPerformance);

/**
 * @swagger
 * /admin/v2/analytics/revenue:
 *   get:
 *     tags: [Analytics]
 *     summary: Get revenue metrics
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Revenue data
 */
router.get('/analytics/revenue', AdminControllerV2.getRevenueMetrics);

// ==================== SYSTEM CONFIGURATION ====================

/**
 * @swagger
 * /admin/v2/config:
 *   get:
 *     tags: [System Configuration]
 *     summary: List all system configurations
 *     responses:
 *       200:
 *         description: All configs retrieved
 *   post:
 *     tags: [System Configuration]
 *     summary: Update system configuration
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - key
 *               - value
 *             properties:
 *               key:
 *                 type: string
 *               value:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Config updated
 */
router.get('/config', AdminControllerV2.listSystemConfigs);
router.post('/config', AdminControllerV2.updateSystemConfig);

/**
 * @swagger
 * /admin/v2/config/maintenance-mode:
 *   post:
 *     tags: [System Configuration]
 *     summary: Toggle maintenance mode
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - enabled
 *             properties:
 *               enabled:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Maintenance mode toggled
 */
router.post('/config/maintenance-mode', AdminControllerV2.toggleMaintenanceMode);

/**
 * @swagger
 * /admin/v2/config/provider-toggle:
 *   post:
 *     tags: [System Configuration]
 *     summary: Enable/disable a payment provider
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - provider
 *               - enabled
 *             properties:
 *               provider:
 *                 type: string
 *                 example: paystack
 *               enabled:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Provider toggled
 */
router.post('/config/provider-toggle', AdminControllerV2.toggleProvider);

/**
 * @swagger
 * /admin/v2/config/platform-fee:
 *   post:
 *     tags: [System Configuration]
 *     summary: Update platform fee percentage
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - feeType
 *               - percentage
 *             properties:
 *               feeType:
 *                 type: string
 *               percentage:
 *                 type: number
 *     responses:
 *       200:
 *         description: Fee updated
 */
router.post('/config/platform-fee', AdminControllerV2.updatePlatformFee);

export default router;
