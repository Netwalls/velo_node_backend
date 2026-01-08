"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
// shared/config/env.ts
require("dotenv/config");
const zod_1 = require("zod");
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'test', 'production']).default('development'),
    PORT: zod_1.z.coerce.number().default(4000),
    // Database
    DATABASE_URL: zod_1.z.string().url(),
    // Security
    INTERNAL_API_KEY: zod_1.z.string().min(32),
    ENCRYPTION_KEY: zod_1.z.string().min(32),
    // JWT
    JWT_ACCESS_SECRET: zod_1.z.string().min(32),
    JWT_REFRESH_SECRET: zod_1.z.string().min(32),
    // Email (Mailtrap)
    MAILTRAP_TOKEN: zod_1.z.string().min(20),
    MAILTRAP_SENDER: zod_1.z.string().email(),
    FRONTEND_URL: zod_1.z.string().url(),
    // External
    WALLET_SERVICE_URL: zod_1.z.string(),
    GOOGLE_CLIENT_ID: zod_1.z.string(),
    // Control whether TypeORM prints SQL `query` logs. Helpful to silence noisy SQL in dev.
    TYPEORM_SHOW_QUERIES: zod_1.z.coerce.boolean().default(false),
});
const result = envSchema.safeParse(process.env);
if (!result.success) {
    console.error('Invalid environment variables:');
    result.error.issues.forEach((issue) => {
        console.error(`  • ${issue.path.join('.')} → ${issue.message}`);
    });
    process.exit(1);
}
exports.env = result.data;
