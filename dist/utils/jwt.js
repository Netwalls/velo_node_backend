"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyRefreshToken = exports.verifyAccessToken = exports.generateRefreshToken = exports.generateAccessToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// Validate JWT secrets early and provide safe defaults in development.
let JWT_SECRET = process.env.JWT_SECRET;
let JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
if (!JWT_SECRET) {
    if (process.env.NODE_ENV === 'production') {
        console.error('FATAL: JWT_SECRET environment variable is required in production');
        process.exit(1);
    }
    JWT_SECRET = 'dev_jwt_secret_change_me';
    console.warn('Warning: JWT_SECRET not set, using development fallback. Set JWT_SECRET in .env for production');
}
if (!JWT_REFRESH_SECRET) {
    if (process.env.NODE_ENV === 'production') {
        console.error('FATAL: JWT_REFRESH_SECRET environment variable is required in production');
        process.exit(1);
    }
    JWT_REFRESH_SECRET = 'dev_jwt_refresh_secret_change_me';
    console.warn('Warning: JWT_REFRESH_SECRET not set, using development fallback. Set JWT_REFRESH_SECRET in .env for production');
}
const generateAccessToken = (payload) => {
    return jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: '30m' });
};
exports.generateAccessToken = generateAccessToken;
const generateRefreshToken = (payload) => {
    return jsonwebtoken_1.default.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' });
};
exports.generateRefreshToken = generateRefreshToken;
const verifyAccessToken = (token) => {
    return jsonwebtoken_1.default.verify(token, JWT_SECRET);
};
exports.verifyAccessToken = verifyAccessToken;
const verifyRefreshToken = (token) => {
    return jsonwebtoken_1.default.verify(token, JWT_REFRESH_SECRET);
};
exports.verifyRefreshToken = verifyRefreshToken;
//# sourceMappingURL=jwt.js.map