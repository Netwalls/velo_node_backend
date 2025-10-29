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
            // Deposit monitor with backoff, jitter and non-overlapping runs to avoid
            // hammering upstream providers (e.g. Alchemy). Default base interval is 5 minutes.
            const baseIntervalMs = Number(process.env.DEPOSIT_MONITOR_INTERVAL_MS) || 30 * 60 * 1000; // default 5m
            const maxBackoffMultiplier = Number(process.env.DEPOSIT_MONITOR_MAX_BACKOFF_MULTIPLIER) || 8; // exponential cap
            const jitterFraction = Number(process.env.DEPOSIT_MONITOR_JITTER_FRACTION) || 0.1; // up to 10% jitter

            let consecutiveFailures = 0;
            let isRunning = false;

            const scheduleNext = (delayMs: number) => {
                setTimeout(async () => {
                    if (isRunning) {
                        console.log('Deposit monitor: previous run still in progress, skipping this cycle');
                        // schedule next with base interval and light jitter
                        const jitter = Math.floor(Math.random() * baseIntervalMs * jitterFraction);
                        scheduleNext(baseIntervalMs + jitter);
                        return;
                    }

                    isRunning = true;
                    try {
                        await WalletController.checkForDeposits();
                        console.log('Deposit monitor: run completed');
                        consecutiveFailures = 0;

                        // schedule next run with base interval + jitter
                        const jitter = Math.floor(Math.random() * baseIntervalMs * jitterFraction);
                        scheduleNext(baseIntervalMs + jitter);
                    } catch (err) {
                        consecutiveFailures++;
                        const backoffMultiplier = Math.min(2 ** consecutiveFailures, maxBackoffMultiplier);
                        const nextDelay = Math.min(baseIntervalMs * backoffMultiplier, baseIntervalMs * maxBackoffMultiplier);
                        const jitter = Math.floor(Math.random() * baseIntervalMs * jitterFraction);
                        console.error('Deposit monitor run failed:', (err as any)?.message || err, ` — scheduling retry in ${nextDelay + jitter}ms`);
                        scheduleNext(nextDelay + jitter);
                    } finally {
                        isRunning = false;
                    }
                }, delayMs);
            };

            // Start the monitor: run once immediately (without delay)
            scheduleNext(0);
        } catch (e) {
            console.error('Failed to start deposit monitor', (e as any)?.message || e);
        }
    });
});
