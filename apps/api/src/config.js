import { z } from 'zod';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

// .env berada di root repo (dua tingkat di atas apps/api)
dotenv.config({ path: fileURLToPath(new URL('../../../.env', import.meta.url)) });

const boolFromEnv = z
  .enum(['true', 'false'])
  .default('false')
  .transform((value) => value === 'true');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  APP_BASE_URL: z.string().url().default('http://localhost:5173'),

  DB_HOST: z.string().default('127.0.0.1'),
  DB_PORT: z.coerce.number().int().positive().default(3306),
  DB_NAME: z.string().default('scff'),
  DB_USER: z.string().default('scff_app'),
  DB_PASSWORD: z.string().default('scff_dev_password'),
  DB_POOL_MAX: z.coerce.number().int().positive().default(10),

  // Arsitektur awal: hanya 'dummy'/'console' yang diimplementasikan (PRD §13.5).
  WA_PROVIDER: z.enum(['console', 'fonnte', 'waba']).default('console'),
  PAYMENT_PROVIDER: z.enum(['dummy', 'midtrans', 'xendit']).default('dummy'),
  DUMMY_WEBHOOK_SECRET: z.string().min(8).default('dev-only-secret-change-me'),

  ENABLE_CRON: boolFromEnv,
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('[config] Konfigurasi environment tidak valid:');
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

export const config = Object.freeze(parsed.data);
export const isProduction = config.NODE_ENV === 'production';
