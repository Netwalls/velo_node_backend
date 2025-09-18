// Email templates for Velo app

const colors = {
    primary: '#2563eb',
    background: '#eaf1ff',
    card: '#fff',
    text: '#000',
};

function baseTemplate({
    title,
    body,
    cta_link,
    cta_text,
}: {
    title: string;
    body: string;
    cta_link?: string;
    cta_text?: string;
}) {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
</head>
<body style="background:${
        colors.background
    }; font-family:Arial,sans-serif; color:${
        colors.text
    }; margin:0; padding:0;">
  <div style="max-width:500px; margin:40px auto; background:${
      colors.card
  }; border-radius:8px; box-shadow:0 2px 8px ${
        colors.primary
    }22; padding:32px;">
    <div style="text-align:center; margin-bottom:24px;">
      <h2 style="color:${colors.primary}; margin:16px 0 0;">${title}</h2>
    </div>
    <div style="font-size:16px; margin-bottom:24px;">
      ${body}
    </div>
    ${
        cta_link && cta_text
            ? `<div style=\"text-align:center;\"><a href=\"${cta_link}\" style=\"background:${colors.primary}; color:${colors.card}; text-decoration:none; padding:12px 32px; border-radius:6px; font-weight:bold;\">${cta_text}</a></div>`
            : ''
    }
    <div style="margin-top:32px; font-size:12px; color:#888; text-align:center;">
      &copy; 2025 Velo. All rights reserved.
    </div>
  </div>
</body>
</html>`;
}

export function otpTemplate(email: string, otp: string) {
    return baseTemplate({
        title: 'Verify Your Email',
        body: `<p>Your verification code is:</p><h1 style=\"color:${colors.primary};\">${otp}</h1><p>Enter this code in the app to verify your email address for ${email}.</p>`,
    });
}

export function resendOtpTemplate(email: string, otp: string) {
    return baseTemplate({
        title: 'Your New Verification Code',
        body: `<p>You requested a new verification code:</p><h1 style=\"color:${colors.primary};\">${otp}</h1><p>If you did not request this, please ignore this email.</p>`,
    });
}

export function welcomeTemplate(name: string) {
    return baseTemplate({
        title: 'Welcome to Velo!',
        body: `<p>Welcome to Velo, <b>${name}</b>!</p><p>We're excited to have you on board. Start managing your crypto payments and splits now.</p>`,
    });
}

export function loginNotificationTemplate(name: string) {
    return baseTemplate({
        title: 'Login Notification',
        body: `<p>Hello ${name},</p><p>Your account was just accessed. If this wasn't you, please reset your password immediately.</p>`,
    });
}
