"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = exports.createDataSource = void 0;
// shared/config/database.ts
const typeorm_1 = require("typeorm");
const env_1 = require("./env");
// This file is imported by ALL services (auth, wallet, notification, etc.)
// Each service will extend it with its own entities
const createDataSource = (entities) => {
    return new typeorm_1.DataSource({
        type: 'postgres',
        url: env_1.env.DATABASE_URL,
        synchronize: env_1.env.NODE_ENV === 'development',
        // Only enable query logging when explicitly requested via env.TYPEORM_SHOW_QUERIES.
        // This hides verbose SQL during dev by default.
        logging: env_1.env.TYPEORM_SHOW_QUERIES ? ['query', 'error'] : ['error'],
        entities,
        migrations: ['dist/migrations/*.js'], // compiled
        migrationsRun: env_1.env.NODE_ENV === 'production',
        ssl: env_1.env.NODE_ENV === 'production'
            ? { rejectUnauthorized: false }
            : false,
    });
    // ssl: { rejectUnauthorized: false },
};
exports.createDataSource = createDataSource;
// Optional: Global connection helper (used in server.ts of each service)
const connectDB = async (dataSource) => {
    try {
        if (!dataSource.isInitialized) {
            await dataSource.initialize();
        }
        console.log('[DB] PostgreSQL connected');
        console.log('[DB] Entities loaded:', dataSource.entityMetadatas.map(m => m.name).join(', '));
    }
    catch (error) {
        console.error('[DB] Connection failed:', error);
        process.exit(1);
    }
};
exports.connectDB = connectDB;
