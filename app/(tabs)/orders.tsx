import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { LoadingState } from '@/components/loading-state';
import { MobileShell } from '@/components/mobile-shell';
import { TkimphPalette } from '@/constants/theme';
import { CustomerOrder, fetchCustomerOrders, getStoredUser, publicFileUrl, subscribeAuthChanged } from '@/lib/api';
import { blurActiveElement } from '@/lib/focus';

type Filter = 'All' | 'Active' | 'Past';

const activeSteps = ['accepted', 'preparing', 'ready', 'out_for_delivery'];

function statusLabel(status: string) {
  return status.replace(/_/g, ' ');
}

function isCompletedStatus(status: string) {
  const clean = status.toLowerCase();
  return clean === 'delivered' || clean === 'completed';
}

function statusProgress(status: string) {
  const clean = status.toLowerCase();
  if (clean.includes('out')) return 4;
  if (clean.includes('ready')) return 3;
  if (clean.includes('prepar')) return 2;
  if (clean.includes('accept') || clean.includes('confirm')) return 1;
  return 0;
}

export default function OrdersScreen() {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [userRole, setUserRole] = useState(() => getStoredUser()?.role ?? null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<Filter>('All');
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();
  const signedIn = Boolean(userRole);
  const canViewCustomerOrders = userRole === 'customer';

  function openOrder(orderId: number) {
    blurActiveElement();
    router.push(`/orders/${orderId}` as never);
  }

  useEffect(() => {
    return subscribeAuthChanged(() => setUserRole(getStoredUser()?.role ?? null));
  }, []);

  useEffect(() => {
    if (!canViewCustomerOrders) {
      setOrders([]);
      setMessage(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setMessage(null);
    fetchCustomerOrders()
      .then((response) => setOrders(response.data))
      .catch((err: Error) => setMessage(err.message || 'Could not load orders.'))
      .finally(() => setLoading(false));
  }, [canViewCustomerOrders]);

  const visibleOrders = orders.filter((order) => {
    if (filter === 'All') return true;
    const status = order.status.toLowerCase();
    const past = isCompletedStatus(status) || status.includes('cancel') || status.includes('fail');
    return filter === 'Past' ? past : !past;
  });

  return (
    <MobileShell>
      <Text style={styles.title}>My Orders</Text>
      <View style={styles.chipRow}>
        {(['All', 'Active', 'Past'] as Filter[]).map((label) => (
          <Pressable key={label} onPress={() => setFilter(label)} style={[styles.chip, filter === label && styles.chipActive]}>
            <Text style={[styles.chipText, filter === label && styles.chipActiveText]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {!signedIn ? <Text style={styles.emptyText}>Sign in from the Profile tab to view your orders.</Text> : null}
      {signedIn && !canViewCustomerOrders ? (
        <Text style={styles.emptyText}>Customer orders are available from customer accounts.</Text>
      ) : null}
      {loading ? <LoadingState compact label="Loading orders..." /> : null}
      {message ? <Text style={styles.emptyText}>{message}</Text> : null}
      {canViewCustomerOrders && !loading && visibleOrders.length === 0 ? <Text style={styles.emptyText}>No orders to show.</Text> : null}

      {visibleOrders.map((order) => {
        const imageUrl = publicFileUrl(order.restaurant?.profile_image_path, order.restaurant?.profile_image_url);
        const delivered = isCompletedStatus(order.status);
        const active = !delivered && !order.status.toLowerCase().includes('cancel') && !order.status.toLowerCase().includes('fail');
        return (
          <Pressable
            key={order.id}
            onPress={() => openOrder(order.id)}
            style={styles.orderCard}
          >
            <View style={styles.orderTop}>
              {imageUrl ? <Image source={{ uri: imageUrl }} style={styles.orderImage} /> : <View style={styles.orderImage} />}
              <View style={styles.orderInfo}>
                <View style={styles.rowBetween}>
                  <Text style={styles.restaurant}>{order.restaurant?.name || 'Restaurant'}</Text>
                  <View style={[styles.status, delivered ? styles.statusGreen : styles.statusBlue]}>
                    <MaterialIcons color={delivered ? TkimphPalette.green : TkimphPalette.blue} name={delivered ? 'check-circle-outline' : 'delivery-dining'} size={12} />
                    <Text style={[styles.statusText, delivered ? styles.statusTextGreen : styles.statusTextBlue]}>
                      {delivered ? 'Completed' : statusLabel(order.status)}
                    </Text>
                  </View>
                </View>
                <Text style={styles.orderId}>Order #{order.order_number}</Text>
                <Text style={styles.items} numberOfLines={1}>
                  {order.items.map((item) => `${item.name} x${item.quantity}`).join(', ') || 'Order items'}
                </Text>
                <View style={styles.rowBetween}>
                  <Text style={styles.date}>{order.placed_at || 'Recently placed'}</Text>
                  <Text style={styles.total}>{`\u20B1${Number(order.total).toFixed(2)}`}</Text>
                </View>
              </View>
            </View>
            {active ? <OrderProgress progress={statusProgress(order.status)} /> : null}
            <View style={styles.divider} />
            {delivered ? (
              <View style={styles.actionRow}>
                <Pressable
                  onPress={(event) => {
                    event.stopPropagation();
                    openOrder(order.id);
                  }}
                  style={styles.lightButton}
                >
                  <Text style={styles.lightButtonText}>Rate Order</Text>
                </Pressable>
              </View>
            ) : active ? (
              <Pressable
                onPress={(event) => {
                  event.stopPropagation();
                  openOrder(order.id);
                }}
                style={styles.trackButton}
              >
                <MaterialIcons color="#FFFFFF" name="delivery-dining" size={15} />
                <Text style={styles.trackText}>View status</Text>
              </Pressable>
            ) : null}
          </Pressable>
        );
      })}
    </MobileShell>
  );
}

function OrderProgress({ progress }: { progress: number }) {
  return (
    <View style={styles.progressWrap}>
      {activeSteps.map((step, index) => {
        const active = progress >= index + 1;
        return (
          <View key={step} style={styles.progressItem}>
            <View style={[styles.progressDot, active && styles.progressDotActive]} />
            {index < activeSteps.length - 1 ? <View style={[styles.progressLine, active && styles.progressLineActive]} /> : null}
          </View>
        );
      })}
      <Text style={styles.progressText}>
        {progress <= 1 ? 'Order accepted' : progress === 2 ? 'Preparing your food' : progress === 3 ? 'Ready soon' : 'On the way'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    color: TkimphPalette.ink,
    fontSize: 23,
    fontWeight: '900',
    marginBottom: 28,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 30,
  },
  chip: {
    backgroundColor: '#F1F3F6',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  chipActive: {
    backgroundColor: TkimphPalette.green,
  },
  chipText: {
    color: '#667085',
    fontSize: 13,
    fontWeight: '900',
  },
  chipActiveText: {
    color: '#FFFFFF',
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EAEEF4',
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
    padding: 16,
    ...Platform.select({
      web: { boxShadow: '0 3px 8px rgba(16, 24, 40, 0.08)' },
      default: {
        elevation: 2,
        shadowColor: '#101828',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
    }),
  },
  orderTop: {
    flexDirection: 'row',
    gap: 12,
  },
  orderImage: {
    backgroundColor: TkimphPalette.orange,
    borderRadius: 10,
    height: 58,
    width: 58,
  },
  orderInfo: {
    flex: 1,
  },
  rowBetween: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  restaurant: {
    color: TkimphPalette.ink,
    flex: 1,
    fontSize: 15,
    fontWeight: '900',
  },
  status: {
    alignItems: 'center',
    borderRadius: 13,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusGreen: {
    backgroundColor: '#ECFDF3',
  },
  statusBlue: {
    backgroundColor: '#EFF6FF',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '900',
  },
  statusTextGreen: {
    color: TkimphPalette.green,
  },
  statusTextBlue: {
    color: TkimphPalette.blue,
  },
  orderId: {
    color: TkimphPalette.muted,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 3,
  },
  items: {
    color: '#667085',
    fontSize: 13,
    marginTop: 5,
  },
  date: {
    color: TkimphPalette.muted,
    fontSize: 13,
    marginTop: 8,
  },
  total: {
    color: TkimphPalette.ink,
    fontSize: 15,
    fontWeight: '900',
    marginTop: 8,
  },
  divider: {
    backgroundColor: '#EAEEF4',
    height: 1,
    marginVertical: 12,
  },
  progressWrap: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    flexDirection: 'row',
    marginTop: 12,
    padding: 10,
  },
  progressItem: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  progressDot: {
    backgroundColor: '#D0D5DD',
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  progressDotActive: {
    backgroundColor: TkimphPalette.green,
  },
  progressLine: {
    backgroundColor: '#D0D5DD',
    height: 2,
    width: 18,
  },
  progressLineActive: {
    backgroundColor: TkimphPalette.green,
  },
  progressText: {
    color: TkimphPalette.ink,
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 10,
  },
  trackButton: {
    alignItems: 'center',
    backgroundColor: TkimphPalette.green,
    borderRadius: 11,
    flexDirection: 'row',
    gap: 6,
    height: 36,
    justifyContent: 'center',
  },
  trackText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 9,
  },
  lightButton: {
    alignItems: 'center',
    backgroundColor: '#E8F3ED',
    borderRadius: 12,
    flex: 1,
    height: 36,
    justifyContent: 'center',
  },
  lightButtonText: {
    color: TkimphPalette.green,
    fontSize: 13,
    fontWeight: '900',
  },
  emptyText: {
    color: TkimphPalette.muted,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    textAlign: 'center',
  },
});
