"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resendOtpTemplate = void 0;
const resendOtpTemplate = (email, otp) => `
  <p>Hello ${email},</p>
  <p>Your one time verification code is: <strong>${otp}</strong></p>
  <p>This code will expire in 15 minutes.</p>
`;
exports.resendOtpTemplate = resendOtpTemplate;
