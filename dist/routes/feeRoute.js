"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const feeController_1 = require("../controllers/feeController");
const auth_1 = require("../middleware/auth");
const admin_1 = require("../middleware/admin");
const router = (0, express_1.Router)();
// Public endpoints - anyone can check fee calculations
router.get('/calculate', feeController_1.FeeController.calculateFee);
router.post('/calculate/batch', feeController_1.FeeController.calculateBatchFees);
router.get('/config', feeController_1.FeeController.getFeeConfig);
// Protected endpoints - require authentication
router.get('/history', auth_1.authMiddleware, feeController_1.FeeController.getFeeHistory);
// Admin endpoints - require admin privileges
router.get('/stats', auth_1.authMiddleware, admin_1.adminMiddleware, feeController_1.FeeController.getFeeStats);
exports.default = router;
//# sourceMappingURL=feeRoute.js.map