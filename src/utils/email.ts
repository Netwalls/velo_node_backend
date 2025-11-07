import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendMail = async (to: string, subject: string, html: string): Promise<void> => {
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
    } catch (error) {
        console.error('Email send error:', error);
        throw error;
    }
};
