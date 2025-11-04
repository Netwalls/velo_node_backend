"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// test-db-simple.ts
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
console.log('🔍 Checking environment variables...');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_PASSWORD length:', process.env.DB_PASSWORD?.length);
console.log('NODE_ENV:', process.env.NODE_ENV);
const typeorm_1 = require("typeorm");
const testDataSource = new typeorm_1.DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    synchronize: false,
    logging: true,
});
async function test() {
    try {
        console.log('🚀 Attempting to connect...');
        await testDataSource.initialize();
        console.log('✅ SUCCESS: Database connected!');
        await testDataSource.destroy();
    }
    catch (error) {
        console.error('❌ FAILED:', error.message);
        console.log('Full error:', error);
    }
}
test();
//# sourceMappingURL=test-db-simple.js.map