import { Request, Response } from "express";
/**
 * Reusable rate limiter configuration for purchase endpoints
 */
export declare const createPurchaseRateLimiter: () => import("express-rate-limit").RateLimitRequestHandler;
/**
 * Extract and validate user ID from request
 */
export declare const getUserId: (req: Request) => string | null;
/**
 * Reusable authentication check
 */
export declare const requireAuth: (req: Request, res: Response) => boolean;
/**
 * Reusable error handler
 */
export declare const handleError: (res: Response, error: any, defaultMessage: string, statusCode?: number) => void;
/**
 * Reusable success response
 */
export declare const sendSuccess: (res: Response, message: string, data?: any) => void;
/**
 * Validate required fields
 */
export declare const validateRequiredFields: (req: Request, res: Response, fields: string[]) => boolean;
/**
 * Validate enum value
 */
export declare const validateEnum: (res: Response, value: any, enumObject: any, fieldName: string) => boolean;
/**
 * Find item in history by ID
 */
export declare const findInHistory: <T extends {
    id: string;
}>(res: Response, getHistoryFn: () => Promise<T[]>, itemId: string, itemName: string) => Promise<T | null>;
//# sourceMappingURL=controlllerHelper.d.ts.map