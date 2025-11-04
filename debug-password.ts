// debug-password.ts
import { config } from 'dotenv';
config();

console.log('🔐 Password Debug Information');
console.log('=============================');

console.log('DB_PASSWORD from env:', process.env.DB_PASSWORD);
console.log('Type of DB_PASSWORD:', typeof process.env.DB_PASSWORD);
console.log('DB_PASSWORD length:', process.env.DB_PASSWORD?.length);
console.log('DB_PASSWORD value:', `"${process.env.DB_PASSWORD}"`);

// Test the database configuration directly
import { DataSource } from 'typeorm';

const testDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

// Safe way to access options - check the type first
console.log('\n📋 DataSource Configuration:');
console.log('DataSource type:', testDataSource.options.type);

// Since we know it's postgres, we can assert the type
const options = testDataSource.options as any;
console.log('Host:', options.host);
console.log('Port:', options.port);
console.log('Username:', options.username);
console.log('Database:', options.database);
console.log('Has password:', !!options.password);
console.log('Password type:', typeof options.password);

// Test connection
async function testConnection() {
    try {
        await testDataSource.initialize();
        console.log('\n✅ Connection SUCCESS with current configuration');
        await testDataSource.destroy();
    } catch (error: any) {
        console.error('\n❌ Connection FAILED:', error.message);
    }
}

testConnection();