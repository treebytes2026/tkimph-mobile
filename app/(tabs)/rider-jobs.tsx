import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card, MobileShell } from '@/components/mobile-shell';
import { ACTIVE_STATUSES, AvailableJobCard, EmptyCard, Notice } from '@/components/rider-workflow';
import { BodyText, Kicker, ScreenTitle, SectionHeader } from '@/components/ui-kit';
import { TkimphPalette } from '@/constants/theme';
import { hasRiderSession, useAuthSession } from '@/hooks/use-auth-session';
import { claimRiderOrder, fetchAvailableRiderOrders, fetchRiderOrders, RiderOrder } from '@/lib/api';

export default function RiderJobsScreen() {
  const [availableOrders, setAvailableOrders] = useState<RiderOrder[]>([]);
  const [assignedOrders, setAssignedOrders] = useState<RiderOrder[]>([]);
  const [actingOrderId, setActingOrderId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const auth = useAuthSession();
  const canView = auth.isRider;
  const activeOrders = useMemo(
    () => assignedOrders.filter((order) => ACTIVE_STATUSES.includes(order.status)),
    [assignedOrders]
  );
  const canClaimNewOrder = activeOrders.length === 0;

  const resetJobs = useCallback(() => {
    setAvailableOrders([]);
    setAssignedOrders([]);
    setActingOrderId(null);
    setRefreshing(false);
    setError(null);
    setMessage(null);
  }, []);

  const loadJobs = useCallback(async () => {
    if (!hasRiderSession()) {
      resetJobs();
      return;
    }
    setRefreshing(true);
    try {
      const [assigned, available] = await Promise.all([fetchRiderOrders(), fetchAvailableRiderOrders()]);
      if (!hasRiderSession()) return;
      setAssignedOrders(assigned.data);
      setAvailableOrders(available.data);
      setError(null);
    } catch (err) {
      if (hasRiderSession()) setError(err instanceof Error ? err.message : 'Could not load available jobs.');
    } finally {
      if (hasRiderSession()) setRefreshing(false);
    }
  }, [resetJobs]);

  useEffect(() => {
    if (!canView) {
      resetJobs();
      return;
    }
    void loadJobs();
    const timer = setInterval(() => void loadJobs(), 12000);
    return () => clearInterval(timer);
  }, [canView, loadJobs, resetJobs]);

  async function handleClaim(order: RiderOrder) {
    if (!hasRiderSession()) return;
    setActingOrderId(order.id);
    setMessage(null);
    try {
      const result = await claimRiderOrder(order.id);
      if (!hasRiderSession()) return;
      setMessage(`${result.order.order_number} claimed successfully.`);
      await loadJobs();
    } catch (err) {
      if (hasRiderSession()) setError(err instanceof Error ? err.message : 'Could not claim order.');
    } finally {
      if (hasRiderSession()) setActingOrderId(null);
    }
  }

  if (!canView) {
    return (
      <MobileShell>
        <Kicker>Rider jobs</Kicker>
        <ScreenTitle>Rider login required.</ScreenTitle>
        <BodyText>Sign in with an approved rider account to view the dispatch queue.</BodyText>
      </MobileShell>
    );
  }

  return (
    <MobileShell>
      <View style={styles.hero}>
        <Kicker>Dispatch queue</Kicker>
        <ScreenTitle>Available jobs</ScreenTitle>
        <BodyText>Claim one delivery at a time. New available orders refresh automatically.</BodyText>
      </View>

      {error ? <Notice tone="danger" text={error} /> : null}
      {message ? <Notice tone="success" text={message} /> : null}
      {!canClaimNewOrder ? <Notice tone="warning" text="Finish your active delivery before claiming another job." /> : null}

      <Card>
        <View style={styles.queueHeader}>
          <MaterialIcons color={canClaimNewOrder ? TkimphPalette.green : '#92400E'} name={canClaimNewOrder ? 'bolt' : 'lock'} size={26} />
          <View style={styles.queueText}>
            <Text style={styles.queueTitle}>{canClaimNewOrder ? 'Ready to claim' : 'Queue locked'}</Text>
            <Text style={styles.queueCopy}>
              {canClaimNewOrder ? `${availableOrders.length} jobs waiting in the pool.` : 'Your current active delivery keeps new claims disabled.'}
            </Text>
          </View>
        </View>
      </Card>

      <SectionHeader title="Open jobs" action={refreshing ? 'Refreshing' : `${availableOrders.length} waiting`} />
      {availableOrders.length === 0 ? (
        <EmptyCard icon="inventory" title="No available jobs" text="New unassigned orders will appear here automatically." />
      ) : (
        availableOrders.map((order) => (
          <AvailableJobCard
            key={order.id}
            order={order}
            acting={actingOrderId === order.id}
            canClaim={canClaimNewOrder}
            onClaim={() => void handleClaim(order)}
          />
        ))
      )}
    </MobileShell>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: 0,
  },
  queueHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  queueText: {
    flex: 1,
  },
  queueTitle: {
    color: TkimphPalette.ink,
    fontSize: 17,
    fontWeight: '900',
  },
  queueCopy: {
    color: TkimphPalette.muted,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 3,
  },
});
