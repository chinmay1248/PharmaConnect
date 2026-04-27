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

const createCustomerAddressSchema = z.object({
  label: z.string().min(2).max(40).optional(),
  line1: z.string().min(3),
  line2: z.string().min(2).max(120).optional(),
  area: z.string().min(2),
  city: z.string().min(2),
  state: z.string().min(2),
  postalCode: z.string().min(4).max(10),
  isDefault: z.boolean().optional(),
});

const updateCustomerAddressSchema = z
  .object({
    label: z.string().min(2).max(40).nullable().optional(),
    line1: z.string().min(3).optional(),
    line2: z.string().min(2).max(120).nullable().optional(),
    area: z.string().min(2).optional(),
    city: z.string().min(2).optional(),
    state: z.string().min(2).optional(),
    postalCode: z.string().min(4).max(10).optional(),
  })
  .refine((payload) => Object.values(payload).some((value) => value !== undefined), {
    message: 'At least one address field is required',
  });

function buildSessionToken(userId: string) {
  return Buffer.from(`${userId}:${Date.now()}`).toString('base64url');
}

function mapUserProfile(user: any) {
  return {
    id: user.id,
    role: user.role,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    addresses: user.addresses ?? [],
    retailerProfile: user.retailerProfile ?? null,
    wholesellerProfile: user.wholesellerProfile ?? null,
    companyProfile: user.companyProfile ?? null,
  };
}

async function loadUserProfile(userId: string) {
  const user: any = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      addresses: {
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      },
      retailerProfile: true,
      wholesellerProfile: true,
      companyProfile: true,
    },
  });

  if (!user) {
    throw new HttpError(404, 'User not found');
  }

  return user;
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
        user: mapUserProfile(user),
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
        user: mapUserProfile(user),
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
          addresses: {
            orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
          },
          retailerProfile: true,
          wholesellerProfile: true,
          companyProfile: true,
        },
      });

      if (!user) {
        throw new HttpError(404, 'User not found');
      }

      response.json({ user: mapUserProfile(user) });
    } catch (error) {
      mapPrismaError(error);
    }
  }),
);

// Adds a new saved customer address and can mark it as the default delivery address.
authRouter.post(
  '/users/:userId/addresses',
  asyncHandler(async (request, response) => {
    const userId = String(request.params.userId);
    const payload = createCustomerAddressSchema.parse(request.body ?? {});

    try {
      await prisma.$transaction(async (transaction: any) => {
        const user = await transaction.user.findUnique({
          where: { id: userId },
          include: {
            addresses: true,
          },
        });

        if (!user || user.role !== 'CUSTOMER') {
          throw new HttpError(404, 'Customer not found');
        }

        const shouldSetDefault = payload.isDefault === true || user.addresses.length === 0;

        if (shouldSetDefault) {
          await transaction.address.updateMany({
            where: {
              userId,
              isDefault: true,
            },
            data: {
              isDefault: false,
            },
          });
        }

        await transaction.address.create({
          data: {
            userId,
            type: 'HOME',
            label: payload.label ?? null,
            line1: payload.line1,
            line2: payload.line2 ?? null,
            area: payload.area,
            city: payload.city,
            state: payload.state,
            postalCode: payload.postalCode,
            isDefault: shouldSetDefault,
          },
        });
      });

      const user = await loadUserProfile(userId);
      response.status(201).json({ user: mapUserProfile(user) });
    } catch (error) {
      mapPrismaError(error);
    }
  }),
);

// Updates one saved customer address.
authRouter.patch(
  '/users/:userId/addresses/:addressId',
  asyncHandler(async (request, response) => {
    const userId = String(request.params.userId);
    const addressId = String(request.params.addressId);
    const payload = updateCustomerAddressSchema.parse(request.body ?? {});

    try {
      await prisma.$transaction(async (transaction: any) => {
        const user = await transaction.user.findUnique({
          where: { id: userId },
          select: { id: true, role: true },
        });

        if (!user || user.role !== 'CUSTOMER') {
          throw new HttpError(404, 'Customer not found');
        }

        const existingAddress = await transaction.address.findFirst({
          where: {
            id: addressId,
            userId,
          },
        });

        if (!existingAddress) {
          throw new HttpError(404, 'Address not found');
        }

        await transaction.address.update({
          where: { id: addressId },
          data: {
            ...(payload.label !== undefined ? { label: payload.label ?? null } : {}),
            ...(payload.line1 !== undefined ? { line1: payload.line1 } : {}),
            ...(payload.line2 !== undefined ? { line2: payload.line2 ?? null } : {}),
            ...(payload.area !== undefined ? { area: payload.area } : {}),
            ...(payload.city !== undefined ? { city: payload.city } : {}),
            ...(payload.state !== undefined ? { state: payload.state } : {}),
            ...(payload.postalCode !== undefined ? { postalCode: payload.postalCode } : {}),
          },
        });
      });

      const user = await loadUserProfile(userId);
      response.json({ user: mapUserProfile(user) });
    } catch (error) {
      mapPrismaError(error);
    }
  }),
);

// Marks one saved address as the default delivery address.
authRouter.patch(
  '/users/:userId/addresses/:addressId/default',
  asyncHandler(async (request, response) => {
    const userId = String(request.params.userId);
    const addressId = String(request.params.addressId);

    try {
      await prisma.$transaction(async (transaction: any) => {
        const user = await transaction.user.findUnique({
          where: { id: userId },
          select: { id: true, role: true },
        });

        if (!user || user.role !== 'CUSTOMER') {
          throw new HttpError(404, 'Customer not found');
        }

        const existingAddress = await transaction.address.findFirst({
          where: {
            id: addressId,
            userId,
          },
        });

        if (!existingAddress) {
          throw new HttpError(404, 'Address not found');
        }

        await transaction.address.updateMany({
          where: {
            userId,
            isDefault: true,
          },
          data: {
            isDefault: false,
          },
        });

        await transaction.address.update({
          where: { id: addressId },
          data: { isDefault: true },
        });
      });

      const user = await loadUserProfile(userId);
      response.json({ user: mapUserProfile(user) });
    } catch (error) {
      mapPrismaError(error);
    }
  }),
);

// Removes one saved customer address and keeps another address as default when available.
authRouter.delete(
  '/users/:userId/addresses/:addressId',
  asyncHandler(async (request, response) => {
    const userId = String(request.params.userId);
    const addressId = String(request.params.addressId);

    try {
      await prisma.$transaction(async (transaction: any) => {
        const user = await transaction.user.findUnique({
          where: { id: userId },
          select: { id: true, role: true },
        });

        if (!user || user.role !== 'CUSTOMER') {
          throw new HttpError(404, 'Customer not found');
        }

        const existingAddress = await transaction.address.findFirst({
          where: {
            id: addressId,
            userId,
          },
        });

        if (!existingAddress) {
          throw new HttpError(404, 'Address not found');
        }

        await transaction.address.delete({
          where: { id: addressId },
        });

        if (existingAddress.isDefault) {
          const fallbackAddress = await transaction.address.findFirst({
            where: {
              userId,
            },
            orderBy: [{ createdAt: 'asc' }],
          });

          if (fallbackAddress) {
            await transaction.address.update({
              where: { id: fallbackAddress.id },
              data: { isDefault: true },
            });
          }
        }
      });

      const user = await loadUserProfile(userId);
      response.json({ user: mapUserProfile(user) });
    } catch (error) {
      mapPrismaError(error);
    }
  }),
);
