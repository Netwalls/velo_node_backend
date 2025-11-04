"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/data.ts
const express_1 = require("express");
const dataController_1 = require("../controllers/dataController");
const dataController_2 = require("../controllers/dataController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Apply authentication to all routes
router.use(auth_1.authMiddleware);
// Data purchase routes
router.post('/purchase', dataController_2.dataPurchaseRateLimiter, dataController_1.dataController.processDataPurchase.bind(dataController_1.dataController));
router.get('/plans', dataController_1.dataController.getDataPlans.bind(dataController_1.dataController));
router.get('/history', dataController_1.dataController.getUserDataHistory.bind(dataController_1.dataController));
router.get('/supported-options', dataController_1.dataController.getSupportedOptions.bind(dataController_1.dataController));
router.get('/purchase/:purchaseId', dataController_1.dataController.getDataPurchase.bind(dataController_1.dataController));
router.get('/expected-amount', dataController_1.dataController.getExpectedAmount.bind(dataController_1.dataController));
router.get('/stats', dataController_1.dataController.getUserPurchaseStats.bind(dataController_1.dataController));
router.get('/security-limits', dataController_1.dataController.getSecurityLimits.bind(dataController_1.dataController));
exports.default = router;
//# sourceMappingURL=data.js.map