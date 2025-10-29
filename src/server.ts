import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { connectDB } from './config/database';
import authRouter from './routes/authRoute';
import userRouter from './routes/userRoute';
import walletRouter from './routes/walletRoute';
import notificationRouter from './routes/notificationRoute';
import historyRouter from './routes/historyRoute';
import paymentRouter from './routes/payment';
import fiatRoutes from './routes/fiatRoute';
import transactionRoutes from './routes/transactionRoute';
import splitPaymentRoutes from './routes/splitPaymentRoute';
import { WalletController } from './controllers/walletController';
import strkRoute from "./routes/strkDeploymentRoute";
import qrpaymentRoute from './routes/qrpaymentRoute';
import createRateLimiter from './middleware/rateLimiter';
import adminRoute from './routes/adminRoute';
import publicRoute from './routes/publicRoute';
import swapRoute from './routes/swapRoute';
import feeRoute from './routes/feeRoute';

// Load environment variables
dotenv.config();

const app = express();
// const PORT = process.env.PORT;
const PORT = Number(process.env.PORT) || 5500;
console.log(`Using PORT=${PORT}`);

app.use(cors());
app.use(express.json());
// Apply global rate limiter
// Global rate limit: 60 requests per minute per IP
// app.use(createRateLimiter({ windowMs: 60 * 1000, max: 30 }));

app.get('/', (req, res) => {
    res.send('Velo Backend Server is running!');
});

app.use('/fiat', fiatRoutes);
app.use('/auth', authRouter);
app.use('/user', userRouter);
app.use('/wallet', walletRouter);
app.use('/notification', notificationRouter);
app.use('/history', historyRouter);
// Mount payments routes (both /payments and /api/payments for compatibility)
app.use('/payments', paymentRouter);
app.use('/api/payments', paymentRouter);
app.use('/transactions', transactionRoutes);
app.use('/merchant', qrpaymentRoute);
app.use('/split-payment', splitPaymentRoutes);
app.use('/checkdeploy',strkRoute );
app.use('/admin', adminRoute);
app.use('/fees', feeRoute);
// Public routes should be mounted last for clarity, but ensure no conflicts
app.use('/', publicRoute);
app.use('/swap', swapRoute);

connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
        // Start automatic deposit monitor (calls WalletController.checkForDeposits periodically)
        try {
            const intervalMs = Number(process.env.DEPOSIT_MONITOR_INTERVAL_MS) || 60000; // default 60s
            // Run once immediately, then schedule
            WalletController.checkForDeposits()
                .then(() => console.log('Initial deposit check completed'))
                .catch((e) => console.error('Initial deposit check failed', (e as any)?.message || e));

            setInterval(async () => {
                try {
                    await WalletController.checkForDeposits();
                    console.log('Periodic deposit check completed');
                } catch (err) {
                    console.error('Periodic deposit check error', (err as any)?.message || err);
                }
            }, intervalMs);
        } catch (e) {
            console.error('Failed to start deposit monitor', (e as any)?.message || e);
        }
    });
});
