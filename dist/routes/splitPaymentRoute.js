"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const SplitPaymentController_1 = require("../controllers/SplitPaymentController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Create split payment template (reusable)
router.post('/create', auth_1.authMiddleware, SplitPaymentController_1.SplitPaymentController.createSplitPayment);
// Execute split payment (can be done multiple times)
router.post('/:id/execute', auth_1.authMiddleware, SplitPaymentController_1.SplitPaymentController.executeSplitPayment);
// Get all split payment templates
router.get('/templates', auth_1.authMiddleware, SplitPaymentController_1.SplitPaymentController.getSplitPaymentTemplates);
// Get execution history for a specific split
router.get('/:id/executions', auth_1.authMiddleware, SplitPaymentController_1.SplitPaymentController.getExecutionHistory);
// Toggle split payment status (activate/deactivate)
router.patch('/:id/toggle', auth_1.authMiddleware, SplitPaymentController_1.SplitPaymentController.toggleSplitPayment);
// // Get split payment details (existing endpoint)
// router.get(
//     '/:id',
//     authMiddleware,
//     SplitPaymentController.getSplitPaymentDetails
// );
exports.default = router;
//# sourceMappingURL=splitPaymentRoute.js.map