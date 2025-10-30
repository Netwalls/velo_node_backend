"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOTPExpiry = exports.isOTPExpired = exports.generateOTP = void 0;
const crypto_1 = __importDefault(require("crypto"));
const generateOTP = () => {
    return crypto_1.default.randomInt(100000, 999999).toString();
};
exports.generateOTP = generateOTP;
const isOTPExpired = (expiry) => {
    return new Date() > expiry;
};
exports.isOTPExpired = isOTPExpired;
const getOTPExpiry = () => {
    return new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
};
exports.getOTPExpiry = getOTPExpiry;
//# sourceMappingURL=otp.js.map