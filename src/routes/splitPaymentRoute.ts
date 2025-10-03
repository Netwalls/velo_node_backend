import { Router } from 'express';
import { SplitPaymentController } from '../controllers/SplitPaymentController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Create split payment template (reusable)
router.post(
    '/create',
    authMiddleware,
    SplitPaymentController.createSplitPayment
);

// Execute split payment (can be done multiple times)
router.post(
    '/:id/execute',
    authMiddleware,
    SplitPaymentController.executeSplitPayment
);

// Get all split payment templates
router.get(
    '/templates',
    authMiddleware,
    SplitPaymentController.getSplitPaymentTemplates
);

// Get execution history for a specific split
router.get(
    '/:id/executions',
    authMiddleware,
    SplitPaymentController.getExecutionHistory
);

// Toggle split payment status (activate/deactivate)
router.patch(
    '/:id/toggle',
    authMiddleware,
    SplitPaymentController.toggleSplitPayment
);

// // Get split payment details (existing endpoint)
// router.get(
//     '/:id',
//     authMiddleware,
//     SplitPaymentController.getSplitPaymentDetails
// );

export default router;
