"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = exports.AppDataSource = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const typeorm_1 = require("typeorm");
exports.AppDataSource = new typeorm_1.DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    synchronize: process.env.NODE_ENV === 'development',
    logging: true, // Change to true for debugging
    entities: ['src/entities/**/*.ts'], // This automatically includes ALL entities
    migrations: ['src/migrations/*.ts'],
    subscribers: ['src/subscribers/*.ts'],
    // ssl: false,
    ssl: { rejectUnauthorized: false },
});
const connectDB = async () => {
    try {
        await exports.AppDataSource.initialize();
        console.log('✅ PostgreSQL Connected successfully');
        // Debug: List registered entities
        console.log('📋 Registered entities:');
        exports.AppDataSource.entityMetadatas.forEach(metadata => {
            console.log(`   - ${metadata.name}`);
        });
    }
    catch (error) {
        console.error('❌ Database connection failed:', error);
        process.exit(1);
    }
};
exports.connectDB = connectDB;
//# sourceMappingURL=database.js.map