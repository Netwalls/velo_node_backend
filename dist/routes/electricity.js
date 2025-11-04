"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/electricity.ts
const express_1 = require("express");
const electricityController_1 = require("../controllers/electricityController");
const electricityController_2 = require("../controllers/electricityController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Apply authentication to all routes
router.use(auth_1.authMiddleware);
// Electricity payment routes
router.post('/purchase', electricityController_2.electricityPurchaseRateLimiter, electricityController_1.electricityController.processElectricityPayment.bind(electricityController_1.electricityController));
router.get('/verify-meter', electricityController_1.electricityController.verifyMeterNumber.bind(electricityController_1.electricityController));
router.get('/history', electricityController_1.electricityController.getUserElectricityHistory.bind(electricityController_1.electricityController));
router.get('/supported-options', electricityController_1.electricityController.getSupportedOptions.bind(electricityController_1.electricityController));
router.get('/purchase/:purchaseId', electricityController_1.electricityController.getElectricityPayment.bind(electricityController_1.electricityController));
router.get('/expected-amount', electricityController_1.electricityController.getExpectedAmount.bind(electricityController_1.electricityController));
router.get('/stats', electricityController_1.electricityController.getUserPurchaseStats.bind(electricityController_1.electricityController));
router.get('/security-limits', electricityController_1.electricityController.getSecurityLimits.bind(electricityController_1.electricityController));
exports.default = router;
//# sourceMappingURL=electricity.js.map