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

// Enable SSL by default, only disable for localhost or if explicitly set to false
const isLocalhost = process.env.DATABASE_URL && /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL);
const shouldUseSsl = process.env.DATABASE_SSL === 'false' ? false : !isLocalhost;

// Allow strict certificate verification if DB_STRICT_SSL=true. Default is false.
const rejectUnauthorized = process.env.DB_STRICT_SSL === 'true';

console.log(`[DB Config] SSL enabled: ${shouldUseSsl}, rejectUnauthorized: ${rejectUnauthorized}`);
console.log(`[DB Config] NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
console.log(`[DB Config] Is localhost: ${isLocalhost}`);

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
    ssl: shouldUseSsl,
    extra: shouldUseSsl ? {
        ssl: {
            rejectUnauthorized
        }
    } : {},
});

export const connectDB = async (): Promise<void> => {
    try {
        await AppDataSource.initialize();
        console.log('✅ PostgreSQL Connected successfully');
    } catch (error) {
        console.error('❌ Database connection failed:', error);
        process.exit(1);
    }
};