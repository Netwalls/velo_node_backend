import dotenv from 'dotenv';
dotenv.config();

import { DataSource } from 'typeorm';
import { MerchantPayment } from '../entities/MerchantPayment';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  synchronize: process.env.NODE_ENV === 'development',
  logging: ['error'],
  entities: [MerchantPayment],
  migrations: ['src/migrations/*.ts'],
  subscribers: ['src/subscribers/*.ts'],
});

export const connectDB = async (): Promise<void> => {
  try {
    await AppDataSource.initialize();
    console.log('PostgreSQL Connected successfully (QR Payment Service)');
    
    const entityNames = AppDataSource.entityMetadatas.map(meta => meta.name);
    // console.log('Registered entities:', entityNames);
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
};
