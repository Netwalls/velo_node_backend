"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findInHistory = exports.validateEnum = exports.validateRequiredFields = exports.sendSuccess = exports.handleError = exports.requireAuth = exports.getUserId = exports.createPurchaseRateLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
/**
 * Reusable rate limiter configuration for purchase endpoints
 */
const createPurchaseRateLimiter = () => (0, express_rate_limit_1.default)({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 3, // Maximum 3 purchases per minute per IP
    message: {
        success: false,
        message: 'Too many purchase attempts. Please try again in a minute.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
exports.createPurchaseRateLimiter = createPurchaseRateLimiter;
/**
 * Extract and validate user ID from request
 */
const getUserId = (req) => {
    return req.user?.id || null;
};
exports.getUserId = getUserId;
/**
 * Reusable authentication check
 */
const requireAuth = (req, res) => {
    const userId = (0, exports.getUserId)(req);
    if (!userId) {
        res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
        return false;
    }
    return true;
};
exports.requireAuth = requireAuth;
/**
 * Reusable error handler
 */
const handleError = (res, error, defaultMessage, statusCode = 400) => {
    console.error(`Error: ${defaultMessage}`, error);
    res.status(statusCode).json({
        success: false,
        message: error.message || defaultMessage
    });
};
exports.handleError = handleError;
/**
 * Reusable success response
 */
const sendSuccess = (res, message, data) => {
    res.json({
        success: true,
        message,
        ...(data && { data })
    });
};
exports.sendSuccess = sendSuccess;
/**
 * Validate required fields
 */
const validateRequiredFields = (req, res, fields) => {
    const missing = fields.filter(field => !req.body[field] && !req.query[field]);
    if (missing.length > 0) {
        res.status(400).json({
            success: false,
            message: `Missing required fields: ${missing.join(', ')}`
        });
        return false;
    }
    return true;
};
exports.validateRequiredFields = validateRequiredFields;
/**
 * Validate enum value
 */
const validateEnum = (res, value, enumObject, fieldName) => {
    if (!Object.values(enumObject).includes(value)) {
        res.status(400).json({
            success: false,
            message: `Invalid ${fieldName}. Supported: ${Object.values(enumObject).join(', ')}`
        });
        return false;
    }
    return true;
};
exports.validateEnum = validateEnum;
/**
 * Find item in history by ID
 */
const findInHistory = async (res, getHistoryFn, itemId, itemName) => {
    const history = await getHistoryFn();
    const item = history.find(p => p.id === itemId);
    if (!item) {
        res.status(404).json({
            success: false,
            message: `${itemName} not found`
        });
        return null;
    }
    return item;
};
exports.findInHistory = findInHistory;
//# sourceMappingURL=controlllerHelper.js.map