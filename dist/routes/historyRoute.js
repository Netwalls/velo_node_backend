"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const historyController_1 = require("../controllers/historyController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Get all transactions for the user
router.get('/', auth_1.authMiddleware, historyController_1.HistoryController.getHistory);
exports.default = router;
//# sourceMappingURL=historyRoute.js.map