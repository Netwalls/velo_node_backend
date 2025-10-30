"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRateLimiter = createRateLimiter;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
// Basic in-memory rate limiter for development. For production use a
// Redis-backed store (e.g. rate-limit-redis) so limits are shared across
// multiple instances.
function createRateLimiter(options) {
    const limiter = (0, express_rate_limit_1.default)({
        windowMs: options?.windowMs ?? 15 * 60 * 1000, // 15 minutes
        max: options?.max ?? 100, // limit each IP to 100 requests per windowMs
        standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
        legacyHeaders: false, // Disable the `X-RateLimit-*` headers
        message: options?.message ?? 'Too many requests from this IP, please try again later.',
    });
    return limiter;
}
exports.default = createRateLimiter;
//# sourceMappingURL=rateLimiter.js.map