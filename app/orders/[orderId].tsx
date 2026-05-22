import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LoadingState } from '@/components/loading-state';
import { TkimphPalette } from '@/constants/theme';
import {
  CustomerOrder,
  fetchCustomerOrder,
  publicFileUrl,
  requestCustomerOrderCancel,
  submitCustomerOrderItemReview,
  submitCustomerOrderReview,
} from '@/lib/api';
import { blurActiveElement } from '@/lib/focus';

function formatPhp(value?: number) {
  const amount = Number(value ?? 0);
  return `\u20B1${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function currentStatusCopy(status: string) {
  const clean = status.toLowerCase();
  if (clean.includes('complete')) return { icon: 'check-circle-outline', title: 'Completed', body: 'Your order has been completed.' };
  if (clean.includes('deliver')) return { icon: 'check-circle-outline', title: 'Delivered', body: 'Your order has been completed.' };
  if (clean.includes('out')) return { icon: 'delivery-dining', title: 'On the way', body: 'Your order is heading to you.' };
  if (clean.includes('ready')) return { icon: 'shopping-bag', title: 'Ready', body: 'Your order is ready for pickup or rider assignment.' };
  if (clean.includes('prepar')) return { icon: 'restaurant-menu', title: 'Preparing', body: 'The restaurant is preparing your food.' };
  if (clean.includes('accept') || clean.includes('confirm')) return { icon: 'task-alt', title: 'Accepted', body: 'The restaurant accepted your order.' };
  if (clean.includes('cancel')) return { icon: 'cancel', title: 'Cancelled', body: 'This order was cancelled.' };
  return { icon: 'receipt-long', title: status.replace(/_/g, ' '), body: 'We will update this status as the order moves.' };
}

function canReviewStatus(status?: string) {
  const clean = status?.toLowerCase() ?? '';
  return clean === 'delivered' || clean === 'completed';
}

export default function OrderDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ orderId?: string }>();
  const orderId = Number(Array.isArray(params.orderId) ? params.orderId[0] : params.orderId);
  const [order, setOrder] = useState<CustomerOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [restaurantRating, setRestaurantRating] = useState(5);
  const [itemRatings, setItemRatings] = useState<Record<number, number>>({});
  const [itemComments, setItemComments] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    setLoading(true);
    fetchCustomerOrder(orderId)
      .then((response) => setOrder(response.order))
      .catch((err: Error) => setMessage(err.message || 'Could not load order.'))
      .finally(() => setLoading(false));
  }, [orderId]);

  async function handleCancel() {
    if (!order || !cancelReason.trim()) {
      setMessage('Enter a cancellation reason first.');
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const response = await requestCustomerOrderCancel(order.id, cancelReason.trim());
      setOrder(response.order);
      setMessage(response.message);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not submit cancellation request.');
    } finally {
      setSaving(false);
    }
  }

  async function handleReview() {
    if (!order) return;
    setSaving(true);
    setMessage(null);
    try {
      const response = await submitCustomerOrderReview(order.id, {
        restaurant_rating: restaurantRating,
        comment: reviewComment.trim() || null,
      });
      await Promise.all(
        order.items
          .filter((item) => item.menu_item_id)
          .map((item) =>
            submitCustomerOrderItemReview(order.id, {
              menu_item_id: item.menu_item_id!,
              rating: itemRatings[item.id] ?? restaurantRating,
              comment: itemComments[item.id]?.trim() || null,
            }).catch(() => undefined)
          )
      );
      setMessage(response.message);
      const fresh = await fetchCustomerOrder(order.id);
      setOrder(fresh.order);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not submit review.');
    } finally {
      setSaving(false);
    }
  }

  const restaurantImage = publicFileUrl(order?.restaurant?.profile_image_path, order?.restaurant?.profile_image_url);
  const delivered = canReviewStatus(order?.status);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            blurActiveElement();
            router.back();
          }}
          style={styles.roundButton}
        >
          <MaterialIcons color={TkimphPalette.ink} name="arrow-back" size={22} />
        </Pressable>
        <Text style={styles.topTitle}>Order details</Text>
        <View style={styles.roundButton}>
          <MaterialIcons color={TkimphPalette.ink} name="receipt-long" size={21} />
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <LoadingState label="Loading order..." />
        </View>
      ) : !order ? (
        <View style={styles.center}>
          <Text style={styles.mutedText}>{message ?? 'Order not found.'}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <View style={styles.restaurantRow}>
              {restaurantImage ? <Image source={{ uri: restaurantImage }} style={styles.restaurantImage} /> : <View style={styles.restaurantImage} />}
              <View style={styles.flex}>
                <Text style={styles.restaurantName}>{order.restaurant?.name ?? 'Restaurant'}</Text>
                <Text style={styles.mutedText}>#{order.order_number}</Text>
                <Text style={styles.statusText}>{order.status.replace(/_/g, ' ')}</Text>
              </View>
            </View>
          </View>

          <StatusCard status={order.status} />

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Items</Text>
            {order.items.map((item) => {
              const image = publicFileUrl(item.image_path, item.image_url);
              return (
                <View key={item.id} style={styles.itemRow}>
                  {image ? <Image source={{ uri: image }} style={styles.itemImage} /> : <View style={styles.itemImage} />}
                  <View style={styles.flex}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.mutedText}>x{item.quantity}</Text>
                  </View>
                  <Text style={styles.itemTotal}>{formatPhp(item.line_total ?? Number(item.unit_price ?? 0) * item.quantity)}</Text>
                </View>
              );
            })}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Summary</Text>
            <Summary label="Subtotal" value={formatPhp(order.subtotal)} />
            <Summary label="Delivery" value={formatPhp(order.delivery_fee)} />
            <Summary label="Discount" value={`-${formatPhp(order.discounts_total)}`} />
            <View style={styles.divider} />
            <Summary label="Total" value={formatPhp(order.total)} strong />
            <Text style={styles.mutedText}>{order.delivery_mode === 'pickup' ? 'Pick-up' : order.delivery_address}</Text>
            {order.delivery_note ? <Text style={styles.mutedText}>Note: {order.delivery_note}</Text> : null}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Timeline</Text>
            {(order.timeline ?? []).length === 0 ? <Text style={styles.mutedText}>No timeline events yet.</Text> : null}
            {(order.timeline ?? []).map((event) => (
              <View key={event.id} style={styles.timelineRow}>
                <View style={styles.timelineDot} />
                <View style={styles.flex}>
                  <Text style={styles.itemName}>{event.event_type.replace(/_/g, ' ')}</Text>
                  {event.note ? <Text style={styles.mutedText}>{event.note}</Text> : null}
                  <Text style={styles.mutedText}>{event.created_at ?? ''}</Text>
                </View>
              </View>
            ))}
          </View>

          {order.customer_cancel_eligible ? (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Cancel request</Text>
              <TextInput
                placeholder="Reason for cancellation"
                placeholderTextColor={TkimphPalette.muted}
                value={cancelReason}
                onChangeText={setCancelReason}
                style={styles.input}
              />
              <Pressable
                disabled={saving}
                onPress={() =>
                  Alert.alert('Request cancellation?', 'The restaurant/admin will review this request.', [
                    { text: 'Keep order', style: 'cancel' },
                    { text: 'Submit', style: 'destructive', onPress: handleCancel },
                  ])
                }
                style={styles.dangerButton}>
                <Text style={styles.dangerButtonText}>Request cancellation</Text>
              </Pressable>
            </View>
          ) : null}

          {delivered ? (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Rate restaurant</Text>
              <Text style={styles.mutedText}>{order.restaurant?.name ?? 'Restaurant'}</Text>
              <StarRating value={restaurantRating} onChange={setRestaurantRating} />
              <TextInput
                multiline
                placeholder="Leave a restaurant review"
                placeholderTextColor={TkimphPalette.muted}
                value={reviewComment}
                onChangeText={setReviewComment}
                style={[styles.input, styles.textArea]}
              />
              <View style={styles.divider} />
              <Text style={styles.sectionTitle}>Rate food</Text>
              {order.items.filter((item) => item.menu_item_id).map((item) => {
                const image = publicFileUrl(item.image_path, item.image_url);
                return (
                  <View key={item.id} style={styles.foodReviewCard}>
                    <View style={styles.itemRowNoBorder}>
                      {image ? <Image source={{ uri: image }} style={styles.itemImage} /> : <View style={styles.itemImage} />}
                      <View style={styles.flex}>
                        <Text style={styles.itemName}>{item.name}</Text>
                        <Text style={styles.mutedText}>x{item.quantity}</Text>
                      </View>
                    </View>
                    <StarRating
                      compact
                      value={itemRatings[item.id] ?? restaurantRating}
                      onChange={(next) => setItemRatings((current) => ({ ...current, [item.id]: next }))}
                    />
                    <TextInput
                      placeholder="Food review optional"
                      placeholderTextColor={TkimphPalette.muted}
                      value={itemComments[item.id] ?? ''}
                      onChangeText={(text) => setItemComments((current) => ({ ...current, [item.id]: text }))}
                      style={styles.input}
                    />
                  </View>
                );
              })}
              <Pressable disabled={saving} onPress={handleReview} style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>{saving ? 'Submitting...' : 'Submit ratings'}</Text>
              </Pressable>
            </View>
          ) : null}

          {message ? <Text style={styles.message}>{message}</Text> : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Summary({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.summaryLine}>
      <Text style={[styles.summaryLabel, strong && styles.summaryStrong]}>{label}</Text>
      <Text style={[styles.summaryValue, strong && styles.summaryStrong]}>{value}</Text>
    </View>
  );
}

function StatusCard({ status }: { status: string }) {
  const copy = currentStatusCopy(status);
  return (
    <View style={styles.statusCard}>
      <View style={styles.statusIcon}>
        <MaterialIcons color={TkimphPalette.green} name={copy.icon as never} size={24} />
      </View>
      <View style={styles.flex}>
        <Text style={styles.statusTitle}>{copy.title}</Text>
        <Text style={styles.mutedText}>{copy.body}</Text>
      </View>
    </View>
  );
}

function StarRating({ value, onChange, compact }: { value: number; onChange: (value: number) => void; compact?: boolean }) {
  return (
    <View style={styles.ratingRow}>
      {[1, 2, 3, 4, 5].map((ratingValue) => (
        <Pressable key={ratingValue} accessibilityRole="button" onPress={() => onChange(ratingValue)} hitSlop={6}>
          <MaterialIcons color={ratingValue <= value ? '#F59E0B' : '#D0D5DD'} name="star" size={compact ? 26 : 30} />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: '#F7F8FA', flex: 1 },
  topBar: { alignItems: 'center', flexDirection: 'row', gap: 12, paddingHorizontal: 14, paddingVertical: 10 },
  roundButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#EAEEF4',
    borderRadius: 20,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  topTitle: { color: TkimphPalette.ink, flex: 1, fontSize: 18, fontWeight: '900' },
  center: { alignItems: 'center', flex: 1, gap: 10, justifyContent: 'center', padding: 24 },
  content: { padding: 14, paddingBottom: 96 },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EAEEF4',
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    marginBottom: 12,
    padding: 14,
  },
  restaurantRow: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  restaurantImage: { backgroundColor: '#DDE3EA', borderRadius: 12, height: 58, width: 58 },
  flex: { flex: 1 },
  restaurantName: { color: TkimphPalette.ink, fontSize: 17, fontWeight: '900' },
  mutedText: { color: TkimphPalette.muted, fontSize: 13, lineHeight: 19 },
  statusText: { color: TkimphPalette.green, fontSize: 13, fontWeight: '900', marginTop: 3, textTransform: 'capitalize' },
  statusCard: {
    alignItems: 'center',
    backgroundColor: '#ECFDF3',
    borderColor: '#D1FADF',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
    padding: 14,
  },
  statusIcon: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  statusTitle: {
    color: TkimphPalette.ink,
    fontSize: 16,
    fontWeight: '900',
    textTransform: 'capitalize',
  },
  sectionTitle: { color: TkimphPalette.ink, fontSize: 16, fontWeight: '900' },
  itemRow: { alignItems: 'center', borderBottomColor: '#F1F3F6', borderBottomWidth: 1, flexDirection: 'row', gap: 10, paddingBottom: 10 },
  itemRowNoBorder: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  itemImage: { backgroundColor: '#DDE3EA', borderRadius: 10, height: 48, width: 48 },
  itemName: { color: TkimphPalette.ink, fontSize: 14, fontWeight: '900', textTransform: 'capitalize' },
  itemTotal: { color: TkimphPalette.ink, fontSize: 13, fontWeight: '900' },
  summaryLine: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { color: TkimphPalette.muted, fontSize: 14, fontWeight: '700' },
  summaryValue: { color: TkimphPalette.ink, fontSize: 14, fontWeight: '800' },
  summaryStrong: { color: TkimphPalette.ink, fontSize: 17, fontWeight: '900' },
  divider: { backgroundColor: '#EAEEF4', height: 1 },
  timelineRow: { flexDirection: 'row', gap: 10 },
  timelineDot: { backgroundColor: TkimphPalette.green, borderRadius: 6, height: 12, marginTop: 4, width: 12 },
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
  textArea: { minHeight: 86, paddingTop: 12, textAlignVertical: 'top' },
  dangerButton: { alignItems: 'center', backgroundColor: '#FEF2F2', borderRadius: 12, minHeight: 46, justifyContent: 'center' },
  dangerButtonText: { color: '#B42318', fontSize: 14, fontWeight: '900' },
  primaryButton: { alignItems: 'center', backgroundColor: TkimphPalette.green, borderRadius: 12, minHeight: 46, justifyContent: 'center' },
  primaryButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  ratingRow: { flexDirection: 'row', gap: 4 },
  foodReviewCard: {
    backgroundColor: '#F8FAFC',
    borderColor: '#EAEEF4',
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
    padding: 10,
  },
  message: { color: TkimphPalette.primary, fontSize: 13, fontWeight: '800', lineHeight: 18, textAlign: 'center' },
});
