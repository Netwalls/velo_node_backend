export const resendOtpTemplate = (email: string, otp: string) => `
  <p>Hello ${email},</p>
  <p>Your one time verification code is: <strong>${otp}</strong></p>
  <p>This code will expire in 15 minutes.</p>
`;
