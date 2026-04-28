import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/async-handler.js';
import { HttpError } from '../../lib/http-error.js';
import { prisma } from '../../lib/prisma.js';
import { mapPrismaError } from '../../lib/responses.js';

export const notificationsRouter = Router();

const notificationQuerySchema = z.object({
  userId: z.string().min(1).optional(),
  unreadOnly: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const registerDeviceSchema = z.object({
  userId: z.string().min(1),
  deviceToken: z.string().min(8),
  platform: z.enum(['ios', 'android', 'web', 'expo']),
});

function pickQueryValue(value: unknown) {
  return Array.isArray(value) ? value[0] : value;
}

function pickParamValue(value: unknown) {
  return Array.isArray(value) ? value[0] : value;
}

function mapNotification(notification: any) {
  return {
    id: notification.id,
    userId: notification.userId,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    referenceKind: notification.referenceKind,
    referenceId: notification.referenceId,
    isRead: notification.isRead,
    createdAt: notification.createdAt,
  };
}

// Returns user notifications for mobile account/order screens and future push inbox views.
notificationsRouter.get(
  '/',
  asyncHandler(async (request, response) => {
    const query = notificationQuerySchema.parse({
      userId: pickQueryValue(request.query.userId),
      unreadOnly: pickQueryValue(request.query.unreadOnly),
      limit: pickQueryValue(request.query.limit),
    });

    try {
      const notifications = await prisma.notification.findMany({
        where: {
          userId: query.userId,
          isRead: query.unreadOnly ? false : undefined,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: query.limit ?? 40,
      });

      response.json({
        notifications: notifications.map(mapNotification),
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }),
);

// Convenience alias for fetching one user's notification inbox.
notificationsRouter.get(
  '/users/:userId',
  asyncHandler(async (request, response) => {
    const userId = String(pickParamValue(request.params.userId));
    const query = notificationQuerySchema.parse({
      unreadOnly: pickQueryValue(request.query.unreadOnly),
      limit: pickQueryValue(request.query.limit),
    });

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });

      if (!user) {
        throw new HttpError(404, 'User not found');
      }

      const notifications = await prisma.notification.findMany({
        where: {
          userId,
          isRead: query.unreadOnly ? false : undefined,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: query.limit ?? 40,
      });

      const unreadCount = await prisma.notification.count({
        where: {
          userId,
          isRead: false,
        },
      });

      response.json({
        userId,
        unreadCount,
        notifications: notifications.map(mapNotification),
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }),
);

// Registers or refreshes a device token; push delivery can later consume these stored devices.
notificationsRouter.post(
  '/devices',
  asyncHandler(async (request, response) => {
    const payload = registerDeviceSchema.parse(request.body ?? {});

    try {
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true },
      });

      if (!user) {
        throw new HttpError(404, 'User not found');
      }

      const device = await prisma.notificationDevice.upsert({
        where: {
          deviceToken: payload.deviceToken,
        },
        update: {
          userId: payload.userId,
          platform: payload.platform,
        },
        create: payload,
      });

      response.status(201).json({
        device: {
          id: device.id,
          userId: device.userId,
          platform: device.platform,
          createdAt: device.createdAt,
          updatedAt: device.updatedAt,
        },
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }),
);

// Marks a single notification as read.
notificationsRouter.patch(
  '/:notificationId/read',
  asyncHandler(async (request, response) => {
    const notificationId = String(pickParamValue(request.params.notificationId));

    try {
      const notification = await prisma.notification.update({
        where: { id: notificationId },
        data: { isRead: true },
      });

      response.json({
        notification: mapNotification(notification),
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }),
);

// Marks every notification for a user as read.
notificationsRouter.patch(
  '/users/:userId/read-all',
  asyncHandler(async (request, response) => {
    const userId = String(pickParamValue(request.params.userId));

    try {
      const result = await prisma.notification.updateMany({
        where: {
          userId,
          isRead: false,
        },
        data: {
          isRead: true,
        },
      });

      response.json({
        userId,
        updatedCount: result.count,
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }),
);
