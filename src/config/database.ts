import dotenv from 'dotenv';
dotenv.config();

import { DataSource } from 'typeorm';
import { User } from '../entities/User';
import { UserAddress } from '../entities/UserAddress';
import { KYCDocument } from '../entities/KYCDocument';
import { RefreshToken } from '../entities/RefreshToken';
import { Notification } from '../entities/Notification';
import { Transaction } from '../entities/Transaction';
import { Conversion } from '../entities/Conversion';
import { MerchantPayment } from '../entities/MerchantPayment'; 
import { SplitPayment } from '../entities/SplitPayment';
import { SplitPaymentRecipient } from '../entities/SplitPaymentRecipient';
import { SplitPaymentExecution } from '../entities/SplitPaymentExecution';
import { SplitPaymentExecutionResult } from '../entities/SplitPaymentExecutionResult';
import { Fee } from '../entities/Fee';
import ProviderOrder from '../entities/ProviderOrder';

// Decide SSL usage:
// - If DATABASE_SSL=true is set, we enable TLS.
// - Otherwise enable TLS in production or when DATABASE_URL is not localhost.
const shouldUseSsl = (process.env.DATABASE_SSL === 'true')
    || process.env.NODE_ENV === 'production'
    || (process.env.DATABASE_URL && !/localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL));

// Allow strict certificate verification if DB_STRICT_SSL=true. Default is false to
// accommodate managed DBs where providing CA certs is not practical.
const rejectUnauthorized = process.env.DB_STRICT_SSL === 'true';

export const AppDataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    synchronize: process.env.NODE_ENV === 'development',
    logging: process.env.TYPEORM_LOGGING === 'true' ? ['query', 'error'] : ['error'],
    entities: [
        User,
        UserAddress,
        KYCDocument,
        RefreshToken,
        Notification,
        Transaction,
        Conversion,
        MerchantPayment,
        SplitPayment,
        SplitPaymentExecution,
        SplitPaymentRecipient,
        SplitPaymentExecutionResult,
        ProviderOrder,
        Fee
    ],
    migrations: ['src/migrations/*.ts'],
    subscribers: ['src/subscribers/*.ts'],
    // SSL configuration - top-level and driver-level. We set both to maximize
    // compatibility with hosting providers that require TLS (Render, Heroku).
    ssl: shouldUseSsl ? { rejectUnauthorized } : false,
    extra: shouldUseSsl ? { ssl: { rejectUnauthorized } } : undefined,
});

export const connectDB = async (): Promise<void> => {
    try {
        console.log(`Database SSL: ${shouldUseSsl ? 'enabled' : 'disabled'}; rejectUnauthorized=${rejectUnauthorized}`);
        await AppDataSource.initialize();
        console.log('PostgreSQL Connected successfully');
    } catch (error) {
        console.error('Database connection failed:', error);
        process.exit(1);
    }
};