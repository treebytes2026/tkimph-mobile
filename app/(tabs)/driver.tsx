import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Location from 'expo-location';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Platform, StyleSheet, Text, View } from 'react-native';

import { Card, MobileShell } from '@/components/mobile-shell';
import {
  ActionButton,
  ActiveOrderCard,
  ACTIVE_STATUSES,
  distanceBetweenMeters,
  EmptyCard,
  GpsSample,
  GpsState,
  MetricCard,
  Notice,
  TrackingMapPanel,
} from '@/components/rider-workflow';
import { BodyText, Kicker, ScreenTitle, SectionHeader } from '@/components/ui-kit';
import { TkimphPalette } from '@/constants/theme';
import { hasRiderSession, useAuthSession } from '@/hooks/use-auth-session';
import {
  fetchRiderOrders,
  fetchRiderOverview,
  RiderOrder,
  RiderOverview,
  sendRiderLocationPing,
  setRiderAvailability,
  updateRiderOrderStatus,
} from '@/lib/api';

const GPS_MIN_SEND_INTERVAL_MS = 8000;
const GPS_MIN_DISTANCE_METERS = 8;

function blurActiveElement() {
  if (Platform.OS !== 'web') return;
  const active = document.activeElement;
  if (active instanceof HTMLElement) active.blur();
}

export default function DriverScreen() {
  const [overview, setOverview] = useState<RiderOverview | null>(null);
  const [assignedOrders, setAssignedOrders] = useState<RiderOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actingOrderId, setActingOrderId] = useState<number | null>(null);
  const [availabilityPending, setAvailabilityPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [exceptionNotes, setExceptionNotes] = useState<Record<number, string>>({});
  const [gpsState, setGpsState] = useState<GpsState>('idle');
  const [gpsSending, setGpsSending] = useState(false);
  const [currentGps, setCurrentGps] = useState<GpsSample | null>(null);
  const [lastGpsSentAt, setLastGpsSentAt] = useState<number | null>(null);

  const watchRef = useRef<Location.LocationSubscription | null>(null);
  const gpsInFlightRef = useRef(false);
  const queuedGpsRef = useRef<GpsSample | null>(null);
  const lastSentGpsRef = useRef<(GpsSample & { sentAt: number }) | null>(null);
  const liveOrderIdsRef = useRef<number[]>([]);

  const auth = useAuthSession();
  const canView = auth.isRider;
  const activeOrders = useMemo(
    () => assignedOrders.filter((order) => ACTIVE_STATUSES.includes(order.status)),
    [assignedOrders]
  );
  const trackedOrder = useMemo(
    () => activeOrders.find((order) => order.status === 'out_for_delivery') ?? activeOrders[0] ?? null,
    [activeOrders]
  );
  const liveOrderIds = useMemo(
    () => activeOrders.filter((order) => order.status === 'out_for_delivery').map((order) => order.id),
    [activeOrders]
  );

  const stopGpsTracking = useCallback(() => {
    watchRef.current?.remove();
    watchRef.current = null;
    gpsInFlightRef.current = false;
    queuedGpsRef.current = null;
    lastSentGpsRef.current = null;
    liveOrderIdsRef.current = [];
    setCurrentGps(null);
    setLastGpsSentAt(null);
    setGpsSending(false);
    setGpsState('idle');
  }, []);

  const resetRiderDashboard = useCallback(() => {
    setOverview(null);
    setAssignedOrders([]);
    setLoading(false);
    setRefreshing(false);
    setActingOrderId(null);
    setAvailabilityPending(false);
    setError(null);
    setMessage(null);
    setExceptionNotes({});
    stopGpsTracking();
  }, [stopGpsTracking]);

  const loadDashboard = useCallback(async (silent = false) => {
    if (!hasRiderSession()) {
      resetRiderDashboard();
      return;
    }
    if (!silent) setLoading(true);
    setRefreshing(true);
    try {
      const [nextOverview, nextAssigned] = await Promise.all([fetchRiderOverview(), fetchRiderOrders()]);
      if (!hasRiderSession()) return;
      setOverview(nextOverview);
      setAssignedOrders(nextAssigned.data);
      setError(null);
    } catch (err) {
      if (hasRiderSession()) {
        setError(err instanceof Error ? err.message : 'Could not load rider dashboard.');
      }
    } finally {
      if (hasRiderSession()) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [resetRiderDashboard]);

  const pushLiveLocation = useCallback(async (sample: GpsSample, force = false) => {
    if (!hasRiderSession()) {
      stopGpsTracking();
      return;
    }
    const targetOrderIds = liveOrderIdsRef.current;
    if (targetOrderIds.length === 0) return;

    const now = Date.now();
    const lastSent = lastSentGpsRef.current;
    const movedEnough = !lastSent || distanceBetweenMeters(lastSent, sample) >= GPS_MIN_DISTANCE_METERS;
    const waitedLongEnough = !lastSent || now - lastSent.sentAt >= GPS_MIN_SEND_INTERVAL_MS;
    if (!force && !movedEnough && !waitedLongEnough) return;

    if (gpsInFlightRef.current) {
      queuedGpsRef.current = sample;
      return;
    }

    gpsInFlightRef.current = true;
    setGpsSending(true);
    try {
      if (!hasRiderSession()) return;
      const results = await Promise.allSettled(
        targetOrderIds.map((orderId) =>
          sendRiderLocationPing(orderId, {
            latitude: sample.latitude,
            longitude: sample.longitude,
            accuracy_meters: sample.accuracy_meters,
          })
        )
      );
      if (!hasRiderSession()) return;
      const succeeded = results.some((result) => result.status === 'fulfilled');
      if (!succeeded) {
        const failed = results.find((result) => result.status === 'rejected');
        if (failed?.status === 'rejected') throw failed.reason;
      }
      lastSentGpsRef.current = { ...sample, sentAt: now };
      setLastGpsSentAt(now);
      setGpsState('live');
      setError(null);
    } catch (err) {
      if (hasRiderSession()) {
        setGpsState('blocked');
        setError(err instanceof Error ? err.message : 'Could not send live GPS location.');
      }
    } finally {
      gpsInFlightRef.current = false;
      if (hasRiderSession()) setGpsSending(false);
      const queued = queuedGpsRef.current;
      queuedGpsRef.current = null;
      if (queued && hasRiderSession()) void pushLiveLocation(queued, true);
    }
  }, [stopGpsTracking]);

  useEffect(() => {
    if (!canView) {
      resetRiderDashboard();
      return;
    }
    void loadDashboard();
    const timer = setInterval(() => void loadDashboard(true), 12000);
    return () => clearInterval(timer);
  }, [canView, loadDashboard, resetRiderDashboard]);

  useEffect(() => {
    liveOrderIdsRef.current = liveOrderIds;
  }, [liveOrderIds]);

  useEffect(() => {
    let disposed = false;

    async function startGps() {
      if (!canView || liveOrderIds.length === 0) {
        stopGpsTracking();
        return;
      }

      setGpsState('starting');
      const permission = await Location.requestForegroundPermissionsAsync();
      if (disposed) return;
      if (!hasRiderSession()) {
        stopGpsTracking();
        return;
      }
      if (permission.status !== Location.PermissionStatus.GRANTED) {
        setGpsState('blocked');
        setError('GPS permission is required for live rider tracking.');
        return;
      }

      const handleSample = (coords: Location.LocationObjectCoords, force = false) => {
        const sample = {
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy_meters: coords.accuracy,
        };
        setCurrentGps(sample);
        void pushLiveLocation(sample, force);
      };

      try {
        const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        if (!hasRiderSession()) {
          stopGpsTracking();
          return;
        }
        if (!disposed) handleSample(current.coords, true);
        watchRef.current?.remove();
        watchRef.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            distanceInterval: GPS_MIN_DISTANCE_METERS,
            timeInterval: GPS_MIN_SEND_INTERVAL_MS,
          },
          (position) => handleSample(position.coords)
        );
      } catch (err) {
        if (hasRiderSession()) {
          setGpsState('blocked');
          setError(err instanceof Error ? err.message : 'GPS permission is required for live rider tracking.');
        }
      }
    }

    void startGps();
    return () => {
      disposed = true;
    };
  }, [canView, liveOrderIds, pushLiveLocation, stopGpsTracking]);

  useEffect(() => {
    return () => {
      watchRef.current?.remove();
    };
  }, []);

  async function handleToggleAvailability() {
    if (!overview || !hasRiderSession()) return;
    blurActiveElement();
    setAvailabilityPending(true);
    setMessage(null);
    try {
      const next = !overview.rider.is_active;
      const result = await setRiderAvailability(next);
      if (!hasRiderSession()) return;
      setOverview((current) => (current ? { ...current, rider: { ...current.rider, is_active: result.is_active } } : current));
      setMessage(result.is_active ? 'You are online and ready for orders.' : 'You are offline.');
    } catch (err) {
      if (hasRiderSession()) setError(err instanceof Error ? err.message : 'Could not update availability.');
    } finally {
      if (hasRiderSession()) setAvailabilityPending(false);
    }
  }

  async function handleStatus(order: RiderOrder, status: string, note?: string | null) {
    if (!hasRiderSession()) return;
    blurActiveElement();
    setActingOrderId(order.id);
    setMessage(null);
    try {
      const result = await updateRiderOrderStatus(order.id, status, note);
      if (!hasRiderSession()) return;
      setMessage(`${result.order.order_number} updated.`);
      await loadDashboard(true);
    } catch (err) {
      if (hasRiderSession()) setError(err instanceof Error ? err.message : 'Could not update order status.');
    } finally {
      if (hasRiderSession()) setActingOrderId(null);
    }
  }

  function callPhone(phone?: string | null) {
    if (!phone) return;
    blurActiveElement();
    Linking.openURL(`tel:${phone}`).catch(() => setError('Could not open phone dialer.'));
  }

  if (!canView) {
    return (
      <MobileShell>
        <Kicker>Rider operations</Kicker>
        <ScreenTitle>Rider login required.</ScreenTitle>
        <BodyText>Sign in with an approved rider account in the Profile tab to claim and deliver orders.</BodyText>
        <Card>
          <MaterialIcons color={TkimphPalette.primary} name="delivery-dining" size={34} />
          <Text style={styles.emptyTitle}>This area is for riders</Text>
          <Text style={styles.emptyText}>Customer accounts can continue using Home, Browse, Orders, and Profile.</Text>
        </Card>
      </MobileShell>
    );
  }

  return (
    <MobileShell>
      <View style={styles.hero}>
        <View style={styles.heroText}>
          <Kicker>Rider dashboard</Kicker>
          <ScreenTitle>Current delivery</ScreenTitle>
          <BodyText>Go online, track your active route, and update delivery progress from one place.</BodyText>
        </View>
        <ActionButton
          label={overview?.rider.is_active ? 'Go offline' : 'Go online'}
          icon={overview?.rider.is_active ? 'power-settings-new' : 'bolt'}
          tone={overview?.rider.is_active ? 'yellow' : 'green'}
          disabled={availabilityPending || !overview}
          onPress={handleToggleAvailability}
        />
      </View>

      {error ? <Notice tone="danger" text={error} /> : null}
      {message ? <Notice tone="success" text={message} /> : null}

      <View style={styles.metrics}>
        <MetricCard label="Availability" value={loading ? '...' : overview?.rider.is_active ? 'Online' : 'Offline'} icon="two-wheeler" />
        <MetricCard label="Active" value={String(overview?.active_orders_count ?? 0)} icon="local-shipping" />
        <MetricCard label="Done today" value={String(overview?.completed_today_count ?? 0)} icon="check-circle" />
        <MetricCard label="GPS" value={gpsState === 'live' ? 'Live' : gpsState === 'blocked' ? 'Blocked' : 'Idle'} icon="gps-fixed" />
      </View>

      <View style={styles.refreshRow}>
        <Text style={styles.refreshText}>{refreshing ? 'Refreshing rider board...' : 'Dashboard updates automatically'}</Text>
        <ActionButton label="Refresh" icon="refresh" tone="outline" disabled={refreshing} onPress={() => void loadDashboard(true)} compact />
      </View>

      <TrackingMapPanel
        gpsState={gpsState}
        gpsSending={gpsSending}
        lastGpsSentAt={lastGpsSentAt}
        order={trackedOrder}
        sample={currentGps}
      />

      <SectionHeader title="Active delivery" action={activeOrders.length ? `${activeOrders.length} active` : 'Clear'} />
      {activeOrders.length === 0 ? (
        <EmptyCard icon="assignment-turned-in" title="No active delivery" text="Open Jobs to claim an available order when you are ready." />
      ) : (
        activeOrders.map((order) => (
          <ActiveOrderCard
            key={order.id}
            order={order}
            acting={actingOrderId === order.id}
            gpsState={gpsState}
            gpsSending={gpsSending}
            exceptionNote={exceptionNotes[order.id] ?? ''}
            onExceptionNoteChange={(text) => setExceptionNotes((current) => ({ ...current, [order.id]: text }))}
            onCallCustomer={() => callPhone(order.customer?.phone)}
            onCallRestaurant={() => callPhone(order.restaurant?.phone)}
            onUpdate={(nextStatus) => void handleStatus(order, nextStatus)}
            onFail={() => void handleStatus(order, 'failed', exceptionNotes[order.id]?.trim() || 'Marked failed by rider.')}
            onUndeliverable={() => void handleStatus(order, 'undeliverable', exceptionNotes[order.id]?.trim() || 'Marked undeliverable by rider.')}
          />
        ))
      )}
    </MobileShell>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: 14,
  },
  heroText: {
    gap: 0,
  },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 18,
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
    fontWeight: '700',
  },
  emptyTitle: {
    color: TkimphPalette.ink,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 12,
  },
  emptyText: {
    color: TkimphPalette.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
});
