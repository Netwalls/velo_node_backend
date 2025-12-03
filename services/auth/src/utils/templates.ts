export function resendOtpTemplate(email: string, otp: string): string {
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.4">
      <h2>Verify your email</h2>
      <p>Hi ${email},</p>
      <p>Your verification code is: <strong>${otp}</strong></p>
      <p>If you didn't request this, you can ignore this email.</p>
    </div>
  `;
}

export function passwordResetRequestTemplate(email: string, token: string): string {
  const resetUrl = `${process.env.FRONTEND_URL || 'https://app.example.com'}/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.4">
      <h2>Password reset request</h2>
      <p>Hi ${email},</p>
      <p>We received a request to reset your password. Click the link below to reset it:</p>
      <p><a href="${resetUrl}">Reset your password</a></p>
      <p>If you didn't request this, you can ignore this email.</p>
    </div>
  `;
}

export default { resendOtpTemplate, passwordResetRequestTemplate };
