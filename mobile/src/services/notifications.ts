import type { CustomerNotification } from '../screens/customer/customerTypes';
import { getJson, patchJson, postJson } from './api';

type BackendNotificationsResponse = {
  userId: string;
  unreadCount: number;
  notifications: CustomerNotification[];
};

type MarkAllReadResponse = {
  userId: string;
  updatedCount: number;
};

type MarkOneReadResponse = {
  notification: CustomerNotification;
};

type RegisterDeviceResponse = {
  device: {
    id: string;
    userId: string;
    platform: string;
    createdAt: string;
    updatedAt: string;
  };
};

function normalizeNotification(notification: CustomerNotification): CustomerNotification {
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    referenceKind: notification.referenceKind ?? null,
    referenceId: notification.referenceId ?? null,
    isRead: Boolean(notification.isRead),
    createdAt: notification.createdAt,
  };
}

export async function fetchCustomerNotifications(customerId: string, limit = 40) {
  const payload = await getJson<BackendNotificationsResponse>(
    `/notifications/users/${customerId}?limit=${limit}`,
  );

  return {
    unreadCount: payload.unreadCount,
    notifications: payload.notifications.map(normalizeNotification),
  };
}

export async function markCustomerNotificationsRead(customerId: string) {
  return patchJson<MarkAllReadResponse, Record<string, never>>(
    `/notifications/users/${customerId}/read-all`,
    {},
  );
}

export async function markCustomerNotificationRead(notificationId: string) {
  const payload = await patchJson<MarkOneReadResponse, Record<string, never>>(
    `/notifications/${notificationId}/read`,
    {},
  );

  return normalizeNotification(payload.notification);
}

export async function registerCustomerNotificationDevice(customerId: string) {
  return postJson<
    RegisterDeviceResponse,
    {
      userId: string;
      deviceToken: string;
      platform: 'web';
    }
  >('/notifications/devices', {
    userId: customerId,
    deviceToken: `web-local-${customerId}`,
    platform: 'web',
  });
}
