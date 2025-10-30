import { Request, Response } from 'express';
export declare class AdminController {
    /**
     * GET /admin/stats
     * Returns dashboard statistics: total users, total amount (confirmed transactions),
     * most used chain, and most used functionality counts (send, receive, qrpayment, splitting)
     */
    static getStats(req: Request, res: Response): Promise<void>;
    /**
     * DELETE /admin/users/:id
     * Deletes a user and related entities (best-effort) by id. Protected by auth + admin middleware.
     */
    static deleteUser(req: Request, res: Response): Promise<void>;
}
export default AdminController;
//# sourceMappingURL=adminController.d.ts.map