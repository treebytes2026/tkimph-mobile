import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { MobileShell } from '@/components/mobile-shell';
import { EmptyCard, formatMoney, HISTORY_STATUSES, HistoryOrderCard, MetricCard, Notice } from '@/components/rider-workflow';
import { BodyText, Kicker, ScreenTitle, SectionHeader } from '@/components/ui-kit';
import { hasRiderSession, useAuthSession } from '@/hooks/use-auth-session';
import { fetchRiderOrders, RiderOrder } from '@/lib/api';

export default function RiderHistoryScreen() {
  const [orders, setOrders] = useState<RiderOrder[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const auth = useAuthSession();
  const canView = auth.isRider;
  const historyOrders = useMemo(
    () => orders.filter((order) => HISTORY_STATUSES.includes(order.status)),
    [orders]
  );
  const completedOrders = useMemo(
    () => historyOrders.filter((order) => order.status === 'completed'),
    [historyOrders]
  );
  const completedTotal = completedOrders.reduce((total, order) => total + Number(order.total || 0), 0);

  const resetHistory = useCallback(() => {
    setOrders([]);
    setRefreshing(false);
    setError(null);
  }, []);

  const loadHistory = useCallback(async () => {
    if (!hasRiderSession()) {
      resetHistory();
      return;
    }
    setRefreshing(true);
    try {
      const results = await Promise.all(HISTORY_STATUSES.map((status) => fetchRiderOrders(status)));
      if (!hasRiderSession()) return;
      setOrders(results.flatMap((result) => result.data));
      setError(null);
    } catch (err) {
      if (hasRiderSession()) setError(err instanceof Error ? err.message : 'Could not load delivery history.');
    } finally {
      if (hasRiderSession()) setRefreshing(false);
    }
  }, [resetHistory]);

  useEffect(() => {
    if (!canView) {
      resetHistory();
      return;
    }
    void loadHistory();
  }, [canView, loadHistory, resetHistory]);

  if (!canView) {
    return (
      <MobileShell>
        <Kicker>Delivery history</Kicker>
        <ScreenTitle>Rider login required.</ScreenTitle>
        <BodyText>Sign in with an approved rider account to review completed deliveries.</BodyText>
      </MobileShell>
    );
  }

  return (
    <MobileShell>
      <View style={styles.hero}>
        <Kicker>Delivery records</Kicker>
        <ScreenTitle>History</ScreenTitle>
        <BodyText>Review completed and exception deliveries. Totals are order totals, not rider payouts.</BodyText>
      </View>

      {error ? <Notice tone="danger" text={error} /> : null}

      <View style={styles.metrics}>
        <MetricCard label="Completed" value={String(completedOrders.length)} icon="check-circle" />
        <MetricCard label="Exceptions" value={String(historyOrders.length - completedOrders.length)} icon="report-problem" />
        <MetricCard label="Order total" value={formatMoney(completedTotal)} icon="receipt-long" />
        <MetricCard label="Records" value={String(historyOrders.length)} icon="history" />
      </View>

      <SectionHeader title="Delivery records" action={refreshing ? 'Refreshing' : `${historyOrders.length} shown`} />
      {historyOrders.length === 0 ? (
        <EmptyCard icon="history" title="No delivery history yet" text="Completed, failed, and undeliverable jobs will appear here." />
      ) : (
        historyOrders.map((order) => <HistoryOrderCard key={`${order.status}-${order.id}`} order={order} />)
      )}
    </MobileShell>
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
    marginTop: 18,
  },
});
