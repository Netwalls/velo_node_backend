"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/changellyRoute.ts
const express_1 = require("express");
const changellyController_1 = require("../controllers/changellyController");
const auth_1 = require("../middleware/auth"); // ← Your existing auth
const router = (0, express_1.Router)();
// Protected route — real user ID from JWT/session
router.post('/deposit', auth_1.authMiddleware, changellyController_1.ChangellyController.createDepositOrder);
// Webhook endpoint for Changelly to notify order status updates
// Note: this route is intentionally left unauthenticated because the provider will call it.
router.post('/webhook', changellyController_1.ChangellyController.changellyWebhook);
exports.default = router;
//# sourceMappingURL=changellyRoute.js.map