import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, TextInput, View } from 'react-native';

import { Card, MobileShell } from '@/components/mobile-shell';
import {
  formatPartnerMoney,
  formatPartnerStatus,
  LIVE_PARTNER_STATUSES,
  PartnerActionButton,
  PartnerEmpty,
  PartnerMetricCard,
  PartnerNotice,
  partnerStatusTone,
  StatusChip,
} from '@/components/restaurant-workflow';
import { BodyText, Kicker, ScreenTitle, SectionHeader } from '@/components/ui-kit';
import { TkimphPalette } from '@/constants/theme';
import { hasRestaurantOwnerSession, useAuthSession } from '@/hooks/use-auth-session';
import {
  fetchPartnerOrders,
  fetchPartnerOverview,
  fetchPartnerEarnings,
  fetchPartnerNotifications,
  fetchPartnerNotificationUnreadCount,
  markAllPartnerNotificationsRead,
  markPartnerNotificationRead,
  PartnerEarnings,
  PartnerNotification,
  PartnerOrder,
  PartnerOverview,
  PartnerRestaurant,
  updatePartnerRestaurantAvailability,
} from '@/lib/api';

function blurActiveElement() {
  if (Platform.OS !== 'web') return;
  const active = document.activeElement;
  if (active instanceof HTMLElement) active.blur();
}

function isToday(value?: string | null) {
  if (!value) return false;
  const date = new Date(value);
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
}

function storeStatusLabel(status: PartnerRestaurant['operating_status']) {
  if (status === 'open') return 'open';
  if (status === 'paused') return 'closed';
  return status.replace(/_/g, ' ');
}

export default function RestaurantScreen() {
  const auth = useAuthSession();
  const canView = auth.isRestaurantOwner;
  const [overview, setOverview] = useState<PartnerOverview | null>(null);
  const [orders, setOrders] = useState<PartnerOrder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [availabilityPending, setAvailabilityPending] = useState(false);
  const [pauseNote, setPauseNote] = useState('');
  const [earnings, setEarnings] = useState<PartnerEarnings | null>(null);
  const [notifications, setNotifications] = useState<PartnerNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const restaurant = overview?.restaurants[0] ?? null;
  const liveOrders = useMemo(() => orders.filter((order) => LIVE_PARTNER_STATUSES.includes(order.status as never)), [orders]);
  const pendingOrders = useMemo(() => orders.filter((order) => order.status === 'pending'), [orders]);
  const readyOrders = useMemo(() => orders.filter((order) => order.status === 'ready'), [orders]);
  const completedToday = useMemo(
    () => orders.filter((order) => order.status === 'completed' && isToday(order.placed_at)).length,
    [orders]
  );
  const todaySales = useMemo(
    () => orders.filter((order) => order.status === 'completed' && isToday(order.placed_at)).reduce((total, order) => total + Number(order.total || 0), 0),
    [orders]
  );

  const resetDashboard = useCallback(() => {
    setOverview(null);
    setOrders([]);
    setError(null);
    setMessage(null);
    setRefreshing(false);
    setAvailabilityPending(false);
    setPauseNote('');
    setEarnings(null);
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  const loadDashboard = useCallback(async (silent = false) => {
    if (!hasRestaurantOwnerSession()) {
      resetDashboard();
      return;
    }
    if (!silent) setRefreshing(true);
    try {
      const [nextOverview, nextOrders, nextEarnings, nextUnread, nextNotifications] = await Promise.all([
        fetchPartnerOverview(),
        fetchPartnerOrders(),
        fetchPartnerEarnings().catch(() => null),
        fetchPartnerNotificationUnreadCount().catch(() => ({ count: 0 })),
        fetchPartnerNotifications(5).catch(() => ({ data: [] })),
      ]);
      if (!hasRestaurantOwnerSession()) return;
      setOverview(nextOverview);
      setOrders(nextOrders.data);
      setEarnings(nextEarnings);
      setUnreadCount(nextUnread.count);
      setNotifications(nextNotifications.data);
      setError(null);
    } catch (err) {
      if (hasRestaurantOwnerSession()) setError(err instanceof Error ? err.message : 'Could not load restaurant dashboard.');
    } finally {
      if (hasRestaurantOwnerSession()) setRefreshing(false);
    }
  }, [resetDashboard]);

  useEffect(() => {
    if (!canView) {
      resetDashboard();
      return;
    }
    void loadDashboard();
    const timer = setInterval(() => void loadDashboard(true), 12000);
    return () => clearInterval(timer);
  }, [canView, loadDashboard, resetDashboard]);

  async function handleAvailability(nextStatus: 'open' | 'paused') {
    if (!restaurant || !hasRestaurantOwnerSession()) return;
    blurActiveElement();
    setAvailabilityPending(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await updatePartnerRestaurantAvailability(restaurant.id, {
        operating_status: nextStatus,
        operating_note: nextStatus === 'paused' ? pauseNote.trim() || 'Closed by restaurant owner.' : null,
      });
      if (!hasRestaurantOwnerSession()) return;
      setOverview((current) =>
        current
          ? {
              ...current,
              restaurants: current.restaurants.map((entry) => (entry.id === updated.id ? updated : entry)),
            }
          : current
      );
      setPauseNote('');
      setMessage(nextStatus === 'open' ? 'Store is open for orders.' : 'Store is closed.');
    } catch (err) {
      if (hasRestaurantOwnerSession()) setError(err instanceof Error ? err.message : 'Could not update store availability.');
    } finally {
      if (hasRestaurantOwnerSession()) setAvailabilityPending(false);
    }
  }

  async function markNotification(id: string) {
    if (!hasRestaurantOwnerSession()) return;
    try {
      await markPartnerNotificationRead(id);
      if (!hasRestaurantOwnerSession()) return;
      setNotifications((current) => current.map((item) => (item.id === id ? { ...item, read_at: new Date().toISOString() } : item)));
      setUnreadCount((current) => Math.max(0, current - 1));
    } catch (err) {
      if (hasRestaurantOwnerSession()) setError(err instanceof Error ? err.message : 'Could not mark notification as read.');
    }
  }

  async function markAllNotifications() {
    if (!hasRestaurantOwnerSession()) return;
    try {
      await markAllPartnerNotificationsRead();
      if (!hasRestaurantOwnerSession()) return;
      setNotifications((current) => current.map((item) => ({ ...item, read_at: item.read_at ?? new Date().toISOString() })));
      setUnreadCount(0);
    } catch (err) {
      if (hasRestaurantOwnerSession()) setError(err instanceof Error ? err.message : 'Could not mark notifications as read.');
    }
  }

  if (!canView) {
    return (
      <MobileShell>
        <Kicker>Restaurant app</Kicker>
        <ScreenTitle>Restaurant login required.</ScreenTitle>
        <BodyText>Sign in with an approved restaurant owner account in the Profile tab.</BodyText>
        <PartnerEmpty icon="storefront" title="This area is for restaurants" text="Customer and rider accounts use their own tabs." />
      </MobileShell>
    );
  }

  return (
    <MobileShell>
      <View style={styles.hero}>
        <Kicker>Restaurant dashboard</Kicker>
        <ScreenTitle>Store operations</ScreenTitle>
        <BodyText>Manage store availability, readiness, and the live order picture from one place.</BodyText>
      </View>

      {error ? <PartnerNotice tone="danger" text={error} /> : null}
      {message ? <PartnerNotice tone="success" text={message} /> : null}

      {restaurant ? (
        <RestaurantStatusCard
          restaurant={restaurant}
          canSelfPause={overview?.settings?.partner_self_pause_enabled !== false}
          pauseNote={pauseNote}
          pending={availabilityPending}
          onNoteChange={setPauseNote}
          onPause={() => void handleAvailability('paused')}
          onResume={() => void handleAvailability('open')}
        />
      ) : (
        <PartnerEmpty icon="storefront" title="No store linked" text="This account does not have a restaurant linked yet." />
      )}

      <View style={styles.metrics}>
        <PartnerMetricCard label="Live orders" value={String(liveOrders.length)} icon="receipt-long" />
        <PartnerMetricCard label="Pending" value={String(pendingOrders.length)} icon="pending-actions" />
        <PartnerMetricCard label="Ready" value={String(readyOrders.length)} icon="shopping-bag" />
        <PartnerMetricCard label="Today sales" value={formatPartnerMoney(todaySales)} icon="payments" />
        <PartnerMetricCard label="Unread alerts" value={String(unreadCount)} icon="notifications" />
      </View>

      {earnings ? (
        <>
          <SectionHeader title="Money snapshot" action={`${earnings.order_count} completed`} />
          <Card>
            <View style={styles.moneyGrid}>
              <MoneyLine label="Gross sales" value={formatPartnerMoney(earnings.gross_sales)} />
              <MoneyLine label="Commission" value={formatPartnerMoney(earnings.platform_commission)} />
              <MoneyLine label="Delivery fees" value={formatPartnerMoney(earnings.delivery_fees)} />
              <MoneyLine label="Restaurant net" value={formatPartnerMoney(earnings.restaurant_net)} strong />
            </View>
          </Card>
        </>
      ) : null}

      <View style={styles.refreshRow}>
        <Text style={styles.refreshText}>{refreshing ? 'Refreshing restaurant board...' : `Completed today: ${completedToday}`}</Text>
        <PartnerActionButton compact tone="outline" icon="refresh" label="Refresh" disabled={refreshing} onPress={() => void loadDashboard(true)} />
      </View>

      <SectionHeader title="Needs attention" action={`${pendingOrders.length + readyOrders.length} open`} />
      {pendingOrders.length + readyOrders.length === 0 ? (
        <PartnerEmpty icon="check-circle" title="No urgent orders" text="Pending and ready orders will appear here automatically." />
      ) : (
        [...pendingOrders, ...readyOrders].slice(0, 4).map((order) => (
          <Card key={order.id}>
            <View style={styles.rowBetween}>
              <Text style={styles.orderTitle}>{order.order_number}</Text>
              <StatusChip tone={partnerStatusTone(order.status)}>{formatPartnerStatus(order.status)}</StatusChip>
            </View>
            <Text style={styles.meta}>{order.customer?.name || 'Customer'} | {order.delivery_mode}</Text>
            <Text style={styles.total}>{formatPartnerMoney(order.total)}</Text>
          </Card>
        ))
      )}

      <SectionHeader title="Notifications" action={unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'} />
      {notifications.length === 0 ? (
        <PartnerEmpty icon="notifications-none" title="No notifications" text="Admin and operations alerts will appear here." />
      ) : (
        <>
          {unreadCount > 0 ? (
            <View style={styles.markAllRow}>
              <PartnerActionButton compact tone="outline" icon="done-all" label="Mark all read" onPress={() => void markAllNotifications()} />
            </View>
          ) : null}
          {notifications.map((notification) => (
            <Card key={notification.id}>
              <View style={styles.rowBetween}>
                <Text style={styles.orderTitle}>{notification.data?.title || 'Restaurant notification'}</Text>
                <StatusChip tone={notification.read_at ? 'neutral' : 'blue'}>{notification.read_at ? 'read' : 'new'}</StatusChip>
              </View>
              <Text style={styles.meta}>{notification.data?.message || notification.data?.body || notification.type}</Text>
              {!notification.read_at ? (
                <View style={styles.cardActions}>
                  <PartnerActionButton compact tone="outline" icon="check" label="Mark read" onPress={() => void markNotification(notification.id)} />
                </View>
              ) : null}
            </Card>
          ))}
        </>
      )}
    </MobileShell>
  );
}

function MoneyLine({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.moneyLine}>
      <Text style={styles.moneyLabel}>{label}</Text>
      <Text style={[styles.moneyValue, strong && styles.moneyValueStrong]}>{value}</Text>
    </View>
  );
}

function RestaurantStatusCard({
  restaurant,
  canSelfPause,
  pauseNote,
  pending,
  onNoteChange,
  onPause,
  onResume,
}: {
  restaurant: PartnerRestaurant;
  canSelfPause: boolean;
  pauseNote: string;
  pending: boolean;
  onNoteChange: (text: string) => void;
  onPause: () => void;
  onResume: () => void;
}) {
  const isOpen = restaurant.operating_status === 'open';
  return (
    <Card>
      <View style={styles.rowBetween}>
        <View style={styles.flex}>
          <Text style={styles.storeName}>{restaurant.name}</Text>
          <Text style={styles.meta}>{restaurant.address || 'No address set'}</Text>
        </View>
        <StatusChip tone={isOpen ? 'green' : 'yellow'}>{storeStatusLabel(restaurant.operating_status)}</StatusChip>
      </View>
      <View style={styles.storeFacts}>
        <View style={styles.factRow}>
          <MaterialIcons color={restaurant.publicly_orderable ? TkimphPalette.green : '#92400E'} name="public" size={18} />
          <Text style={styles.factText}>{restaurant.publicly_orderable ? 'Public ordering enabled' : 'Public ordering unavailable'}</Text>
        </View>
        <View style={styles.factRow}>
          <MaterialIcons color={restaurant.readiness_status === 'ready' ? TkimphPalette.green : '#92400E'} name="fact-check" size={18} />
          <Text style={styles.factText}>{restaurant.readiness_status === 'ready' ? 'Ready for customers' : 'Needs setup before ordering'}</Text>
        </View>
      </View>
      {!canSelfPause ? <PartnerNotice tone="warning" text="Store open/close is locked by admin settings." /> : null}
      {canSelfPause && !isOpen ? (
        <PartnerActionButton label="Open store" icon="play-arrow" disabled={pending} onPress={onResume} />
      ) : null}
      {canSelfPause && isOpen ? (
        <View style={styles.pauseBox}>
          <TextInput
            placeholder="Reason for closing store (optional)"
            placeholderTextColor={TkimphPalette.muted}
            value={pauseNote}
            onChangeText={onNoteChange}
            style={styles.input}
          />
          <PartnerActionButton label="Close store" icon="storefront" tone="yellow" disabled={pending} onPress={onPause} />
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: 0,
  },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
  },
  refreshRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    marginTop: 16,
  },
  refreshText: {
    color: TkimphPalette.muted,
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
  },
  rowBetween: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  flex: {
    flex: 1,
  },
  storeName: {
    color: TkimphPalette.ink,
    fontSize: 19,
    fontWeight: '900',
  },
  meta: {
    color: TkimphPalette.muted,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    marginTop: 5,
  },
  storeFacts: {
    gap: 8,
    marginTop: 14,
  },
  factRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  factText: {
    color: TkimphPalette.ink,
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
  },
  pauseBox: {
    gap: 10,
    marginTop: 14,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E4E7EC',
    borderRadius: 12,
    borderWidth: 1,
    color: TkimphPalette.ink,
    fontSize: 14,
    minHeight: 46,
    paddingHorizontal: 12,
  },
  orderTitle: {
    color: TkimphPalette.ink,
    flex: 1,
    fontSize: 16,
    fontWeight: '900',
  },
  total: {
    color: TkimphPalette.ink,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 8,
  },
  moneyGrid: {
    gap: 10,
  },
  moneyLine: {
    alignItems: 'center',
    borderBottomColor: '#EEF2F6',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  moneyLabel: {
    color: TkimphPalette.muted,
    fontSize: 13,
    fontWeight: '800',
  },
  moneyValue: {
    color: TkimphPalette.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  moneyValueStrong: {
    color: TkimphPalette.green,
    fontSize: 16,
  },
  markAllRow: {
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
});
