import { config } from 'dotenv';
import { z } from 'zod';

// Loads environment variables from .env before the backend starts.
config();

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  CLIENT_ORIGIN: z.string().default('http://localhost:8087'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  INVOICE_LINK_SECRET: z.string().optional(),
  STORAGE_PUBLIC_BASE_URL: z.string().url().optional(),
});

// Validates backend environment variables once and exports the typed result.
export const env = envSchema.parse(process.env);
