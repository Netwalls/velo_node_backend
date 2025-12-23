import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { setupSwagger } from './config/swagger';
import rateLimit from 'express-rate-limit';

import { env } from '../../../shared/config/env';
import { AppDataSource } from './config/database';
import { connectDB } from '../../../shared/config/database';

import airtimeRoutes from './routes/airtimeRoute';

const app = express();

app.use(helmet());
app.use(cors({
    origin: env.NODE_ENV === 'production'
        ? ['https://yourapp.com', 'https://app.yourapp.com']
        : '*',
    credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(morgan('dev'));

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/airtime', limiter);

app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        service: 'airtime-service',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});

app.use('/api/airtime', airtimeRoutes);

setupSwagger(app);

app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.AIRTIME_PORT || 4004; // Different port than Auth (4000)

async function startServer() {
    try {
        await connectDB(AppDataSource);

        app.listen(PORT, () => {
            console.log('AIRTIME-SERVICE RUNNING');
            console.log(`Port: ${PORT}`);
            console.log(`Health: http://localhost:${PORT}/health`);
            console.log(`Docs: http://localhost:${PORT}/api-docs`);
        });
    } catch (error) {
        console.error('Failed to start airtime-service:', error);
        process.exit(1);
    }
}

startServer();
