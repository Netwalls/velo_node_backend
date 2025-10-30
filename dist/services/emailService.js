"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendRegistrationEmails = sendRegistrationEmails;
const mailtrap_1 = require("../utils/mailtrap");
const registerTemplate_1 = require("../utils/registerTemplate");
const otpTemplate_1 = require("../utils/otpTemplate");
async function sendRegistrationEmails(email, otp) {
    try {
        await (0, mailtrap_1.sendMailtrapMail)({
            to: email,
            subject: 'Verify your email',
            text: 'Welcome to Velo! Please verify your email address.',
            html: (0, registerTemplate_1.registerTemplate)(email),
        });
        await (0, mailtrap_1.sendMailtrapMail)({
            to: email,
            subject: 'Your OTP Code',
            text: `Your OTP code is: ${otp}`,
            html: (0, otpTemplate_1.otpTemplate)(email, otp),
        });
    }
    catch (mailErr) {
        console.error('Mailtrap send error:', mailErr);
    }
}
//# sourceMappingURL=emailService.js.map