"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginNotificationTemplate = loginNotificationTemplate;
const colors = {
    primary: '#2563eb',
    background: '#eaf1ff',
    card: '#fff',
    text: '#000',
};
function loginNotificationTemplate(name) {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset=\"UTF-8\">
  <title>Login Notification</title>
</head>
<body style=\"background:${colors.background}; font-family:Arial,sans-serif; color:${colors.text}; margin:0; padding:0;\">
  <div style=\"max-width:500px; margin:40px auto; background:${colors.card}; border-radius:8px; box-shadow:0 2px 8px ${colors.primary}22; padding:32px;\">
    <div style=\"text-align:center; margin-bottom:24px;\">
      <h2 style=\"color:${colors.primary}; margin:16px 0 0;\">Login Notification</h2>
    </div>
    <div style=\"font-size:16px; margin-bottom:24px;\">
      <p>Hello ${name},</p><p>Your account was just accessed. If this wasn't you, please reset your password immediately.</p>
    </div>
    <div style=\"margin-top:32px; font-size:12px; color:#888; text-align:center;\">
      &copy; 2025 Velo. All rights reserved.
    </div>
  </div>
</body>
</html>`;
}
//# sourceMappingURL=loginNotificationTemplate.js.map