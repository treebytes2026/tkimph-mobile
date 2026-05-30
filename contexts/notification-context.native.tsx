import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

import {
  cacheExpoPushToken,
  getCachedExpoPushToken,
  getStoredToken,
  getStoredUser,
  registerExpoPushToken,
  subscribeAuthChanged,
} from '@/lib/api';

const INBOX_KEY = 'tkimph:notification-inbox:v1';
const INSTALLATION_ID_KEY = 'tkimph:installation-id';
const MAX_INBOX_ITEMS = 60;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export type NotificationRecord = {
  id: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  receivedAt: string;
  readAt: string | null;
};

type NotificationContextValue = {
  enabled: boolean;
  permissionStatus: Notifications.PermissionStatus | 'unknown';
  expoPushToken: string | null;
  inbox: NotificationRecord[];
  unreadCount: number;
  syncing: boolean;
  error: string | null;
  enablePushNotifications: () => Promise<void>;
  refreshPushToken: () => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  clearNotifications: () => Promise<void>;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

function notificationId(prefix = 'notif') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function installationId() {
  const existing = await AsyncStorage.getItem(INSTALLATION_ID_KEY);
  if (existing) return existing;
  const created = notificationId('install');
  await AsyncStorage.setItem(INSTALLATION_ID_KEY, created);
  return created;
}

function projectId() {
  return (
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID ||
    Constants.easConfig?.projectId ||
    (Constants.expoConfig?.extra?.eas as { projectId?: string } | undefined)?.projectId
  );
}

function normalizeNotification(notification: Notifications.Notification, readAt: string | null = null): NotificationRecord {
  const content = notification.request.content;
  const data = (content.data ?? {}) as Record<string, unknown>;
  return {
    id: notification.request.identifier || notificationId(),
    title: content.title || 'TKimph update',
    body: content.body || 'Open TKimph for the latest details.',
    data,
    receivedAt: new Date().toISOString(),
    readAt,
  };
}

function routeFromData(data: Record<string, unknown>): string {
  const screen = typeof data.screen === 'string' ? data.screen : '';
  const orderId = typeof data.order_id === 'number' || typeof data.order_id === 'string' ? String(data.order_id) : '';

  if (screen === 'order' && orderId) return `/orders/${encodeURIComponent(orderId)}`;
  if (screen === 'partner_orders') return '/restaurant-orders';
  if (screen === 'rider_jobs') return '/rider-jobs';
  if (screen === 'restaurant_dashboard') return '/restaurant';
  return '/notifications';
}

async function loadInbox() {
  try {
    const raw = await AsyncStorage.getItem(INBOX_KEY);
    const parsed = raw ? (JSON.parse(raw) as NotificationRecord[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveInbox(items: NotificationRecord[]) {
  await AsyncStorage.setItem(INBOX_KEY, JSON.stringify(items.slice(0, MAX_INBOX_ITEMS)));
}

export function NotificationProvider({ children }: PropsWithChildren) {
  const router = useRouter();
  const [permissionStatus, setPermissionStatus] = useState<NotificationContextValue['permissionStatus']>('unknown');
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [inbox, setInbox] = useState<NotificationRecord[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unreadCount = useMemo(() => inbox.filter((item) => !item.readAt).length, [inbox]);
  const enabled = permissionStatus === Notifications.PermissionStatus.GRANTED && Boolean(expoPushToken);

  const upsertInbox = useCallback(async (record: NotificationRecord) => {
    setInbox((current) => {
      const next = [record, ...current.filter((item) => item.id !== record.id)].slice(0, MAX_INBOX_ITEMS);
      saveInbox(next).catch(() => undefined);
      return next;
    });
  }, []);

  const syncToken = useCallback(async (promptForPermission: boolean) => {
    setSyncing(true);
    setError(null);
    try {
      if (Platform.OS === 'web') {
        setPermissionStatus('unknown');
        setError('Push notifications are available in native Android and iOS builds.');
        return;
      }

      if (!Device.isDevice) {
        setPermissionStatus('unknown');
        setError('Use a physical device to receive push notifications.');
        return;
      }

      const currentPermission = await Notifications.getPermissionsAsync();
      let finalStatus = currentPermission.status;
      if (finalStatus !== Notifications.PermissionStatus.GRANTED && promptForPermission) {
        const requested = await Notifications.requestPermissionsAsync();
        finalStatus = requested.status;
      }

      setPermissionStatus(finalStatus);
      if (finalStatus !== Notifications.PermissionStatus.GRANTED) {
        setError('Notification permission is not enabled for this device.');
        return;
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('orders', {
          name: 'Order updates',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#1E8544',
        });
      }

      const expoProjectId = projectId();
      const tokenResult = await Notifications.getExpoPushTokenAsync(expoProjectId ? { projectId: expoProjectId } : undefined);
      const token = tokenResult.data;
      setExpoPushToken(token);
      await cacheExpoPushToken(token);

      if (getStoredToken() && getStoredUser()) {
        await registerExpoPushToken({
          expo_push_token: token,
          platform: Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : 'web',
          device_id: await installationId(),
          device_name: Device.deviceName || Device.modelName || null,
          app_version: Constants.expoConfig?.version ?? null,
          enabled: true,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not enable push notifications.');
    } finally {
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    loadInbox().then(setInbox).catch(() => undefined);
    getCachedExpoPushToken().then(setExpoPushToken).catch(() => undefined);
    Notifications.getPermissionsAsync()
      .then((permission) => setPermissionStatus(permission.status))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    return subscribeAuthChanged(() => {
      if (!getStoredToken()) {
        setExpoPushToken(null);
        return;
      }
      Notifications.getPermissionsAsync()
        .then((permission) => {
          setPermissionStatus(permission.status);
          if (permission.status === Notifications.PermissionStatus.GRANTED) {
            void syncToken(false);
          }
        })
        .catch(() => undefined);
    });
  }, [syncToken]);

  useEffect(() => {
    const received = Notifications.addNotificationReceivedListener((notification) => {
      void upsertInbox(normalizeNotification(notification));
    });

    const responded = Notifications.addNotificationResponseReceivedListener((response) => {
      const record = normalizeNotification(response.notification, new Date().toISOString());
      void upsertInbox(record);
      router.push(routeFromData(record.data) as never);
    });

    return () => {
      received.remove();
      responded.remove();
    };
  }, [router, upsertInbox]);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      Notifications.setBadgeCountAsync(unreadCount).catch(() => undefined);
    }
  }, [unreadCount]);

  const value = useMemo<NotificationContextValue>(
    () => ({
      enabled,
      permissionStatus,
      expoPushToken,
      inbox,
      unreadCount,
      syncing,
      error,
      enablePushNotifications: () => syncToken(true),
      refreshPushToken: () => syncToken(false),
      markNotificationRead: async (id: string) => {
        const next = inbox.map((item) => (item.id === id ? { ...item, readAt: item.readAt ?? new Date().toISOString() } : item));
        setInbox(next);
        await saveInbox(next);
      },
      markAllNotificationsRead: async () => {
        const readAt = new Date().toISOString();
        const next = inbox.map((item) => ({ ...item, readAt: item.readAt ?? readAt }));
        setInbox(next);
        await saveInbox(next);
      },
      clearNotifications: async () => {
        setInbox([]);
        await saveInbox([]);
      },
    }),
    [enabled, error, expoPushToken, inbox, permissionStatus, syncToken, syncing, unreadCount]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const value = useContext(NotificationContext);
  if (!value) throw new Error('useNotifications must be used inside NotificationProvider');
  return value;
}
