import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest, JWTPayload } from '../types';

export const authenticateJWT = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const authHeader = req.headers.authorization;

    if (authHeader) {
        const token = authHeader.split(' ')[1];

        jwt.verify(
            token,
            process.env.JWT_SECRET || 'your-secret-key',
            (err, user) => {
                if (err) {
                    console.error('[Auth] Token verification failed:', err.message);
                    return res.status(403).json({
                        error: 'Forbidden',
                        message: 'Invalid or expired authentication token',
                        details: err.message
                    });
                }

                (req as AuthRequest).user = user as any;
                next();
            }
        );
    } else {
        console.warn('[Auth] No authorization header present');
        res.status(401).json({
            error: 'Unauthorized',
            message: 'Authentication token required'
        });
    }
};
