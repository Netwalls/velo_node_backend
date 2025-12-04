// shared/config/database.ts
import { DataSource } from 'typeorm';
import { env } from './env';

// This file is imported by ALL services (auth, wallet, notification, etc.)
// Each service will extend it with its own entities

export const createDataSource = (entities: any[]) => {
  return new DataSource({
    type: 'postgres',
    url: env.DATABASE_URL,
    synchronize: env.NODE_ENV === 'development',
    // Only enable query logging when explicitly requested via env.TYPEORM_SHOW_QUERIES.
    // This hides verbose SQL during dev by default.
    logging: env.TYPEORM_SHOW_QUERIES ? ['query', 'error'] : ['error'],
    entities,
    migrations: ['dist/migrations/*.js'], // compiled
    migrationsRun: env.NODE_ENV === 'production',
    ssl:
      env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false }
        : false,
  });
      // ssl: { rejectUnauthorized: false },

};

// Optional: Global connection helper (used in server.ts of each service)
export const connectDB = async (dataSource: DataSource): Promise<void> => {
  try {
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }
    console.log('[DB] PostgreSQL connected');
    console.log('[DB] Entities loaded:', dataSource.entityMetadatas.map(m => m.name).join(', '));
  } catch (error) {
    console.error('[DB] Connection failed:', error);
    process.exit(1);
  }
};