/**
 * Password reset request email template
 * @param email User's email address
 * @param resetToken 6-digit reset code
 * @returns HTML email template
 */
export declare function passwordResetRequestTemplate(email: string, resetToken: string): string;
/**
 * Password changed confirmation email template
 * @param email User's email address
 * @returns HTML email template
 */
export declare function passwordChangedTemplate(email: string): string;
/**
 * Get plain text version of password reset request
 * @param email User's email address
 * @param resetToken 6-digit reset code
 * @returns Plain text email content
 */
export declare function passwordResetRequestText(email: string, resetToken: string): string;
/**
 * Get plain text version of password changed confirmation
 * @param email User's email address
 * @returns Plain text email content
 */
export declare function passwordChangedText(email: string): string;
//# sourceMappingURL=passwordResetTemplates.d.ts.map