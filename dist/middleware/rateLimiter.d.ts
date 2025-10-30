import { RequestHandler } from 'express';
export declare function createRateLimiter(options?: Partial<{
    windowMs: number;
    max: number;
    message: string;
}>): RequestHandler;
export default createRateLimiter;
//# sourceMappingURL=rateLimiter.d.ts.map