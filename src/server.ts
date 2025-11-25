import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { connectDB } from './config/database';
import authRouter from './routes/authRoute';
import userRouter from './routes/userRoute';
import walletRouter from './routes/walletRoute';
import notificationRouter from './routes/notificationRoute';
import historyRouter from './routes/historyRoute';
// import paymentRouter from './routes/payment';
// import fiatRoutes from './routes/fiatRoute';
import transactionRoutes from './routes/transactionRoute';
import splitPaymentRoutes from './routes/splitPaymentRoute';
import strkRoute from "./routes/strkDeploymentRoute";
import qrpaymentRoute from './routes/qrpaymentRoute';
import adminRoute from './routes/adminRoute';
import publicRoute from './routes/publicRoute';
// import swapRoute from './routes/swapRoute';
import feeRoute from './routes/feeRoute';
import changellyRoute from './routes/changellyRoute';
import airtimeRoutes from "./routes/airtime";
import dataRoutes from "./routes/data";
import electricityRoutes from "./routes/electricity";
// Changelly routes are currently implemented in `src/routes/changellyRoute.ts` but
// that file has its exports commented out while the feature is in progress.
// Do not import controllers as routers — mount the routes file when it's ready.

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

// TODO: enable Changelly routes when `src/routes/changellyRoute.ts` exports a router
app.use('/api/fiat', changellyRoute);
app.use('/auth', authRouter);
app.use('/user', userRouter);
app.use('/wallet', walletRouter);
app.use('/notification', notificationRouter);
app.use('/history', historyRouter);

app.use('/transactions', transactionRoutes);
app.use('/merchant', qrpaymentRoute);
app.use('/split-payment', splitPaymentRoutes);
app.use('/checkdeploy',strkRoute );
app.use('/admin', adminRoute);
app.use('/fees', feeRoute);
// Public routes should be mounted last for clarity, but ensure no conflicts
app.use('/', publicRoute);
// app.use('/swap', swapRoute);

// utility route
app.use("/airtime", airtimeRoutes);
app.use("/data", dataRoutes);
app.use("/electricity", electricityRoutes);


connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
        // Start automatic deposit monitor (calls WalletController.checkForDeposits periodically)
    });
});
