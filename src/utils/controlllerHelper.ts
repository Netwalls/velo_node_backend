// src/utils/controllerHelpers.ts
import { Request, Response } from "express";
import rateLimit from 'express-rate-limit';

/**
 * Reusable rate limiter configuration for purchase endpoints
 */
export const createPurchaseRateLimiter = () => rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 3, // Maximum 3 purchases per minute per IP
    message: {
        success: false,
        message: 'Too many purchase attempts. Please try again in a minute.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Extract and validate user ID from request
 */
export const getUserId = (req: Request): string | null => {
    return (req as any).user?.id || null;
};

/**
 * Reusable authentication check
 */
export const requireAuth = (req: Request, res: Response): boolean => {
    const userId = getUserId(req);
    if (!userId) {
        res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
        return false;
    }
    return true;
};

/**
 * Reusable error handler
 */
export const handleError = (
    res: Response,
    error: any,
    defaultMessage: string,
    statusCode: number = 400
) => {
    console.error(`Error: ${defaultMessage}`, error);
    res.status(statusCode).json({
        success: false,
        message: error.message || defaultMessage
    });
};

/**
 * Reusable success response
 */
export const sendSuccess = (
    res: Response,
    message: string,
    data?: any
) => {
    res.json({
        success: true,
        message,
        ...(data && { data })
    });
};

/**
 * Validate required fields
 */
export const validateRequiredFields = (
    req: Request,
    res: Response,
    fields: string[]
): boolean => {
    const missing = fields.filter(field => !req.body[field] && !req.query[field]);
    
    if (missing.length > 0) {
        res.status(400).json({
            success: false,
            message: `Missing required fields: ${missing.join(', ')}`
        });
        return false;
    }
    return true;
};

/**
 * Validate enum value
 */
export const validateEnum = (
    res: Response,
    value: any,
    enumObject: any,
    fieldName: string
): boolean => {
    if (!Object.values(enumObject).includes(value)) {
        res.status(400).json({
            success: false,
            message: `Invalid ${fieldName}. Supported: ${Object.values(enumObject).join(', ')}`
        });
        return false;
    }
    return true;
};

/**
 * Find item in history by ID
 */
export const findInHistory = async <T extends { id: string }>(
    res: Response,
    getHistoryFn: () => Promise<T[]>,
    itemId: string,
    itemName: string
): Promise<T | null> => {
    const history = await getHistoryFn();
    const item = history.find(p => p.id === itemId);

    if (!item) {
        res.status(404).json({
            success: false,
            message: `${itemName} not found`
        });
        return null;
    }

    return item;
};