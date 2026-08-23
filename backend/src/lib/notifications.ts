import type { NotificationType } from '@prisma/client';
import { prisma } from './prisma.js';
import { sendPushToUser } from './push.js';

type CreatedNotification = {
  id: string;
  userId: string;
  title: string;
  body: string;
  referenceKind: string | null;
  referenceId: string | null;
};

type NotificationClient = {
  notification: {
    create(args: {
      data: {
        userId: string;
        type: NotificationType;
        title: string;
        body: string;
        referenceKind?: string | null;
        referenceId?: string | null;
      };
    }): Promise<CreatedNotification>;
  };
};

type CreateNotificationInput = {
  userId: string | null | undefined;
  type: NotificationType;
  title: string;
  body: string;
  referenceKind?: string;
  referenceId?: string;
};

// Notifications are written inside the same transaction as the order change that caused them, so a
// push must not go out until that transaction has actually committed. Rather than block the
// transaction, the push waits for the row to become visible through the top-level client; if the
// transaction rolled back the row never appears and no push is sent.
const commitVisibilityAttempts = 4;
const commitVisibilityDelayMs = 250;

function delay(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function waitForCommittedNotification(notificationId: string) {
  for (let attempt = 0; attempt < commitVisibilityAttempts; attempt += 1) {
    await delay(commitVisibilityDelayMs);

    const committed = await prisma.notification.findUnique({
      where: { id: notificationId },
      select: { id: true },
    });

    if (committed) {
      return true;
    }
  }

  return false;
}

function schedulePush(notification: CreatedNotification) {
  void (async () => {
    try {
      if (!(await waitForCommittedNotification(notification.id))) {
        return;
      }

      await sendPushToUser({
        userId: notification.userId,
        title: notification.title,
        body: notification.body,
        referenceKind: notification.referenceKind,
        referenceId: notification.referenceId,
        notificationId: notification.id,
      });
    } catch (error) {
      console.error('[notifications] Failed to schedule push delivery', error);
    }
  })();
}

export async function createNotification(client: NotificationClient, input: CreateNotificationInput) {
  if (!input.userId) {
    return;
  }

  const notification = await client.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      referenceKind: input.referenceKind ?? null,
      referenceId: input.referenceId ?? null,
    },
  });

  schedulePush(notification);
}

export function shortOrderCode(orderId: string) {
  return orderId.slice(-6).toUpperCase();
}
