import jwt from 'jsonwebtoken';

let JWT_SECRET = process.env.JWT_SECRET;
let JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

if (!JWT_SECRET) {
    if (process.env.NODE_ENV === 'production') {
        console.error('FATAL: JWT_SECRET required in production');
        process.exit(1);
    }
    JWT_SECRET = 'dev_jwt_secret_change_me';
    console.warn('Warning: JWT_SECRET not set, using development fallback');
}

if (!JWT_REFRESH_SECRET) {
    if (process.env.NODE_ENV === 'production') {
        console.error('FATAL: JWT_REFRESH_SECRET required in production');
        process.exit(1);
    }
    JWT_REFRESH_SECRET = 'dev_jwt_refresh_secret_change_me';
    console.warn('Warning: JWT_REFRESH_SECRET not set, using development fallback');
}

export const generateAccessToken = (payload: any): string => {
    return jwt.sign(payload, JWT_SECRET as string, { expiresIn: '30m' });
};

export const generateRefreshToken = (payload: any): string => {
    return jwt.sign(payload, JWT_REFRESH_SECRET as string, { expiresIn: '7d' });
};

export const verifyAccessToken = (token: string): any => {
    return jwt.verify(token, JWT_SECRET as string) as any;
};

export const verifyRefreshToken = (token: string): any => {
    return jwt.verify(token, JWT_REFRESH_SECRET as string) as any;
};
