"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPasswordSchema = exports.verifyResetTokenSchema = exports.forgotPasswordSchema = exports.addAddressSchema = exports.updateProfileSchema = exports.otpSchema = exports.loginSchema = exports.registerSchema = void 0;
const joi_1 = __importDefault(require("joi"));
const types_1 = require("../types");
exports.registerSchema = joi_1.default.object({
    email: joi_1.default.string().email().required(),
    password: joi_1.default.string().min(6).required(),
    firstName: joi_1.default.string().optional(),
    lastName: joi_1.default.string().optional(),
});
exports.loginSchema = joi_1.default.object({
    email: joi_1.default.string().email().required(),
    password: joi_1.default.string().required(),
});
exports.otpSchema = joi_1.default.object({
    email: joi_1.default.string().email().required(),
    otp: joi_1.default.string().length(6).required(),
});
exports.updateProfileSchema = joi_1.default.object({
    firstName: joi_1.default.string().optional(),
    lastName: joi_1.default.string().optional(),
    phoneNumber: joi_1.default.string().optional(),
    username: joi_1.default.string()
        .pattern(/^[a-zA-Z0-9_]{3,30}$/)
        .optional(),
    displayPicture: joi_1.default.string().uri().optional(),
    bankName: joi_1.default.string().optional(),
    accountNumber: joi_1.default.string().optional(),
    accountName: joi_1.default.string().optional(),
});
exports.addAddressSchema = joi_1.default.object({
    chain: joi_1.default.string()
        .valid(...Object.values(types_1.ChainType))
        .required(),
    address: joi_1.default.string().required(),
});
exports.forgotPasswordSchema = joi_1.default.object({
    email: joi_1.default.string().email().required(),
});
exports.verifyResetTokenSchema = joi_1.default.object({
    email: joi_1.default.string().email().required(),
    token: joi_1.default.string().length(6).required(),
});
exports.resetPasswordSchema = joi_1.default.object({
    email: joi_1.default.string().email().required(),
    token: joi_1.default.string().length(6).required(),
    newPassword: joi_1.default.string().min(6).required(),
});
//# sourceMappingURL=auth.js.map