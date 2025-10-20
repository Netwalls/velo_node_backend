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
app.use('/payments', paymentRouter);
app.use('/transactions', transactionRoutes);
app.use('/merchant', qrpaymentRoute);
app.use('/split-payment', splitPaymentRoutes);
app.use('/checkdeploy',strkRoute );
app.use('/admin', adminRoute);
// Public routes should be mounted last for clarity, but ensure no conflicts
app.use('/', publicRoute);

connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
// WalletController.deployFundedStarknetAccounts().catch((err) =>
//             
        // setInterval(() => {
        //     MerchantController.detectDeposits();
        // }, 60_000); // every 60 seconds
    });
});
