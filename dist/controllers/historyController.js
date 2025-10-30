"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HistoryController = void 0;
const database_1 = require("../config/database");
const Transaction_1 = require("../entities/Transaction");
class HistoryController {
    // Get all transactions for the user
    static async getHistory(req, res) {
        try {
            const txRepo = database_1.AppDataSource.getRepository(Transaction_1.Transaction);
            const transactions = await txRepo.find({
                where: { userId: req.user.id },
                order: { createdAt: 'DESC' },
            });
            res.json({ transactions });
        }
        catch (error) {
            console.error('Get history error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}
exports.HistoryController = HistoryController;
//# sourceMappingURL=historyController.js.map