import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

export const sendOTPEmail = async (
    email: string,
    otp: string
): Promise<void> => {
    const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: email,
        subject: 'Email Verification OTP',
        html: `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>Email Verification</h2>
        <p>Your OTP code is: <strong style="font-size: 24px; color: #007bff;">${otp}</strong></p>
        <p>This code will expire in 10 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
      </div>
    `,
    };

    await transporter.sendMail(mailOptions);
};
