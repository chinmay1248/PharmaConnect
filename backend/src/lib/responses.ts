import { HttpError } from './http-error.js';

// Converts common Prisma failures into cleaner API errors the frontend can understand.
export function mapPrismaError(error: unknown) {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (message.includes('unique constraint')) {
      throw new HttpError(409, 'A record with the same unique field already exists.');
    }

    if (
      message.includes("can't reach database server") ||
      message.includes('database is not available') ||
      message.includes('failed to connect')
    ) {
      throw new HttpError(503, 'Database is not available yet. Start PostgreSQL and try again.');
    }
  }

  throw error;
}
