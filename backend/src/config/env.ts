import { config } from 'dotenv';
import { z } from 'zod';

// Loads environment variables from .env before the backend starts.
config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  CLIENT_ORIGIN: z.string().default('http://localhost:8081'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  SESSION_TOKEN_SECRET: z.string().min(16).optional(),
  SESSION_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(365).default(30),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  INVOICE_LINK_SECRET: z.string().optional(),
  STORAGE_PUBLIC_BASE_URL: z.string().url().optional(),
  S3_BUCKET_NAME: z.string().optional(),
  AWS_REGION: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  EXPO_PUSH_ACCESS_TOKEN: z.string().optional(),
  PUSH_DELIVERY_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
});

// Validates backend environment variables once and exports the typed result.
export const env = envSchema.parse(process.env);

// Production must never fall back to the shared development signing secret.
if (env.NODE_ENV === 'production' && !env.SESSION_TOKEN_SECRET) {
  throw new Error('SESSION_TOKEN_SECRET is required when NODE_ENV is production');
}
