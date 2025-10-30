"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMailtrapMail = sendMailtrapMail;
/**
 * Utility for sending emails using Mailtrap's official SDK.
 * Requires MAILTRAP_TOKEN and MAILTRAP_SENDER in your .env file.
 * Install dependencies:
 *   yarn add mailtrap
 *   # or
 *   npm install mailtrap
 */
const mailtrap_1 = require("mailtrap");
const TOKEN = process.env.MAILTRAP_TOKEN || '';
const SENDER_EMAIL = process.env.MAILTRAP_SENDER || '';
const client = new mailtrap_1.MailtrapClient({ token: TOKEN });
/**
 * Send an email using Mailtrap.
 * @param to Recipient email address
 * @param subject Email subject
 * @param text Plain text body
 * @param html Optional HTML body
 */
async function sendMailtrapMail({ to, subject, text, html, fromName = 'Velo', }) {
    const sender = { name: fromName, email: SENDER_EMAIL };
    await client.send({
        from: sender,
        to: [{ email: to }],
        subject,
        text,
        html,
    });
}
//# sourceMappingURL=mailtrap.js.map