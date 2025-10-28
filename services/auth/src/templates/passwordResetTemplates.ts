export const passwordResetRequestTemplate = (email: string, token: string) => `
  <p>Hello ${email},</p>
  <p>Use the following token to reset your password: <strong>${token}</strong></p>
  <p>This token expires in 15 minutes.</p>
`;

export const passwordResetRequestText = (email: string, token: string) =>
  `Password reset token for ${email}: ${token}`;

export const passwordChangedTemplate = (email: string) => `
  <p>Hello ${email},</p>
  <p>Your password has been changed successfully.</p>
`;
export const passwordChangedText = (email: string) =>
  `Your password has been changed successfully.`;
