import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
/**
 * Admin middleware: checks if authenticated user's email is in ADMIN_EMAILS env var
 * ADMIN_EMAILS should be a comma-separated list of admin emails.
 */
export declare const adminMiddleware: (req: AuthRequest, res: Response, next: NextFunction) => void;
export default adminMiddleware;
//# sourceMappingURL=admin.d.ts.map