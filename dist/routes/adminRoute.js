"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const adminController_1 = __importDefault(require("../controllers/adminController"));
const auth_1 = require("../middleware/auth");
const admin_1 = __importDefault(require("../middleware/admin"));
const router = (0, express_1.Router)();
// Protect the admin stats route
router.get('/stats', auth_1.authMiddleware, admin_1.default, adminController_1.default.getStats);
// Delete user by id (admin only)
router.delete('/users/:id', auth_1.authMiddleware, admin_1.default, adminController_1.default.deleteUser);
exports.default = router;
//# sourceMappingURL=adminRoute.js.map