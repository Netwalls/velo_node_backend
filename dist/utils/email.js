"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMail = void 0;
const resend_1 = require("resend");
const resend = new resend_1.Resend(process.env.RESEND_API_KEY);
const sendMail = async (to, subject, html) => {
    try {
        const response = await resend.emails.send({
            from: 'badviruscoder@gmail.com',
            to: [to],
            subject,
            html,
        });
        console.log('Resend response:', response);
        if (response.error) {
            console.error('Resend email error:', response.error);
            throw response.error;
        }
        console.log('Email sent successfully:', response.data?.id);
        // return response.data;
    }
    catch (error) {
        console.error('Email send error:', error);
        throw error;
    }
};
exports.sendMail = sendMail;
//# sourceMappingURL=email.js.map