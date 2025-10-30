/**
 * Send an email using Mailtrap.
 * @param to Recipient email address
 * @param subject Email subject
 * @param text Plain text body
 * @param html Optional HTML body
 */
export declare function sendMailtrapMail({ to, subject, text, html, fromName, }: {
    to: string;
    subject: string;
    text: string;
    html?: string;
    fromName?: string;
}): Promise<void>;
//# sourceMappingURL=mailtrap.d.ts.map