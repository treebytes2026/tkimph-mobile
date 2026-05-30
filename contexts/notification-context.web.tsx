import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const INBOX_KEY = 'tkimph:notification-inbox:v1';
const MAX_INBOX_ITEMS = 60;

export type NotificationRecord = {
  id: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  receivedAt: string;
  readAt: string | null;
};

type WebPermissionStatus = 'unknown' | 'granted' | 'denied' | 'undetermined';

type NotificationContextValue = {
  enabled: boolean;
  permissionStatus: WebPermissionStatus;
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
  const [inbox, setInbox] = useState<NotificationRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const unreadCount = useMemo(() => inbox.filter((item) => !item.readAt).length, [inbox]);

  useEffect(() => {
    loadInbox().then(setInbox).catch(() => undefined);
  }, []);

  const showNativeOnlyMessage = useCallback(async () => {
    setError('Push notifications are available in native Android and iOS builds.');
  }, []);

  const value = useMemo<NotificationContextValue>(
    () => ({
      enabled: false,
      permissionStatus: 'unknown',
      expoPushToken: null,
      inbox,
      unreadCount,
      syncing: false,
      error,
      enablePushNotifications: showNativeOnlyMessage,
      refreshPushToken: showNativeOnlyMessage,
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
    [error, inbox, showNativeOnlyMessage, unreadCount]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const value = useContext(NotificationContext);
  if (!value) throw new Error('useNotifications must be used inside NotificationProvider');
  return value;
}

