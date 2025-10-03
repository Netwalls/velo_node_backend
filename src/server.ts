import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { connectDB } from './config/database';
import { PaymentMonitoringService } from './services/paymentMonitoringService';
import authRouter from './routes/authRoute';
import userRouter from './routes/userRoute';
import walletRouter from './routes/walletRoute';
import notificationRouter from './routes/notificationRoute';
import historyRouter from './routes/historyRoute';
import paymentRouter from './routes/payment';
import fiatRoutes from './routes/fiatRoute';
import transactionRoutes from './routes/transactionRoute';
import merchantRoutes from './routes/merchantRoute';
import deployRoute from './routes/deployRoute';
import splitPaymentRoutes from './routes/splitPaymentRoute';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

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
app.use('/merchant', merchantRoutes);
app.use('/deploy', deployRoute);
app.use('/split-payment', splitPaymentRoutes);

connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);

        // Start payment monitoring service
        PaymentMonitoringService.start();
        console.log('Payment monitoring service started');

        // setInterval(() => {
        //     MerchantController.detectDeposits();
        // }, 60_000); // every 60 seconds
    });
});
