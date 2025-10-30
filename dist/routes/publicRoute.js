"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const adminController_1 = __importDefault(require("../controllers/adminController"));
const rateLimiter_1 = __importDefault(require("../middleware/rateLimiter"));
const router = (0, express_1.Router)();
// Conservative rate limit for public stats to prevent abuse
const publicStatsLimiter = (0, rateLimiter_1.default)({ windowMs: 60 * 1000, max: 30 });
// Sanitize query to avoid triggering heavy background refreshes via public endpoint
const sanitizePublicStats = (req, _res, next) => {
    try {
        if (req.query && req.query.refresh) {
            delete req.query.refresh;
        }
        if (req.query && req.query.wait) {
            delete req.query.wait;
        }
    }
    catch { }
    next();
};
// Public stats endpoint (no auth required)
// GET /stats
router.get('/stats', publicStatsLimiter, sanitizePublicStats, adminController_1.default.getStats);
exports.default = router;
//# sourceMappingURL=publicRoute.js.map