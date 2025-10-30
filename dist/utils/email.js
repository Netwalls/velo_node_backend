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
// import nodemailer from 'nodemailer';
// // const transporter = nodemailer.createTransport({
// //     host: process.env.EMAIL_HOST,
// //     port: Number(process.env.EMAIL_PORT),
// //     secure: false,
// //     auth: {
// //         user: process.env.EMAIL_USER,
// //         pass: process.env.EMAIL_PASS,
// //     },
// // });
// // const transporter = nodemailer.createTransport({
// //     host: process.env.EMAIL_HOST,
// //     port: Number(process.env.EMAIL_PORT),
// //     secure: false, // false for port 587
// //     requireTLS: true, // Add this for port 587
// //     auth: {
// //         user: process.env.EMAIL_USER,
// //         pass: process.env.EMAIL_PASS,
// //     },
// // });
//     // const transporter = nodemailer.createTransport({
//     //     service: 'gmail', // Using service instead of manual config
//     //     auth: {
//     //         user: process.env.EMAIL_USER,
//     //         pass: process.env.EMAIL_PASS,
//     //     },
//     // });
// const transporter = () => {
//     return nodemailer.createTransport({
//         host: 'smtp.gmail.com',
//         port: 587,
//         secure: false,
//         requireTLS: true,
//         auth: {
//             user: process.env.EMAIL_USER,
//             pass: process.env.EMAIL_PASS,
//         },
//         tls: {
//             ciphers: 'SSLv3',
//             rejectUnauthorized: false
//         }
//     });
// };
// // export async function sendMail(to: string, subject: string, html: string) {
// //     try {
// //         await transporter.sendMail({
// //             from: process.env.EMAIL_FROM,
// //             to,
// //             subject,
// //             html,
// //         });
// //     } catch (error) {
// //         console.error('Email send error:', error);
// //         throw error;
// //     }
// // }
// export const sendMail = async (to: string, subject: string, html: string): Promise<void> => {
//     try {
//         console.log(`Attempting to send email to ${to} using port ${process.env.EMAIL_PORT}`);
//         // Test connection first
//         console.log('SMTP connection verified successfully');
//         const info = await transporter().sendMail({
//             from: process.env.EMAIL_FROM,
//             to,
//             subject,
//             html,
//         });
//         console.log(`Email sent successfully to ${to}: ${info.messageId}`);
//     } catch (error) {
//         console.error('Email send error:', error);
//         // Try alternative configuration if first one fails
//         console.log('Trying alternative email configuration...');
//         try {
//             const alternativeTransporter = transporter();
//             await alternativeTransporter.verify();
//             const info = await alternativeTransporter.sendMail({
//                 from: process.env.EMAIL_FROM,
//                 to,
//                 subject,
//                 html,
//             });
//             console.log(`Email sent with alternative config: ${info.messageId}`);
//         } catch (altError) {
//             console.error('Alternative email config also failed:', altError);
//             throw error; // Throw original error
//         }
//     }
// };
//# sourceMappingURL=email.js.map