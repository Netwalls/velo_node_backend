"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireEmailVerification = exports.authMiddleware = void 0;
const jwt_1 = require("../utils/jwt");
const database_1 = require("../config/database");
const User_1 = require("../entities/User");
const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];
        if (!token) {
            res.status(401).json({ error: 'Access token required' });
            return;
        }
        const decoded = (0, jwt_1.verifyAccessToken)(token);
        const userRepository = database_1.AppDataSource.getRepository(User_1.User);
        const user = await userRepository.findOne({
            where: { id: decoded.userId },
            relations: ['addresses', 'kycDocument'],
        });
        if (!user) {
            res.status(401).json({ error: 'User not found' });
            return;
        }
        req.user = user;
        next();
    }
    catch (error) {
        res.status(403).json({ error: 'Invalid or expired token' });
    }
};
exports.authMiddleware = authMiddleware;
const requireEmailVerification = (req, res, next) => {
    if (!req.user?.isEmailVerified) {
        res.status(403).json({ error: 'Email verification required' });
        return;
    }
    next();
};
exports.requireEmailVerification = requireEmailVerification;
//# sourceMappingURL=auth.js.map