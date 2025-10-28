"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPasswordReset = exports.sendOtp = exports.sendRegistrationEmails = void 0;
const axios_1 = __importDefault(require("axios"));
const mailtrap_1 = require("../utils/mailtrap");
const resendOtpTemplate_1 = require("../templates/resendOtpTemplate");
const passwordResetTemplates_1 = require("../templates/passwordResetTemplates");
const MONOLITH_URL = process.env.MONOLITH_URL;
const sendRegistrationEmails = async (email, otp) => {
    if (MONOLITH_URL) {
        try {
            await axios_1.default.post(`${MONOLITH_URL}/internal/email/register`, { email, otp });
            return;
        }
        catch (err) {
            console.warn('Forward to monolith email failed, falling back to local send', err);
        }
    }
    await (0, mailtrap_1.sendMailtrapMail)({ to: email, subject: 'Verify your email', html: (0, resendOtpTemplate_1.resendOtpTemplate)(email, otp) });
};
exports.sendRegistrationEmails = sendRegistrationEmails;
const sendOtp = async (email, otp) => {
    if (MONOLITH_URL) {
        try {
            await axios_1.default.post(`${MONOLITH_URL}/internal/email/otp`, { email, otp });
            return;
        }
        catch (err) {
            console.warn('Forward to monolith otp failed, falling back to local send', err);
        }
    }
    await (0, mailtrap_1.sendMailtrapMail)({ to: email, subject: 'Your OTP Code', html: (0, resendOtpTemplate_1.resendOtpTemplate)(email, otp) });
};
exports.sendOtp = sendOtp;
const sendPasswordReset = async (email, token) => {
    if (MONOLITH_URL) {
        try {
            await axios_1.default.post(`${MONOLITH_URL}/internal/email/password-reset`, { email, token });
            return;
        }
        catch (err) {
            console.warn('Forward to monolith password-reset email failed, falling back to local send', err);
        }
    }
    await (0, mailtrap_1.sendMailtrapMail)({ to: email, subject: 'Password Reset', html: (0, passwordResetTemplates_1.passwordResetRequestTemplate)(email, token) });
};
exports.sendPasswordReset = sendPasswordReset;
