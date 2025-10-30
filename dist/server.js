"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const database_1 = require("./config/database");
const authRoute_1 = __importDefault(require("./routes/authRoute"));
const userRoute_1 = __importDefault(require("./routes/userRoute"));
const walletRoute_1 = __importDefault(require("./routes/walletRoute"));
const notificationRoute_1 = __importDefault(require("./routes/notificationRoute"));
const historyRoute_1 = __importDefault(require("./routes/historyRoute"));
const payment_1 = __importDefault(require("./routes/payment"));
const fiatRoute_1 = __importDefault(require("./routes/fiatRoute"));
const transactionRoute_1 = __importDefault(require("./routes/transactionRoute"));
const splitPaymentRoute_1 = __importDefault(require("./routes/splitPaymentRoute"));
const strkDeploymentRoute_1 = __importDefault(require("./routes/strkDeploymentRoute"));
const qrpaymentRoute_1 = __importDefault(require("./routes/qrpaymentRoute"));
const adminRoute_1 = __importDefault(require("./routes/adminRoute"));
const publicRoute_1 = __importDefault(require("./routes/publicRoute"));
const swapRoute_1 = __importDefault(require("./routes/swapRoute"));
const feeRoute_1 = __importDefault(require("./routes/feeRoute"));
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
// const PORT = process.env.PORT;
const PORT = Number(process.env.PORT) || 5500;
console.log(`Using PORT=${PORT}`);
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Apply global rate limiter
// Global rate limit: 60 requests per minute per IP
// app.use(createRateLimiter({ windowMs: 60 * 1000, max: 30 }));
app.get('/', (req, res) => {
    res.send('Velo Backend Server is running!');
});
app.use('/fiat', fiatRoute_1.default);
app.use('/auth', authRoute_1.default);
app.use('/user', userRoute_1.default);
app.use('/wallet', walletRoute_1.default);
app.use('/notification', notificationRoute_1.default);
app.use('/history', historyRoute_1.default);
// Mount payments routes (both /payments and /api/payments for compatibility)
app.use('/payments', payment_1.default);
app.use('/api/payments', payment_1.default);
app.use('/transactions', transactionRoute_1.default);
app.use('/merchant', qrpaymentRoute_1.default);
app.use('/split-payment', splitPaymentRoute_1.default);
app.use('/checkdeploy', strkDeploymentRoute_1.default);
app.use('/admin', adminRoute_1.default);
app.use('/fees', feeRoute_1.default);
// Public routes should be mounted last for clarity, but ensure no conflicts
app.use('/', publicRoute_1.default);
app.use('/swap', swapRoute_1.default);
(0, database_1.connectDB)().then(() => {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
        // Start automatic deposit monitor (calls WalletController.checkForDeposits periodically)
    });
});
//# sourceMappingURL=server.js.map