import { config } from 'dotenv';
import { z } from 'zod';

// Loads environment variables from .env before the backend starts.
config();

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  CLIENT_ORIGIN: z.string().default('http://localhost:8087'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
});

// Validates backend environment variables once and exports the typed result.
export const env = envSchema.parse(process.env);
