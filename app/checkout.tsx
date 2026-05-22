import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useCart } from '@/contexts/cart-context';
import { TkimphPalette } from '@/constants/theme';
import {
  AuthUser,
  fetchCurrentUser,
  fetchPublicRestaurantBySlug,
  getStoredUser,
  placeCustomerOrder,
  publicFileUrl,
  PublicRestaurant,
  validateCustomerPromotion,
} from '@/lib/api';
import { blurActiveElement } from '@/lib/focus';

function formatPhp(value: number) {
  if (Number.isNaN(value)) return '\u20B10.00';
  return `\u20B1${value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function resolveDeliveryFee(restaurant: PublicRestaurant | null): number | null {
  if (!restaurant) return null;
  if (typeof restaurant.standard_delivery_fee_php === 'number') return restaurant.standard_delivery_fee_php;
  if (typeof restaurant.delivery_fee_php === 'number') return restaurant.delivery_fee_php;
  return null;
}

export default function CheckoutScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ expedition?: string }>();
  const { cart, cartRestaurant, cartCount, cartTotal, setQty, clearCart } = useCart();
  const [deliveryMode, setDeliveryMode] = useState<'delivery' | 'pickup'>(
    params.expedition === 'pickup' ? 'pickup' : 'delivery'
  );
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'wallet' | 'card'>('cod');
  const [deliveryAddress, setDeliveryAddress] = useState(getStoredUser()?.address ?? '');
  const [deliveryFloor, setDeliveryFloor] = useState('');
  const [deliveryNote, setDeliveryNote] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState<{ code: string; discount_amount: number } | null>(null);
  const [promoMessage, setPromoMessage] = useState<string | null>(null);
  const [orderMessage, setOrderMessage] = useState<string | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [restaurantLoading, setRestaurantLoading] = useState(false);
  const [freshRestaurant, setFreshRestaurant] = useState<PublicRestaurant | null>(null);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser());

  useEffect(() => {
    if (params.expedition === 'pickup' || params.expedition === 'delivery') {
      setDeliveryMode(params.expedition);
    }
  }, [params.expedition]);

  useEffect(() => {
    if (!getStoredUser()) return;
    let cancelled = false;
    setProfileLoading(true);
    fetchCurrentUser()
      .then((freshUser) => {
        if (cancelled) return;
        setUser(freshUser);
        if (freshUser.address?.trim()) {
          setDeliveryAddress((current) => current.trim() || freshUser.address?.trim() || '');
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setProfileLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!cartRestaurant?.slug) {
      setFreshRestaurant(null);
      return;
    }
    let cancelled = false;
    setRestaurantLoading(true);
    fetchPublicRestaurantBySlug(cartRestaurant.slug)
      .then((response) => {
        if (!cancelled) setFreshRestaurant(response.restaurant);
      })
      .catch(() => {
        if (!cancelled) setFreshRestaurant(null);
      })
      .finally(() => {
        if (!cancelled) setRestaurantLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [cartRestaurant?.slug]);

  const effectiveRestaurant = freshRestaurant ?? cartRestaurant;
  const resolvedDeliveryFee = resolveDeliveryFee(effectiveRestaurant);
  const deliveryFee = deliveryMode === 'delivery' ? resolvedDeliveryFee ?? 0 : 0;
  const grandTotal = useMemo(
    () => Math.max(0, cartTotal + deliveryFee - (promoApplied?.discount_amount ?? 0)),
    [cartTotal, deliveryFee, promoApplied?.discount_amount]
  );
  const canPlaceOrder =
    Boolean(user) &&
    cart.length > 0 &&
    Boolean(cartRestaurant) &&
    !placingOrder &&
    !restaurantLoading &&
    (deliveryMode === 'pickup' || resolvedDeliveryFee != null) &&
    (deliveryMode === 'pickup' || deliveryAddress.trim().length > 0);

  async function handleApplyPromo() {
    const code = promoCode.trim();
    if (!code) {
      setPromoApplied(null);
      setPromoMessage('Enter a promo code first.');
      return;
    }
    if (!cartRestaurant) {
      setPromoMessage('Add restaurant items before applying a promo.');
      return;
    }

    setPromoLoading(true);
    setPromoMessage(null);
    try {
      const response = await validateCustomerPromotion({
        code,
        subtotal: cartTotal,
        restaurant_id: effectiveRestaurant?.id ?? cartRestaurant.id,
      });
      if (!response.valid) {
        setPromoApplied(null);
        setPromoMessage(response.message);
        return;
      }
      setPromoApplied({ code: response.code ?? code.toUpperCase(), discount_amount: response.discount_amount });
      setPromoMessage(`Promo applied: -${formatPhp(response.discount_amount)}`);
    } catch (err) {
      setPromoApplied(null);
      setPromoMessage(err instanceof Error ? err.message : 'Could not validate promo code.');
    } finally {
      setPromoLoading(false);
    }
  }

  async function handlePlaceOrder() {
    if (!user) {
      setOrderMessage('Please sign in from the Profile tab before placing your order.');
      return;
    }
    if (!cartRestaurant) {
      setOrderMessage('Please add items from a restaurant before checkout.');
      return;
    }
    if (deliveryMode === 'delivery' && !deliveryAddress.trim()) {
      setOrderMessage('Please enter your delivery address.');
      return;
    }

    setPlacingOrder(true);
    setOrderMessage(null);
    try {
      const response = await placeCustomerOrder({
        restaurant_id: cartRestaurant.id,
        delivery_mode: deliveryMode,
        payment_method: paymentMethod,
        promo_code: promoApplied?.code ?? null,
        delivery_address:
          deliveryMode === 'pickup'
            ? effectiveRestaurant?.address?.trim() || cartRestaurant.address?.trim() || 'Pick-up at restaurant'
            : deliveryAddress.trim(),
        delivery_floor: deliveryMode === 'delivery' ? deliveryFloor.trim() || null : null,
        delivery_note: deliveryMode === 'delivery' ? deliveryNote.trim() || null : 'Standard pick-up',
        location_label: deliveryMode === 'delivery' ? 'home' : 'pickup',
        items: cart.map((line) => ({ item_id: line.item.id, qty: line.qty })),
      });
      clearCart();
      setOrderMessage(`${response.message} Order #${response.order.order_number}`);
      blurActiveElement();
      router.replace('/(tabs)/orders');
    } catch (err) {
      setOrderMessage(err instanceof Error ? err.message : 'Could not place your order.');
    } finally {
      setPlacingOrder(false);
    }
  }

  const restaurantImage = publicFileUrl(effectiveRestaurant?.profile_image_path, effectiveRestaurant?.profile_image_url);

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
        <Text style={styles.topTitle}>Checkout</Text>
        <View style={styles.roundButton}>
          <MaterialIcons color={TkimphPalette.ink} name="shopping-bag" size={21} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {cart.length === 0 || !cartRestaurant ? (
          <View style={styles.emptyCard}>
            <MaterialIcons color={TkimphPalette.green} name="shopping-bag" size={42} />
            <Text style={styles.emptyTitle}>Your cart is empty</Text>
            <Text style={styles.mutedText}>Add dishes from a restaurant menu before checkout.</Text>
            <Pressable
              onPress={() => {
                blurActiveElement();
                router.replace('/(tabs)/browse');
              }}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>Browse restaurants</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {!user ? (
              <View style={styles.warningCard}>
                <MaterialIcons color={TkimphPalette.primary} name="lock-outline" size={22} />
                <Text style={styles.warningText}>Sign in from the Profile tab before placing your order.</Text>
              </View>
            ) : null}

            <View style={styles.restaurantCard}>
              {restaurantImage ? <Image source={{ uri: restaurantImage }} style={styles.restaurantImage} /> : <View style={styles.restaurantImage} />}
              <View style={styles.restaurantInfo}>
                <Text style={styles.restaurantName}>{effectiveRestaurant?.name ?? cartRestaurant.name}</Text>
                <Text style={styles.mutedText}>
                  {cartCount} items{restaurantLoading ? ' | updating delivery fee...' : ''}
                </Text>
              </View>
              <Pressable accessibilityRole="button" onPress={clearCart} style={styles.clearCartButton}>
                <MaterialIcons color={TkimphPalette.primary} name="delete-outline" size={21} />
              </Pressable>
            </View>

            <View style={styles.modeRow}>
              {(['delivery', 'pickup'] as const).map((mode) => (
                <Pressable key={mode} onPress={() => setDeliveryMode(mode)} style={[styles.modeButton, deliveryMode === mode && styles.modeButtonActive]}>
                  <Text style={[styles.modeText, deliveryMode === mode && styles.modeTextActive]}>{mode === 'delivery' ? 'Delivery' : 'Pick-up'}</Text>
                </Pressable>
              ))}
            </View>

            {deliveryMode === 'delivery' ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Delivery address</Text>
                <TextInput
                  multiline
                  placeholder={profileLoading ? 'Loading saved address...' : 'House number, street, barangay, city'}
                  placeholderTextColor={TkimphPalette.muted}
                  value={deliveryAddress}
                  onChangeText={setDeliveryAddress}
                  style={[styles.input, styles.textArea]}
                />
                <TextInput
                  placeholder="Floor / unit (optional)"
                  placeholderTextColor={TkimphPalette.muted}
                  value={deliveryFloor}
                  onChangeText={setDeliveryFloor}
                  style={styles.input}
                />
                <TextInput
                  placeholder="Note to rider (optional)"
                  placeholderTextColor={TkimphPalette.muted}
                  value={deliveryNote}
                  onChangeText={setDeliveryNote}
                  style={styles.input}
                />
              </View>
            ) : (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Pick-up</Text>
                <Text style={styles.mutedText}>{effectiveRestaurant?.address || cartRestaurant.address || 'Pick up at the restaurant counter.'}</Text>
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Your items</Text>
              {cart.map((line) => {
                const image = publicFileUrl(line.item.image_path, line.item.image_url);
                const lineTotal = Number(line.item.price) * line.qty;
                return (
                  <View key={line.item.id} style={styles.lineItem}>
                    {image ? <Image source={{ uri: image }} style={styles.lineImage} /> : <View style={styles.lineImage} />}
                    <View style={styles.lineBody}>
                      <Text style={styles.lineName}>{line.item.name}</Text>
                      <Text style={styles.mutedText}>{formatPhp(Number(line.item.price))}</Text>
                      <View style={styles.stepper}>
                        <Pressable onPress={() => setQty(line.item.id, line.qty - 1)} style={styles.stepButton}>
                          <MaterialIcons color={TkimphPalette.ink} name="remove" size={16} />
                        </Pressable>
                        <Text style={styles.stepQty}>{line.qty}</Text>
                        <Pressable onPress={() => setQty(line.item.id, line.qty + 1)} style={styles.stepButton}>
                          <MaterialIcons color={TkimphPalette.ink} name="add" size={16} />
                        </Pressable>
                      </View>
                    </View>
                    <Text style={styles.lineTotal}>{formatPhp(lineTotal)}</Text>
                  </View>
                );
              })}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Payment method</Text>
              <View style={styles.paymentRow}>
                {(['cod', 'wallet', 'card'] as const).map((method) => {
                  const disabled = method !== 'cod';
                  return (
                  <Pressable
                    key={method}
                    disabled={disabled}
                    onPress={() => setPaymentMethod(method)}
                    style={[
                      styles.paymentButton,
                      paymentMethod === method && styles.paymentButtonActive,
                      disabled && styles.paymentButtonDisabled,
                    ]}>
                    <Text style={[styles.paymentText, paymentMethod === method && styles.paymentTextActive]}>
                      {method.toUpperCase()}{disabled ? ' soon' : ''}
                    </Text>
                  </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Promo code</Text>
              <View style={styles.promoRow}>
                <TextInput
                  autoCapitalize="characters"
                  placeholder="Enter code"
                  placeholderTextColor={TkimphPalette.muted}
                  value={promoCode}
                  onChangeText={setPromoCode}
                  style={[styles.input, styles.promoInput]}
                />
                <Pressable disabled={promoLoading} onPress={handleApplyPromo} style={styles.applyButton}>
                  {promoLoading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.applyText}>Apply</Text>}
                </Pressable>
              </View>
              {promoMessage ? <Text style={styles.message}>{promoMessage}</Text> : null}
            </View>

            <View style={styles.summaryCard}>
              <SummaryLine label="Subtotal" value={formatPhp(cartTotal)} />
              {deliveryMode === 'delivery' ? (
                <SummaryLine
                  label="Standard delivery"
                  value={resolvedDeliveryFee == null ? 'Set by admin' : formatPhp(deliveryFee)}
                />
              ) : null}
              {promoApplied ? <SummaryLine label={`Discount (${promoApplied.code})`} value={`-${formatPhp(promoApplied.discount_amount)}`} highlight /> : null}
              <View style={styles.summaryDivider} />
              <SummaryLine label="Total" value={formatPhp(grandTotal)} strong />
              <Pressable disabled={!canPlaceOrder} onPress={handlePlaceOrder} style={[styles.placeButton, !canPlaceOrder && styles.placeButtonDisabled]}>
                {placingOrder ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.placeButtonText}>{deliveryMode === 'pickup' ? 'Place pick-up order' : 'Place order'}</Text>}
              </Pressable>
              {orderMessage ? <Text style={styles.message}>{orderMessage}</Text> : null}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryLine({ label, value, strong, highlight }: { label: string; value: string; strong?: boolean; highlight?: boolean }) {
  return (
    <View style={styles.summaryLine}>
      <Text style={[styles.summaryLabel, strong && styles.summaryStrong]}>{label}</Text>
      <Text style={[styles.summaryValue, strong && styles.summaryStrong, highlight && styles.summaryHighlight]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: '#F7F8FA',
    flex: 1,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
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
  topTitle: {
    color: TkimphPalette.ink,
    flex: 1,
    fontSize: 18,
    fontWeight: '900',
  },
  content: {
    padding: 14,
    paddingBottom: 96,
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#EAEEF4',
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    padding: 24,
  },
  emptyTitle: {
    color: TkimphPalette.ink,
    fontSize: 20,
    fontWeight: '900',
  },
  mutedText: {
    color: TkimphPalette.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: TkimphPalette.green,
    borderRadius: 12,
    marginTop: 6,
    minHeight: 46,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  warningCard: {
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 9,
    marginBottom: 12,
    padding: 12,
  },
  warningText: {
    color: '#9A3412',
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  restaurantCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#EAEEF4',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 12,
  },
  restaurantImage: {
    backgroundColor: '#DDE3EA',
    borderRadius: 12,
    height: 56,
    width: 56,
  },
  restaurantInfo: {
    flex: 1,
  },
  clearCartButton: {
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
    borderRadius: 12,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  restaurantName: {
    color: TkimphPalette.ink,
    fontSize: 16,
    fontWeight: '900',
  },
  modeRow: {
    backgroundColor: '#EEF0F4',
    borderRadius: 18,
    flexDirection: 'row',
    gap: 4,
    marginTop: 12,
    padding: 4,
  },
  modeButton: {
    alignItems: 'center',
    borderRadius: 14,
    flex: 1,
    paddingVertical: 10,
  },
  modeButtonActive: {
    backgroundColor: '#FFFFFF',
  },
  modeText: {
    color: TkimphPalette.muted,
    fontSize: 13,
    fontWeight: '900',
  },
  modeTextActive: {
    color: TkimphPalette.green,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EAEEF4',
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    marginTop: 12,
    padding: 14,
  },
  sectionTitle: {
    color: TkimphPalette.ink,
    fontSize: 16,
    fontWeight: '900',
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
  textArea: {
    minHeight: 78,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  lineItem: {
    alignItems: 'flex-start',
    borderBottomColor: '#F1F3F6',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingBottom: 12,
  },
  lineImage: {
    backgroundColor: '#DDE3EA',
    borderRadius: 10,
    height: 54,
    width: 54,
  },
  lineBody: {
    flex: 1,
  },
  lineName: {
    color: TkimphPalette.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  lineTotal: {
    color: TkimphPalette.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  stepper: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  stepButton: {
    alignItems: 'center',
    backgroundColor: '#EEF0F4',
    borderRadius: 13,
    height: 26,
    justifyContent: 'center',
    width: 26,
  },
  stepQty: {
    color: TkimphPalette.ink,
    fontSize: 13,
    fontWeight: '900',
    minWidth: 18,
    textAlign: 'center',
  },
  paymentRow: {
    flexDirection: 'row',
    gap: 8,
  },
  paymentButton: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E4E7EC',
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 11,
  },
  paymentButtonActive: {
    backgroundColor: '#E8F3ED',
    borderColor: TkimphPalette.green,
  },
  paymentButtonDisabled: {
    opacity: 0.56,
  },
  paymentText: {
    color: TkimphPalette.muted,
    fontSize: 12,
    fontWeight: '900',
  },
  paymentTextActive: {
    color: TkimphPalette.green,
  },
  promoRow: {
    flexDirection: 'row',
    gap: 8,
  },
  promoInput: {
    flex: 1,
  },
  applyButton: {
    alignItems: 'center',
    backgroundColor: TkimphPalette.green,
    borderRadius: 12,
    justifyContent: 'center',
    minWidth: 76,
  },
  applyText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  message: {
    color: TkimphPalette.primary,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
    marginTop: 4,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EAEEF4',
    borderRadius: 16,
    borderWidth: 1,
    gap: 9,
    marginTop: 12,
    padding: 14,
  },
  summaryLine: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    color: TkimphPalette.muted,
    fontSize: 14,
    fontWeight: '700',
  },
  summaryValue: {
    color: TkimphPalette.ink,
    fontSize: 14,
    fontWeight: '800',
  },
  summaryStrong: {
    color: TkimphPalette.ink,
    fontSize: 17,
    fontWeight: '900',
  },
  summaryHighlight: {
    color: '#047857',
  },
  summaryDivider: {
    backgroundColor: '#EAEEF4',
    height: 1,
  },
  placeButton: {
    alignItems: 'center',
    backgroundColor: TkimphPalette.green,
    borderRadius: 12,
    justifyContent: 'center',
    marginTop: 6,
    minHeight: 50,
  },
  placeButtonDisabled: {
    opacity: 0.55,
  },
  placeButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
});
