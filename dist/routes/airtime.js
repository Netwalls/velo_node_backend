"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/airtime.ts
const express_1 = require("express");
const airtimeController_1 = require("../controllers/airtimeController");
const airtimeController_2 = require("../controllers/airtimeController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Apply authentication to all routes
router.use(auth_1.authMiddleware);
// Airtime purchase routes
router.post('/purchase', airtimeController_2.purchaseRateLimiter, airtimeController_1.airtimeController.processAirtimePurchase);
router.get('/history', airtimeController_1.airtimeController.getUserAirtimeHistory);
router.get('/supported-options', airtimeController_1.airtimeController.getSupportedOptions);
router.get('/purchase/:purchaseId', airtimeController_1.airtimeController.getAirtimePurchase);
router.get('/expected-amount', airtimeController_1.airtimeController.getExpectedAmount);
exports.default = router;
//# sourceMappingURL=airtime.js.map