import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/async-handler.js';
import { HttpError } from '../../lib/http-error.js';
import { hashPassword, verifyPassword } from '../../lib/password.js';
import { prisma } from '../../lib/prisma.js';
import { mapPrismaError } from '../../lib/responses.js';

export const authRouter = Router();

const customerSignupSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(10),
  password: z.string().min(6),
  address: z
    .object({
      line1: z.string().min(3),
      line2: z.string().optional(),
      area: z.string().min(2),
      city: z.string().min(2),
      state: z.string().min(2),
      postalCode: z.string().min(4),
    })
    .optional(),
});

const loginSchema = z.object({
  identifier: z.string().min(3),
  password: z.string().min(6),
});

function buildSessionToken(userId: string) {
  return Buffer.from(`${userId}:${Date.now()}`).toString('base64url');
}

// Creates a real customer account so the frontend can stop depending on mock-only signup state.
authRouter.post(
  '/signup/customer',
  asyncHandler(async (request, response) => {
    const payload = customerSignupSchema.parse(request.body);

    try {
      const passwordHash = await hashPassword(payload.password);

      const user = await prisma.user.create({
        data: {
          role: 'CUSTOMER',
          fullName: payload.fullName,
          email: payload.email.toLowerCase(),
          phone: payload.phone,
          passwordHash,
          addresses: payload.address
            ? {
                create: {
                  type: 'HOME',
                  isDefault: true,
                  ...payload.address,
                },
              }
            : undefined,
        },
        include: {
          addresses: true,
        },
      });

      response.status(201).json({
        token: buildSessionToken(user.id),
        user: {
          id: user.id,
          role: user.role,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          addresses: user.addresses,
        },
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }),
);

// Logs in an existing user by email or phone so every role can later reuse the same auth entrypoint.
authRouter.post(
  '/login',
  asyncHandler(async (request, response) => {
    const payload = loginSchema.parse(request.body);

    try {
      const user: any = await prisma.user.findFirst({
        where: {
          OR: [{ email: payload.identifier.toLowerCase() }, { phone: payload.identifier }],
        },
        include: {
          addresses: true,
          retailerProfile: true,
          wholesellerProfile: true,
          companyProfile: true,
        },
      });

      if (!user?.passwordHash) {
        throw new HttpError(401, 'Invalid credentials');
      }

      const passwordMatches = await verifyPassword(payload.password, user.passwordHash);

      if (!passwordMatches) {
        throw new HttpError(401, 'Invalid credentials');
      }

      response.json({
        token: buildSessionToken(user.id),
        user: {
          id: user.id,
          role: user.role,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          addresses: user.addresses,
          retailerProfile: user.retailerProfile,
          wholesellerProfile: user.wholesellerProfile,
          companyProfile: user.companyProfile,
        },
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }),
);

// Returns a lightweight user profile so the mobile app can restore a previous session.
authRouter.get(
  '/users/:userId',
  asyncHandler(async (request, response) => {
    const userId = String(request.params.userId);

    try {
      const user: any = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          addresses: true,
          retailerProfile: true,
          wholesellerProfile: true,
          companyProfile: true,
        },
      });

      if (!user) {
        throw new HttpError(404, 'User not found');
      }

      response.json({
        user: {
          id: user.id,
          role: user.role,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          addresses: user.addresses,
          retailerProfile: user.retailerProfile,
          wholesellerProfile: user.wholesellerProfile,
          companyProfile: user.companyProfile,
        },
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }),
);
