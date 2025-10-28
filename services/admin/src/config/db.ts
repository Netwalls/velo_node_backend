import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

// Prefer a single DATABASE_URL connection string for consistency across services.
// Fallback to individual DB_* env vars for flexibility.
const connectionString = process.env.DATABASE_URL;

const pool = connectionString
  ? new Pool({ connectionString })
  : new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 5432),
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASS || 'postgres',
      database: process.env.DB_NAME || 'velo',
    });

export default pool;
