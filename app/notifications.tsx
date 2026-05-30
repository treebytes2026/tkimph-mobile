import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, MobileShell } from '@/components/mobile-shell';
import { BodyText, PrimaryButton, ScreenTitle } from '@/components/ui-kit';
import { TkimphPalette } from '@/constants/theme';
import { NotificationRecord, useNotifications } from '@/contexts/notification-context';

function targetPath(data: Record<string, unknown>) {
  const screen = typeof data.screen === 'string' ? data.screen : '';
  const orderId = typeof data.order_id === 'number' || typeof data.order_id === 'string' ? String(data.order_id) : '';
  if (screen === 'order' && orderId) return `/orders/${encodeURIComponent(orderId)}`;
  if (screen === 'partner_orders') return '/restaurant-orders';
  if (screen === 'rider_jobs') return '/rider-jobs';
  if (screen === 'restaurant_dashboard') return '/restaurant';
  return null;
}

function timeLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function NotificationsScreen() {
  const router = useRouter();
  const {
    enabled,
    permissionStatus,
    inbox,
    unreadCount,
    syncing,
    error,
    enablePushNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    clearNotifications,
  } = useNotifications();

  async function openNotification(item: NotificationRecord) {
    await markNotificationRead(item.id);
    const path = targetPath(item.data);
    if (path) router.push(path as never);
  }

  return (
    <MobileShell>
      <View style={styles.headerRow}>
        <Pressable accessibilityRole="button" hitSlop={8} onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons color={TkimphPalette.ink} name="arrow-back" size={22} />
        </Pressable>
        <View style={styles.headerText}>
          <ScreenTitle>Notifications</ScreenTitle>
          <BodyText>{unreadCount > 0 ? `${unreadCount} unread update${unreadCount === 1 ? '' : 's'}` : 'You are all caught up.'}</BodyText>
        </View>
      </View>

      <Card>
        <View style={styles.permissionHead}>
          <View style={[styles.permissionIcon, enabled ? styles.permissionIconOn : styles.permissionIconOff]}>
            <MaterialIcons color={enabled ? TkimphPalette.green : '#B45309'} name={enabled ? 'notifications-active' : 'notifications-off'} size={24} />
          </View>
          <View style={styles.permissionText}>
            <Text style={styles.permissionTitle}>{enabled ? 'Push notifications are on' : 'Enable push notifications'}</Text>
            <Text style={styles.permissionCopy}>
              {enabled
                ? 'Order, rider, and restaurant alerts can reach this device.'
                : permissionStatus === 'denied'
                  ? 'Notifications are blocked in system settings for this device.'
                  : 'Get order status, rider jobs, and restaurant alerts even when the app is closed.'}
            </Text>
          </View>
        </View>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {!enabled ? (
          <View style={styles.permissionAction}>
            <PrimaryButton
              disabled={syncing}
              icon="notifications"
              label={syncing ? 'Enabling...' : 'Enable notifications'}
              onPress={() => void enablePushNotifications()}
            />
          </View>
        ) : null}
      </Card>

      <View style={styles.actionRow}>
        <Pressable accessibilityRole="button" disabled={inbox.length === 0} onPress={() => void markAllNotificationsRead()} style={[styles.smallAction, inbox.length === 0 && styles.actionDisabled]}>
          <Text style={styles.smallActionText}>Mark all read</Text>
        </Pressable>
        <Pressable accessibilityRole="button" disabled={inbox.length === 0} onPress={() => void clearNotifications()} style={[styles.smallAction, inbox.length === 0 && styles.actionDisabled]}>
          <Text style={styles.smallActionText}>Clear</Text>
        </Pressable>
      </View>

      {inbox.length === 0 ? (
        <View style={styles.emptyCard}>
          <MaterialIcons color={TkimphPalette.muted} name="notifications-none" size={34} />
          <Text style={styles.emptyTitle}>No notifications yet</Text>
          <Text style={styles.emptyCopy}>Order and account updates will appear here after they arrive on this device.</Text>
        </View>
      ) : (
        inbox.map((item) => <NotificationItem key={item.id} item={item} onPress={() => void openNotification(item)} />)
      )}
    </MobileShell>
  );
}

function NotificationItem({ item, onPress }: { item: NotificationRecord; onPress: () => void }) {
  const unread = !item.readAt;
  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      <Card>
        <View style={styles.itemRow}>
          <View style={[styles.itemIcon, unread && styles.itemIconUnread]}>
            <MaterialIcons color={unread ? TkimphPalette.green : TkimphPalette.muted} name="notifications" size={21} />
          </View>
          <View style={styles.itemBody}>
            <View style={styles.itemTitleRow}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              {unread ? <View style={styles.unreadDot} /> : null}
            </View>
            <Text style={styles.itemBodyText}>{item.body}</Text>
            <Text style={styles.itemTime}>{timeLabel(item.receivedAt)}</Text>
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: TkimphPalette.line,
    borderRadius: 16,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    marginTop: 8,
    width: 42,
  },
  headerText: {
    flex: 1,
  },
  permissionHead: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  permissionIcon: {
    alignItems: 'center',
    borderRadius: 18,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  permissionIconOn: {
    backgroundColor: '#E8F3ED',
  },
  permissionIconOff: {
    backgroundColor: '#FEF3C7',
  },
  permissionText: {
    flex: 1,
  },
  permissionTitle: {
    color: TkimphPalette.ink,
    fontSize: 16,
    fontWeight: '900',
  },
  permissionCopy: {
    color: TkimphPalette.muted,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    marginTop: 4,
  },
  permissionAction: {
    marginTop: 14,
  },
  errorText: {
    color: '#B42318',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 10,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginVertical: 14,
  },
  smallAction: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: TkimphPalette.line,
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    minHeight: 42,
    justifyContent: 'center',
  },
  actionDisabled: {
    opacity: 0.45,
  },
  smallActionText: {
    color: TkimphPalette.green,
    fontSize: 13,
    fontWeight: '900',
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: TkimphPalette.line,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  emptyTitle: {
    color: TkimphPalette.ink,
    fontSize: 17,
    fontWeight: '900',
    marginTop: 10,
  },
  emptyCopy: {
    color: TkimphPalette.muted,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
    marginTop: 6,
    textAlign: 'center',
  },
  itemRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
  },
  itemIcon: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  itemIconUnread: {
    backgroundColor: '#E8F3ED',
  },
  itemBody: {
    flex: 1,
  },
  itemTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  itemTitle: {
    color: TkimphPalette.ink,
    flex: 1,
    fontSize: 15,
    fontWeight: '900',
  },
  unreadDot: {
    backgroundColor: TkimphPalette.yellow,
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  itemBodyText: {
    color: TkimphPalette.muted,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    marginTop: 4,
  },
  itemTime: {
    color: '#A3ACBA',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 8,
  },
});
