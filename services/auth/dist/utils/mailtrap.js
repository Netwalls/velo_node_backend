"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMailtrapMail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const host = process.env.MAIL_HOST || 'smtp.mailtrap.io';
const port = Number(process.env.MAIL_PORT || 587);
const user = process.env.MAIL_USER;
const pass = process.env.MAIL_PASS;
const transporter = nodemailer_1.default.createTransport({
    host,
    port,
    auth: user && pass ? { user, pass } : undefined,
});
const sendMailtrapMail = async ({ to, subject, text, html }) => {
    if (!user || !pass) {
        console.warn('Mailtrap credentials not set; printing mail to console.');
        console.log('To:', to, 'Subject:', subject, 'Text:', text);
        return;
    }
    await transporter.sendMail({ from: process.env.MAIL_FROM || 'noreply@velo.local', to, subject, text, html });
};
exports.sendMailtrapMail = sendMailtrapMail;
