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
import { SplitPaymentExecution } from '../entities/SplitPaymentExecution'; // Missing import!
import { SplitPaymentExecutionResult } from '../entities/SplitPaymentExecutionResult';


export const AppDataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    synchronize: process.env.NODE_ENV === 'development',
    logging: ['error'],
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
        SplitPaymentExecutionResult
    ],
    migrations: ['src/migrations/*.ts'],
    subscribers: ['src/subscribers/*.ts'],
    // ssl: false,
    // ssl: { rejectUnauthorized: false },
});
export const connectDB = async (): Promise<void> => {
    try {
        // Log resolved connection parameters (avoid printing password)
        const opts: any = AppDataSource.options as any;
        const cfg: Record<string, unknown> = {
            url: opts.url ?? null,
            host: opts.host ?? null,
            port: opts.port ?? null,
            database: opts.database ?? null,
            username: opts.username ?? null,
            ssl: opts.ssl ?? null,
        };
        console.log('Attempting DB connect with config:', cfg);
        await AppDataSource.initialize();
        console.log('PostgreSQL Connected successfully');
        // Query the server for the active database and user to help debugging
        try {
            const result: any = await AppDataSource.query("SELECT current_database() AS db, current_user AS user");
            if (Array.isArray(result) && result[0]) {
                console.log('Active DB connection info:', result[0]);
            }
        } catch (err) {
            // Non-fatal: just log the error
            console.error('Failed to read current_database/current_user:', err);
        }
    } catch (error) {
        console.error('Database connection failed:', error);
        process.exit(1);
    }
};
