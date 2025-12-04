"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const paystackFiatController_1 = require("../controllers/paystackFiatController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const paystackController = new paystackFiatController_1.PaystackController();
router.post("/fund-wallet", auth_1.authMiddleware, paystackController.fundWallet);
router.post("/verify-payment", paystackController.verifyTransactionWithWebhook);
exports.default = router;
//# sourceMappingURL=paymentRoute.js.map