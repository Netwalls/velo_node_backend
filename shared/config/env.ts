// shared/config/env.ts
import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),

  // Database
  DATABASE_URL: z.string().url(),

  // Security
  INTERNAL_API_KEY: z.string().min(32),
  ENCRYPTION_KEY: z.string().min(32),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),

  // Email (Mailtrap)
  MAILTRAP_TOKEN: z.string().min(20),
  MAILTRAP_SENDER: z.string().email(),

  FRONTEND_URL: z.string().url(),

  // External
  WALLET_SERVICE_URL: z.string(),
  GOOGLE_CLIENT_ID: z.string(),
  // Control whether TypeORM prints SQL `query` logs. Helpful to silence noisy SQL in dev.
  TYPEORM_SHOW_QUERIES: z.coerce.boolean().default(false),
});

type Env = z.infer<typeof envSchema>;

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error('Invalid environment variables:');
  result.error.issues.forEach((issue: { path: any[]; message: any; }) => {
    console.error(`  • ${issue.path.join('.')} → ${issue.message}`);
  });
  process.exit(1);
}

export const env = result.data;