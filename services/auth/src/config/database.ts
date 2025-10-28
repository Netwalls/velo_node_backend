import 'reflect-metadata';
import dotenv from 'dotenv';
dotenv.config();

import { DataSource } from 'typeorm';
import { User } from '../entities/User';
import { RefreshToken } from '../entities/RefreshToken';
import { UserAddress } from '../entities/UserAddress';

export const AppDataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL || 'postgres://postgres:postgres@postgres:5432/velo_dev',
    synchronize: process.env.NODE_ENV === 'development',
    logging: false,
    entities: [User, RefreshToken, UserAddress],
});

export const connectDB = async (): Promise<void> => {
    try {
        await AppDataSource.initialize();
        console.log('Auth: PostgreSQL Connected successfully');
    } catch (error) {
        console.error('Auth: Database connection failed:', error);
        process.exit(1);
    }
};
