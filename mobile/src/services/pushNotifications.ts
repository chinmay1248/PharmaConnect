import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { deleteJson, postJson } from './api';

type RegisterDeviceResponse = {
  device: {
    id: string;
    userId: string;
    platform: string;
  };
};

export type PushNotificationPayload = {
  referenceKind?: string | null;
  referenceId?: string | null;
  notificationId?: string | null;
};

let registeredDeviceToken: string | null = null;
let handlerConfigured = false;

// Expo web has no push service, so the browser session still registers a stable per-user token.
// It keeps the notification inbox and device list consistent across platforms.
function buildWebFallbackToken(userId: string) {
  return `web-local-${userId}`;
}

function resolvePlatform(): 'ios' | 'android' | 'web' | 'expo' {
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    return Platform.OS;
  }

  return 'web';
}

// Foreground notifications are shown as banners instead of being swallowed silently.
function configureForegroundHandler() {
  if (handlerConfigured) {
    return;
  }

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: false,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  handlerConfigured = true;
}

// Asks for permission and resolves the Expo push token for this device, or null when the platform
// cannot deliver push messages (simulators, Expo web, or a declined permission prompt).
async function resolveExpoPushToken() {
  if (Platform.OS === 'web' || !Device.isDevice) {
    return null;
  }

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;

  if (status !== 'granted') {
    status = (await Notifications.requestPermissionsAsync()).status;
  }

  if (status !== 'granted') {
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Order updates',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  const token = await Notifications.getExpoPushTokenAsync();
  return token.data;
}

// Registers the current device against the signed-in user so the backend can push order updates.
export async function registerPushDevice(userId: string) {
  configureForegroundHandler();

  let deviceToken: string;
  let platform = resolvePlatform();

  try {
    const expoToken = await resolveExpoPushToken();

    if (expoToken) {
      deviceToken = expoToken;
    } else {
      deviceToken = buildWebFallbackToken(userId);
      platform = 'web';
    }
  } catch {
    deviceToken = buildWebFallbackToken(userId);
    platform = 'web';
  }

  try {
    await postJson<RegisterDeviceResponse, { userId: string; deviceToken: string; platform: typeof platform }>(
      '/notifications/devices',
      { userId, deviceToken, platform },
    );
    registeredDeviceToken = deviceToken;
    return deviceToken;
  } catch {
    // Push is an enhancement; the in-app inbox still works when registration fails.
    return null;
  }
}

// Detaches this device on sign-out so the next account does not inherit the previous user's pushes.
export async function unregisterPushDevice() {
  if (!registeredDeviceToken) {
    return;
  }

  try {
    await deleteJson<{ removed: boolean }>(
      `/notifications/devices/${encodeURIComponent(registeredDeviceToken)}`,
    );
  } catch {
    // Ignore failures; the backend prunes tokens that the push service reports as invalid.
  } finally {
    registeredDeviceToken = null;
  }
}

// Subscribes to notification taps so the app can open the screen a push refers to.
export function subscribeToNotificationTaps(onOpen: (payload: PushNotificationPayload) => void) {
  configureForegroundHandler();

  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = (response.notification.request.content.data ?? {}) as PushNotificationPayload;
    onOpen({
      referenceKind: data.referenceKind ?? null,
      referenceId: data.referenceId ?? null,
      notificationId: data.notificationId ?? null,
    });
  });

  return () => subscription.remove();
}

// Subscribes to notifications that arrive while the app is open, for badge and inbox refreshes.
export function subscribeToForegroundNotifications(onReceive: () => void) {
  configureForegroundHandler();

  const subscription = Notifications.addNotificationReceivedListener(() => onReceive());

  return () => subscription.remove();
}
