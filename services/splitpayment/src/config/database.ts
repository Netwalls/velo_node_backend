import dotenv from 'dotenv';
dotenv.config();

import { DataSource } from 'typeorm';
import { User } from '../entities/User';
import { UserAddress } from '../entities/UserAddress';
import { KYCDocument } from '../entities/KYCDocument';
import { RefreshToken } from '../entities/RefreshToken';
import { Notification } from '../entities/Notification';
import { Transaction } from '../entities/Transaction';
import { SplitPayment } from '../entities/SplitPayment';
import { SplitPaymentRecipient } from '../entities/SplitPaymentRecipient';
import { SplitPaymentExecution } from '../entities/SplitPaymentExecution';
import { SplitPaymentExecutionResult } from '../entities/SplitPaymentExecutionResult';
import { Fee } from '../entities/Fee';

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
        SplitPayment,
        SplitPaymentExecution,
        SplitPaymentRecipient,
        SplitPaymentExecutionResult,
        Fee,
    ],
    migrations: [],
    subscribers: [],
    // ssl: { rejectUnauthorized: false },
});

export const connectDB = async (): Promise<void> => {
    try {
        await AppDataSource.initialize();
        console.log('PostgreSQL Connected successfully');

        // Debug: Check if entities are registered
        const entityNames = AppDataSource.entityMetadatas.map(meta => meta.name);
        console.log('Registered entities:', entityNames);
    } catch (error) {
        console.error('Database connection failed:', error);
        process.exit(1);
    }
};
