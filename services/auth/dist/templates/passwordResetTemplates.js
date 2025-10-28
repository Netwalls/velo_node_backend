"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.passwordChangedText = exports.passwordChangedTemplate = exports.passwordResetRequestText = exports.passwordResetRequestTemplate = void 0;
const passwordResetRequestTemplate = (email, token) => `
  <p>Hello ${email},</p>
  <p>Use the following token to reset your password: <strong>${token}</strong></p>
  <p>This token expires in 15 minutes.</p>
`;
exports.passwordResetRequestTemplate = passwordResetRequestTemplate;
const passwordResetRequestText = (email, token) => `Password reset token for ${email}: ${token}`;
exports.passwordResetRequestText = passwordResetRequestText;
const passwordChangedTemplate = (email) => `
  <p>Hello ${email},</p>
  <p>Your password has been changed successfully.</p>
`;
exports.passwordChangedTemplate = passwordChangedTemplate;
const passwordChangedText = (email) => `Your password has been changed successfully.`;
exports.passwordChangedText = passwordChangedText;
