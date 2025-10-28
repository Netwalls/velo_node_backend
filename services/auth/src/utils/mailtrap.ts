import nodemailer from 'nodemailer';

const host = process.env.MAIL_HOST || 'smtp.mailtrap.io';
const port = Number(process.env.MAIL_PORT || 587);
const user = process.env.MAIL_USER;
const pass = process.env.MAIL_PASS;

const transporter = nodemailer.createTransport({
  host,
  port,
  auth: user && pass ? { user, pass } : undefined,
});

export const sendMailtrapMail = async ({ to, subject, text, html }: { to: string; subject: string; text?: string; html?: string; }) => {
  if (!user || !pass) {
    console.warn('Mailtrap credentials not set; printing mail to console.');
    console.log('To:', to, 'Subject:', subject, 'Text:', text);
    return;
  }
  await transporter.sendMail({ from: process.env.MAIL_FROM || 'noreply@velo.local', to, subject, text, html });
};
