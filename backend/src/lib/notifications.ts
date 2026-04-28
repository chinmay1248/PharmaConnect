import type { NotificationType } from '@prisma/client';

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
    }): Promise<unknown>;
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

export async function createNotification(client: NotificationClient, input: CreateNotificationInput) {
  if (!input.userId) {
    return;
  }

  await client.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      referenceKind: input.referenceKind ?? null,
      referenceId: input.referenceId ?? null,
    },
  });
}

export function shortOrderCode(orderId: string) {
  return orderId.slice(-6).toUpperCase();
}
