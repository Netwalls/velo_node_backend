"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const moonpayController_1 = __importDefault(require("../controllers/moonpayController"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Create a purchase (backend initiates MoonPay hosted checkout)
router.post('/create', auth_1.authMiddleware, moonpayController_1.default.createPurchase);
// Webhook endpoint for MoonPay
router.post('/webhook', moonpayController_1.default.moonpayWebhook);
exports.default = router;
//# sourceMappingURL=moonpayRoute.js.map