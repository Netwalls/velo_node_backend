// Thin wrapper: re-export the canonical DB connection from `database.ts`.
// This keeps the original simple structure and prevents duplicated configs
// introduced by the recent merge.

import { connectDB, AppDataSource } from './database';

export { connectDB, AppDataSource };