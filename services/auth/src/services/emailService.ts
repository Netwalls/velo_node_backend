import axios from 'axios';
import { sendMailtrapMail } from '../utils/mailtrap';
import { resendOtpTemplate } from '../templates/resendOtpTemplate';
import { passwordResetRequestTemplate } from '../templates/passwordResetTemplates';

const MONOLITH_URL = process.env.MONOLITH_URL;

export const sendRegistrationEmails = async (email: string, otp: string) => {
  if (MONOLITH_URL) {
    try {
      await axios.post(`${MONOLITH_URL}/internal/email/register`, { email, otp });
      return;
    } catch (err) {
      console.warn('Forward to monolith email failed, falling back to local send', err);
    }
  }
  await sendMailtrapMail({ to: email, subject: 'Verify your email', html: resendOtpTemplate(email, otp) });
};

export const sendOtp = async (email: string, otp: string) => {
  if (MONOLITH_URL) {
    try {
      await axios.post(`${MONOLITH_URL}/internal/email/otp`, { email, otp });
      return;
    } catch (err) {
      console.warn('Forward to monolith otp failed, falling back to local send', err);
    }
  }
  await sendMailtrapMail({ to: email, subject: 'Your OTP Code', html: resendOtpTemplate(email, otp) });
};

export const sendPasswordReset = async (email: string, token: string) => {
  if (MONOLITH_URL) {
    try {
      await axios.post(`${MONOLITH_URL}/internal/email/password-reset`, { email, token });
      return;
    } catch (err) {
      console.warn('Forward to monolith password-reset email failed, falling back to local send', err);
    }
  }
  await sendMailtrapMail({ to: email, subject: 'Password Reset', html: passwordResetRequestTemplate(email, token) });
};
