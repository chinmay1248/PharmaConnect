import { PrismaClient } from '@prisma/client';

// Shares one Prisma client across the backend so routes can reuse the same connection pool.
export const prisma = new PrismaClient();
