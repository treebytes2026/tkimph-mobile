import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Card, MobileShell } from '@/components/mobile-shell';
import {
  formatPartnerMoney,
  formatPartnerStatus,
  nextPartnerStatus,
  PartnerActionButton,
  PartnerEmpty,
  PartnerNotice,
  partnerStatusTone,
  StatusChip,
} from '@/components/restaurant-workflow';
import { BodyText, Kicker, ScreenTitle, SectionHeader } from '@/components/ui-kit';
import { TkimphPalette } from '@/constants/theme';
import { hasRestaurantOwnerSession, useAuthSession } from '@/hooks/use-auth-session';
import { fetchPartnerOrders, PartnerOrder, updatePartnerOrderStatus } from '@/lib/api';

type FilterKey = 'live' | 'pending' | 'accepted' | 'preparing' | 'ready' | 'exceptions';

const filters: { key: FilterKey; label: string }[] = [
  { key: 'live', label: 'Live' },
  { key: 'pending', label: 'Pending' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'preparing', label: 'Preparing' },
  { key: 'ready', label: 'Ready' },
  { key: 'exceptions', label: 'Issues' },
];

function blurActiveElement() {
  if (Platform.OS !== 'web') return;
  const active = document.activeElement;
  if (active instanceof HTMLElement) active.blur();
}

function matchesFilter(order: PartnerOrder, filter: FilterKey) {
  if (filter === 'live') return !['completed', 'cancelled', 'failed', 'undeliverable'].includes(order.status);
  if (filter === 'exceptions') return ['cancelled', 'failed'].includes(order.status);
  return order.status === filter;
}

export default function RestaurantOrdersScreen() {
  const auth = useAuthSession();
  const canView = auth.isRestaurantOwner;
  const [orders, setOrders] = useState<PartnerOrder[]>([]);
  const [filter, setFilter] = useState<FilterKey>('live');
  const [selectedOrder, setSelectedOrder] = useState<PartnerOrder | null>(null);
  const [actingOrderId, setActingOrderId] = useState<number | null>(null);
  const [exceptionReason, setExceptionReason] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const visibleOrders = useMemo(() => orders.filter((order) => matchesFilter(order, filter)), [filter, orders]);

  const resetOrders = useCallback(() => {
    setOrders([]);
    setSelectedOrder(null);
    setActingOrderId(null);
    setExceptionReason('');
    setRefreshing(false);
    setError(null);
    setMessage(null);
  }, []);

  const loadOrders = useCallback(async (silent = false, nextPage = 1) => {
    if (!hasRestaurantOwnerSession()) {
      resetOrders();
      return;
    }
    const initial = nextPage === 1;
    if (!silent && initial) setRefreshing(true);
    if (!initial) setLoadingMore(true);
    try {
      const response = await fetchPartnerOrders({ live: true, perPage: 20, page: nextPage });
      if (!hasRestaurantOwnerSession()) return;
      setOrders((current) => (initial ? response.data : [...current, ...response.data]));
      setPage(response.current_page ?? nextPage);
      setHasMore(Boolean(response.next_page_url));
      setSelectedOrder((current) => (current ? response.data.find((order) => order.id === current.id) ?? current : current));
      setError(null);
    } catch (err) {
      if (hasRestaurantOwnerSession()) setError(err instanceof Error ? err.message : 'Could not load restaurant orders.');
    } finally {
      if (hasRestaurantOwnerSession()) setRefreshing(false);
      if (hasRestaurantOwnerSession()) setLoadingMore(false);
    }
  }, [resetOrders]);

  useEffect(() => {
    if (!canView) {
      resetOrders();
      return;
    }
    void loadOrders();
    const timer = setInterval(() => void loadOrders(true), 12000);
    return () => clearInterval(timer);
  }, [canView, loadOrders, resetOrders]);

  async function handleStatus(order: PartnerOrder, status: string, reason?: string | null) {
    if (!hasRestaurantOwnerSession()) return;
    blurActiveElement();
    setError(null);
    setMessage(null);
    setActingOrderId(order.id);
    try {
      const result = await updatePartnerOrderStatus(order.id, status, reason);
      if (!hasRestaurantOwnerSession()) return;
      setMessage(`${result.order.order_number} updated to ${formatPartnerStatus(result.order.status)}.`);
      setExceptionReason('');
      await loadOrders(true, 1);
    } catch (err) {
      if (hasRestaurantOwnerSession()) setError(err instanceof Error ? err.message : 'Could not update order status.');
    } finally {
      if (hasRestaurantOwnerSession()) setActingOrderId(null);
    }
  }

  function handleException(order: PartnerOrder, status: 'cancelled' | 'failed') {
    if (!exceptionReason.trim()) {
      setError('Enter a reason before marking an order cancelled or failed.');
      return;
    }
    void handleStatus(order, status, exceptionReason.trim());
  }

  if (!canView) {
    return (
      <MobileShell>
        <Kicker>Restaurant orders</Kicker>
        <ScreenTitle>Restaurant login required.</ScreenTitle>
        <BodyText>Sign in with an approved restaurant owner account to manage live orders.</BodyText>
      </MobileShell>
    );
  }

  return (
    <MobileShell>
      <View style={styles.hero}>
        <Kicker>Order queue</Kicker>
        <ScreenTitle>Live orders</ScreenTitle>
        <BodyText>Accept, prepare, mark ready, and handle exceptions before rider handoff.</BodyText>
      </View>

      {error ? <PartnerNotice tone="danger" text={error} /> : null}
      {message ? <PartnerNotice tone="success" text={message} /> : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {filters.map((item) => {
          const active = filter === item.key;
          const count = orders.filter((order) => matchesFilter(order, item.key)).length;
          return (
            <Pressable key={item.key} onPress={() => setFilter(item.key)} style={[styles.filterButton, active && styles.filterButtonActive]}>
              <Text style={[styles.filterText, active && styles.filterTextActive]}>{item.label}</Text>
              <Text style={[styles.filterCount, active && styles.filterTextActive]}>{count}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.refreshRow}>
        <Text style={styles.refreshText}>{refreshing ? 'Refreshing order queue...' : `${visibleOrders.length} orders shown`}</Text>
        <PartnerActionButton compact tone="outline" icon="refresh" label="Refresh" disabled={refreshing} onPress={() => void loadOrders(true, 1)} />
      </View>

      <SectionHeader title="Orders" action={formatPartnerStatus(filter)} />
      {visibleOrders.length === 0 ? (
        <PartnerEmpty icon="receipt-long" title="No orders here" text="Orders appear automatically as customers place them." />
      ) : (
        visibleOrders.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            acting={actingOrderId === order.id}
            onOpen={() => setSelectedOrder(order)}
            onUpdate={(nextStatus) => void handleStatus(order, nextStatus)}
          />
        ))
      )}
      {hasMore ? (
        <PartnerActionButton
          compact
          tone="outline"
          icon="expand-more"
          label={loadingMore ? 'Loading' : 'Load more'}
          disabled={loadingMore}
          onPress={() => void loadOrders(true, page + 1)}
        />
      ) : null}

      <OrderDetailModal
        order={selectedOrder}
        acting={actingOrderId === selectedOrder?.id}
        exceptionReason={exceptionReason}
        onReasonChange={setExceptionReason}
        onClose={() => {
          setSelectedOrder(null);
          setExceptionReason('');
        }}
        onUpdate={(nextStatus) => selectedOrder && void handleStatus(selectedOrder, nextStatus)}
        onCancel={() => selectedOrder && handleException(selectedOrder, 'cancelled')}
        onFail={() => selectedOrder && handleException(selectedOrder, 'failed')}
      />
    </MobileShell>
  );
}

function OrderCard({
  order,
  acting,
  onOpen,
  onUpdate,
}: {
  order: PartnerOrder;
  acting: boolean;
  onOpen: () => void;
  onUpdate: (status: string) => void;
}) {
  const next = nextPartnerStatus(order.status);
  return (
    <Card>
      <Pressable accessibilityRole="button" onPress={onOpen}>
        <View style={styles.rowBetween}>
          <Text style={styles.orderNumber}>{order.order_number}</Text>
          <StatusChip tone={partnerStatusTone(order.status)}>{formatPartnerStatus(order.status)}</StatusChip>
        </View>
        <Text style={styles.meta}>{order.customer?.name || 'Customer'} | {order.customer?.phone || 'No phone'} | {order.delivery_mode}</Text>
        <View style={styles.orderFacts}>
          <Text style={styles.fact}>{order.items?.length ?? 0} items</Text>
          <Text style={styles.fact}>{order.payment_status || 'payment pending'}</Text>
          <Text style={styles.fact}>{formatPartnerMoney(order.total)}</Text>
        </View>
      </Pressable>
      <View style={styles.cardActions}>
        <PartnerActionButton compact tone="outline" icon="visibility" label="Details" onPress={onOpen} />
        {next ? <PartnerActionButton compact icon={next.icon} label={acting ? 'Updating' : next.label} disabled={acting} onPress={() => onUpdate(next.status)} /> : null}
      </View>
    </Card>
  );
}

function OrderDetailModal({
  order,
  acting,
  exceptionReason,
  onReasonChange,
  onClose,
  onUpdate,
  onCancel,
  onFail,
}: {
  order: PartnerOrder | null;
  acting: boolean;
  exceptionReason: string;
  onReasonChange: (text: string) => void;
  onClose: () => void;
  onUpdate: (status: string) => void;
  onCancel: () => void;
  onFail: () => void;
}) {
  const next = order ? nextPartnerStatus(order.status) : null;
  return (
    <Modal animationType="slide" visible={Boolean(order)} transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          {order ? (
            <>
              <View style={styles.modalHeader}>
                <View style={styles.flex}>
                  <Text style={styles.modalTitle}>{order.order_number}</Text>
                  <Text style={styles.meta}>{order.customer?.name || 'Customer'} | {order.customer?.phone || 'No phone'}</Text>
                </View>
                <Pressable accessibilityRole="button" onPress={onClose} style={styles.closeButton}>
                  <MaterialIcons color={TkimphPalette.ink} name="close" size={21} />
                </Pressable>
              </View>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalContent}>
                <StatusChip tone={partnerStatusTone(order.status)}>{formatPartnerStatus(order.status)}</StatusChip>

                <View style={styles.detailBlock}>
                  <Text style={styles.blockTitle}>Customer and delivery</Text>
                  <Text style={styles.meta}>{order.delivery_mode === 'pickup' ? 'Pick-up order' : order.delivery_address || 'No delivery address'}</Text>
                  {order.delivery_floor ? <Text style={styles.meta}>Floor/unit: {order.delivery_floor}</Text> : null}
                  {order.delivery_note ? <Text style={styles.meta}>Note: {order.delivery_note}</Text> : null}
                  <Text style={styles.meta}>Payment: {order.payment_method || 'N/A'} | {order.payment_status || 'N/A'}</Text>
                </View>

                <View style={styles.detailBlock}>
                  <Text style={styles.blockTitle}>Items</Text>
                  {(order.items ?? []).map((item) => (
                    <View key={item.id} style={styles.itemRow}>
                      <View style={styles.flex}>
                        <Text style={styles.itemName}>{item.name}</Text>
                        <Text style={styles.meta}>x{item.quantity} | {formatPartnerMoney(item.unit_price)}</Text>
                      </View>
                      <Text style={styles.itemTotal}>{formatPartnerMoney(item.line_total)}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.detailBlock}>
                  <Text style={styles.blockTitle}>Timeline</Text>
                  {(order.timeline ?? []).length === 0 ? <Text style={styles.meta}>No timeline events yet.</Text> : null}
                  {(order.timeline ?? []).map((event) => (
                    <View key={event.id} style={styles.timelineRow}>
                      <View style={styles.timelineDot} />
                      <View style={styles.flex}>
                        <Text style={styles.itemName}>{formatPartnerStatus(event.event_type)}</Text>
                        {event.note ? <Text style={styles.meta}>{event.note}</Text> : null}
                        <Text style={styles.meta}>{event.created_at || ''}</Text>
                      </View>
                    </View>
                  ))}
                </View>

                <View style={styles.detailBlock}>
                  <Text style={styles.blockTitle}>Exception reason</Text>
                  <TextInput
                    multiline
                    placeholder="Required for cancelled or failed orders"
                    placeholderTextColor={TkimphPalette.muted}
                    value={exceptionReason}
                    onChangeText={onReasonChange}
                    style={[styles.input, styles.textArea]}
                  />
                </View>
              </ScrollView>
              <View style={styles.modalActions}>
                {next ? <PartnerActionButton icon={next.icon} label={acting ? 'Updating' : next.label} disabled={acting} onPress={() => onUpdate(next.status)} /> : null}
                <View style={styles.splitActions}>
                  <PartnerActionButton compact tone="red" icon="cancel" label="Cancel" disabled={acting} onPress={onCancel} />
                  <PartnerActionButton compact tone="outline" icon="report-problem" label="Failed" disabled={acting} onPress={onFail} />
                </View>
              </View>
            </>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: 0,
  },
  filterRow: {
    gap: 8,
    paddingVertical: 16,
  },
  filterButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#EAEEF4',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 7,
    minHeight: 42,
    paddingHorizontal: 12,
  },
  filterButtonActive: {
    backgroundColor: '#E8F3ED',
    borderColor: TkimphPalette.green,
  },
  filterText: {
    color: TkimphPalette.muted,
    fontSize: 13,
    fontWeight: '900',
  },
  filterTextActive: {
    color: TkimphPalette.green,
  },
  filterCount: {
    color: TkimphPalette.muted,
    fontSize: 12,
    fontWeight: '900',
  },
  refreshRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
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
  orderNumber: {
    color: TkimphPalette.ink,
    flex: 1,
    fontSize: 17,
    fontWeight: '900',
  },
  meta: {
    color: TkimphPalette.muted,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    marginTop: 5,
  },
  orderFacts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  fact: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    color: TkimphPalette.ink,
    fontSize: 12,
    fontWeight: '900',
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  modalBackdrop: {
    backgroundColor: 'rgba(15, 23, 42, 0.48)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '88%',
    padding: 14,
  },
  modalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  modalTitle: {
    color: TkimphPalette.ink,
    fontSize: 20,
    fontWeight: '900',
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  modalContent: {
    gap: 12,
    paddingBottom: 12,
    paddingTop: 12,
  },
  detailBlock: {
    backgroundColor: '#F8FAFC',
    borderColor: '#EAEEF4',
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  blockTitle: {
    color: TkimphPalette.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  itemRow: {
    alignItems: 'center',
    borderBottomColor: '#EAEFF5',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 10,
  },
  itemName: {
    color: TkimphPalette.ink,
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'capitalize',
  },
  itemTotal: {
    color: TkimphPalette.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  timelineRow: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 10,
  },
  timelineDot: {
    backgroundColor: TkimphPalette.green,
    borderRadius: 5,
    height: 10,
    marginTop: 5,
    width: 10,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E4E7EC',
    borderRadius: 12,
    borderWidth: 1,
    color: TkimphPalette.ink,
    fontSize: 14,
    minHeight: 46,
    paddingHorizontal: 12,
  },
  textArea: {
    minHeight: 76,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
  modalActions: {
    borderTopColor: '#EAEEF4',
    borderTopWidth: 1,
    gap: 10,
    paddingTop: 12,
  },
  splitActions: {
    flexDirection: 'row',
    gap: 8,
  },
});
