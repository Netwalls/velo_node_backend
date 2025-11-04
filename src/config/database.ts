import dotenv from 'dotenv';
dotenv.config();

import { DataSource } from 'typeorm';

export const AppDataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    synchronize: process.env.NODE_ENV === 'development',
    logging: true, // Change to true for debugging
    entities: ['src/entities/**/*.ts'], // This automatically includes ALL entities
    migrations: ['src/migrations/*.ts'],
    subscribers: ['src/subscribers/*.ts'],
    ssl: false, // Set to false for local development
});

export const connectDB = async (): Promise<void> => {
    try {
        await AppDataSource.initialize();
        console.log('✅ PostgreSQL Connected successfully');
        
        // Debug: List registered entities
        console.log('📋 Registered entities:');
        AppDataSource.entityMetadatas.forEach(metadata => {
            console.log(`   - ${metadata.name}`);
        });
        
    } catch (error) {
        console.error('❌ Database connection failed:', error);
        process.exit(1);
    }
};