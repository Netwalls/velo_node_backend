"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminMiddleware = void 0;
/**
 * Admin middleware: checks if authenticated user's email is in ADMIN_EMAILS env var
 * ADMIN_EMAILS should be a comma-separated list of admin emails.
 */
const adminMiddleware = (req, res, next) => {
    try {
        const adminsEnv = process.env.ADMIN_EMAILS || '';
        const admins = adminsEnv.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
        const userEmail = req.user?.email?.toLowerCase();
        if (!userEmail || !admins.includes(userEmail)) {
            res.status(403).json({ error: 'Admin access required' });
            return;
        }
        next();
    }
    catch (err) {
        res.status(403).json({ error: 'Admin access required' });
    }
};
exports.adminMiddleware = adminMiddleware;
exports.default = exports.adminMiddleware;
//# sourceMappingURL=admin.js.map