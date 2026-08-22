import { env } from '../config/env.js';
import { prisma } from './prisma.js';

const expoPushEndpoint = 'https://exp.host/--/api/v2/push/send';

// Expo accepts up to 100 messages per request.
const maxMessagesPerRequest = 100;

type ExpoPushMessage = {
  to: string;
  title: string;
  body: string;
  sound: 'default';
  channelId: 'default';
  data: Record<string, string | null>;
};

type ExpoPushTicket = {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
};

export type PushDeliveryInput = {
  userId: string;
  title: string;
  body: string;
  referenceKind?: string | null;
  referenceId?: string | null;
  notificationId?: string | null;
};

// Expo push tokens look like ExponentPushToken[xxxxx]. Browser sessions register a local
// placeholder token instead, which must never be sent to the push service.
function isExpoPushToken(token: string) {
  return /^Expo(nent)?PushToken\[[^\]]+\]$/.test(token);
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

// Removes tokens the push service has rejected so they are not retried forever.
async function pruneInvalidTokens(tokens: string[]) {
  if (tokens.length === 0) {
    return;
  }

  try {
    await prisma.notificationDevice.deleteMany({
      where: { deviceToken: { in: tokens } },
    });
  } catch (error) {
    console.error('[push] Failed to prune invalid device tokens', error);
  }
}

async function sendChunk(messages: ExpoPushMessage[]) {
  const response = await fetch(expoPushEndpoint, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(env.EXPO_PUSH_ACCESS_TOKEN ? { Authorization: `Bearer ${env.EXPO_PUSH_ACCESS_TOKEN}` } : {}),
    },
    body: JSON.stringify(messages),
  });

  if (!response.ok) {
    throw new Error(`Expo push service responded with status ${response.status}`);
  }

  const payload = (await response.json()) as { data?: ExpoPushTicket[] };
  const tickets = payload.data ?? [];
  const invalidTokens: string[] = [];

  tickets.forEach((ticket, index) => {
    if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
      invalidTokens.push(messages[index].to);
    } else if (ticket.status === 'error') {
      console.warn('[push] Delivery error', ticket.message ?? ticket.details?.error);
    }
  });

  await pruneInvalidTokens(invalidTokens);
}

// Delivers one notification to every push-capable device the user has registered.
// Failures are logged and swallowed: the stored in-app notification is the source of truth, and a
// push outage must never roll back an order transaction.
export async function sendPushToUser(input: PushDeliveryInput) {
  if (!env.PUSH_DELIVERY_ENABLED) {
    return;
  }

  try {
    const devices = await prisma.notificationDevice.findMany({
      where: { userId: input.userId },
      select: { deviceToken: true },
    });

    const pushTokens = devices.map((device) => device.deviceToken).filter(isExpoPushToken);

    if (pushTokens.length === 0) {
      return;
    }

    const messages: ExpoPushMessage[] = pushTokens.map((token) => ({
      to: token,
      title: input.title,
      body: input.body,
      sound: 'default',
      channelId: 'default',
      data: {
        referenceKind: input.referenceKind ?? null,
        referenceId: input.referenceId ?? null,
        notificationId: input.notificationId ?? null,
      },
    }));

    for (const batch of chunk(messages, maxMessagesPerRequest)) {
      await sendChunk(batch);
    }
  } catch (error) {
    console.error('[push] Failed to deliver push notification', error);
  }
}
