"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const transactionController_1 = require("../controllers/transactionController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/history', auth_1.authMiddleware, transactionController_1.TransactionController.getHistory);
exports.default = router;
//# sourceMappingURL=transactionRoute.js.map