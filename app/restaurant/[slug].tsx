import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LoadingState } from '@/components/loading-state';
import { useCart } from '@/contexts/cart-context';
import { TkimphPalette } from '@/constants/theme';
import { blurActiveElement } from '@/lib/focus';
import {
  fetchPublicRestaurantBySlug,
  publicFileUrl,
  PublicMenuGroup,
  PublicMenuItem,
  PublicRestaurant,
} from '@/lib/api';

function formatPhp(value: string | number) {
  const amount = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(amount)) return '\u20B10.00';
  return `\u20B1${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatRating(restaurant: PublicRestaurant) {
  const count = restaurant.review_count ?? 0;
  if (count <= 0) return 'New';
  const rating = restaurant.rating ?? 0;
  return rating % 1 < 0.05 ? String(Math.round(rating)) : rating.toFixed(1);
}

function deliveryText(fee?: number) {
  if (typeof fee !== 'number') return 'Delivery set by admin';
  return `Standard delivery ${formatPhp(fee)}`;
}

export default function RestaurantDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ slug?: string; expedition?: string }>();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const [restaurant, setRestaurant] = useState<PublicRestaurant | null>(null);
  const [menus, setMenus] = useState<PublicMenuGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);
  const [deliveryMode, setDeliveryMode] = useState<'delivery' | 'pickup'>(
    params.expedition === 'pickup' ? 'pickup' : 'delivery'
  );
  const [selectedItem, setSelectedItem] = useState<PublicMenuItem | null>(null);
  const [selectedQty, setSelectedQty] = useState(1);
  const { cart, cartCount, cartTotal, clearCart, registerCartRestaurant, setLineQuantity, setQty } = useCart();

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchPublicRestaurantBySlug(slug)
      .then((response) => {
        if (cancelled) return;
        setRestaurant(response.restaurant);
        setMenus(response.menus);
        setActiveMenuId(response.menus[0]?.menu.id ?? null);
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message || 'Restaurant not found.');
          setRestaurant(null);
          setMenus([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (restaurant) registerCartRestaurant(restaurant);
  }, [registerCartRestaurant, restaurant]);

  const filteredMenus = useMemo(() => {
    const clean = query.trim().toLowerCase();
    if (!clean) return menus;
    return menus
      .map((group) => ({
        ...group,
        items: group.items.filter(
          (item) =>
            item.name.toLowerCase().includes(clean) ||
            (item.description?.toLowerCase().includes(clean) ?? false)
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [menus, query]);

  const visibleMenus = activeMenuId
    ? filteredMenus.filter((group) => group.menu.id === activeMenuId)
    : filteredMenus;
  const deliveryFee = restaurant?.standard_delivery_fee_php ?? restaurant?.delivery_fee_php;
  const headerImage = publicFileUrl(restaurant?.profile_image_path, restaurant?.profile_image_url);

  function openItem(item: PublicMenuItem) {
    const line = cart.find((entry) => entry.item.id === item.id);
    setSelectedQty(line?.qty ?? 1);
    setSelectedItem(item);
  }

  function addSelectedItem() {
    if (!selectedItem) return;
    setLineQuantity(selectedItem, selectedQty);
    setSelectedItem(null);
  }

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
        <Text style={styles.topTitle} numberOfLines={1}>{restaurant?.name ?? 'Restaurant'}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            blurActiveElement();
            router.push('/checkout' as never);
          }}
          style={styles.roundButton}
        >
          <MaterialIcons color={TkimphPalette.ink} name="shopping-bag" size={21} />
          {cartCount > 0 ? <View style={styles.cartBadge}><Text style={styles.cartBadgeText}>{cartCount}</Text></View> : null}
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.centerState}>
          <LoadingState label="Loading menu..." />
        </View>
      ) : error || !restaurant ? (
        <View style={styles.centerState}>
          <MaterialIcons color={TkimphPalette.primary} name="storefront" size={44} />
          <Text style={styles.errorTitle}>Restaurant unavailable</Text>
          <Text style={styles.stateText}>{error ?? 'This restaurant could not be loaded.'}</Text>
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={[styles.content, cartCount > 0 && styles.contentWithCart]} showsVerticalScrollIndicator={false}>
            <View style={styles.heroCard}>
              {headerImage ? <Image source={{ uri: headerImage }} style={styles.heroImage} /> : <View style={styles.heroImage} />}
              <View style={styles.heroBody}>
                <Text style={styles.cuisine}>{[restaurant.cuisine?.name, restaurant.business_type?.name].filter(Boolean).join(' | ') || 'Restaurant'}</Text>
                <Text style={styles.restaurantName}>{restaurant.name}</Text>
                {restaurant.description ? <Text style={styles.description}>{restaurant.description}</Text> : null}
                <View style={styles.metaRow}>
                  <MaterialIcons color="#F59E0B" name="star" size={16} />
                  <Text style={styles.metaText}>{formatRating(restaurant)} ({restaurant.review_count ?? 0})</Text>
                  <Text style={styles.metaDot}>|</Text>
                  <Text style={styles.metaText}>
                    {restaurant.delivery_min_minutes ?? 15}-{restaurant.delivery_max_minutes ?? 30} min
                  </Text>
                </View>
                <View style={styles.metaRow}>
                  <MaterialIcons color={TkimphPalette.green} name="delivery-dining" size={17} />
                  <Text style={styles.metaStrong}>{deliveryText(deliveryFee)}</Text>
                </View>
                {restaurant.address ? (
                  <View style={styles.metaRow}>
                    <MaterialIcons color={TkimphPalette.muted} name="place" size={16} />
                    <Text style={styles.address} numberOfLines={2}>{restaurant.address}</Text>
                  </View>
                ) : null}
              </View>
            </View>

            <View style={styles.dealSection}>
              <Text style={styles.sectionTitle}>Available deals</Text>
              {restaurant.promotions?.length ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dealRow}>
                  {restaurant.promotions.slice(0, 4).map((promo) => (
                    <View key={promo.id} style={styles.dealCard}>
                      <MaterialIcons color={TkimphPalette.green} name="local-offer" size={20} />
                      <View style={styles.dealText}>
                        <Text style={styles.dealTitle}>{promo.code} - {promo.name}</Text>
                        <Text style={styles.dealCopy} numberOfLines={2}>{promo.display_label}</Text>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              ) : (
                <View style={styles.emptyDeal}>
                  <MaterialIcons color={TkimphPalette.green} name="local-offer" size={20} />
                  <Text style={styles.emptyDealText}>Deals appear here when this restaurant has active promos.</Text>
                </View>
              )}
            </View>

            <View style={styles.search}>
              <MaterialIcons color={TkimphPalette.muted} name="search" size={20} />
              <TextInput
                placeholder="Search in menu"
                placeholderTextColor={TkimphPalette.muted}
                value={query}
                onChangeText={setQuery}
                style={styles.searchInput}
              />
            </View>

            <View style={styles.modeRow}>
              {(['delivery', 'pickup'] as const).map((mode) => (
                <Pressable key={mode} onPress={() => setDeliveryMode(mode)} style={[styles.modeButton, deliveryMode === mode && styles.modeButtonActive]}>
                  <Text style={[styles.modeText, deliveryMode === mode && styles.modeTextActive]}>{mode === 'delivery' ? 'Delivery' : 'Pick-up'}</Text>
                </Pressable>
              ))}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
              {menus.map((group) => {
                const active = activeMenuId === group.menu.id;
                const count = filteredMenus.find((entry) => entry.menu.id === group.menu.id)?.items.length ?? 0;
                return (
                  <Pressable key={group.menu.id} onPress={() => setActiveMenuId(group.menu.id)} style={[styles.menuTab, active && styles.menuTabActive]}>
                    <Text style={[styles.menuTabText, active && styles.menuTabTextActive]}>{group.menu.name} ({count})</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {visibleMenus.length === 0 ? (
              <View style={styles.emptyMenu}>
                <MaterialIcons color={TkimphPalette.muted} name="restaurant-menu" size={36} />
                <Text style={styles.stateText}>{query.trim() ? 'No dishes match your search.' : 'No menu items yet.'}</Text>
              </View>
            ) : (
              visibleMenus.map((group) => (
                <View key={group.menu.id} style={styles.menuGroup}>
                  <Text style={styles.groupTitle}>{group.menu.name}</Text>
                  {group.items.map((item) => {
                    const img = publicFileUrl(item.image_path, item.image_url);
                    const line = cart.find((entry) => entry.item.id === item.id);
                    const hasDiscount = Boolean(item.has_discount) && Number(item.original_price ?? 0) > Number(item.price);
                    return (
                      <Pressable key={item.id} onPress={() => openItem(item)} style={styles.itemCard}>
                        <View style={styles.itemBody}>
                          <Text style={styles.itemName}>{item.name}</Text>
                          <View style={styles.priceRow}>
                            <Text style={styles.itemPrice}>{formatPhp(item.price)}</Text>
                            {hasDiscount ? <Text style={styles.originalPrice}>{formatPhp(item.original_price ?? item.price)}</Text> : null}
                          </View>
                          {hasDiscount ? <Text style={styles.discountText}>{item.discount_percent}% off on this dish</Text> : null}
                          {item.description ? <Text style={styles.itemDescription} numberOfLines={3}>{item.description}</Text> : null}
                        </View>
                        <View style={styles.itemImageWrap}>
                          {img ? (
                            <Image source={{ uri: img }} style={styles.itemImage} resizeMode="cover" />
                          ) : (
                            <View style={[styles.itemImage, styles.itemImageFallback]}>
                              <MaterialIcons color={TkimphPalette.muted} name="restaurant" size={28} />
                            </View>
                          )}
                          <View style={styles.addBubble}>
                            <Text style={styles.addBubbleText}>{line ? line.qty : '+'}</Text>
                          </View>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              ))
            )}
          </ScrollView>

          {cartCount > 0 ? (
            <View style={styles.cartBar}>
              <Pressable accessibilityRole="button" onPress={clearCart} style={styles.clearCartButton}>
                <MaterialIcons color={TkimphPalette.primary} name="delete-outline" size={22} />
              </Pressable>
              <View>
                <Text style={styles.cartBarLabel}>{cartCount} items</Text>
                <Text style={styles.cartBarTotal}>{formatPhp(cartTotal)}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  blurActiveElement();
                  router.push({ pathname: '/checkout', params: { expedition: deliveryMode } } as never);
                }}
                style={styles.checkoutButton}>
                <Text style={styles.checkoutButtonText}>Review payment and address</Text>
              </Pressable>
            </View>
          ) : null}
        </>
      )}

      <ItemModal
        item={selectedItem}
        inCartQty={selectedItem ? cart.find((entry) => entry.item.id === selectedItem.id)?.qty ?? 0 : 0}
        quantity={selectedQty}
        onClose={() => setSelectedItem(null)}
        onQuantityChange={setSelectedQty}
        onAdd={addSelectedItem}
        onRemove={() => {
          if (selectedItem) setQty(selectedItem.id, 0);
          setSelectedItem(null);
        }}
      />
    </SafeAreaView>
  );
}

function ItemModal({
  item,
  inCartQty,
  quantity,
  onClose,
  onQuantityChange,
  onAdd,
  onRemove,
}: {
  item: PublicMenuItem | null;
  inCartQty: number;
  quantity: number;
  onClose: () => void;
  onQuantityChange: (quantity: number) => void;
  onAdd: () => void;
  onRemove: () => void;
}) {
  const image = publicFileUrl(item?.image_path, item?.image_url);
  const hasDiscount = Boolean(item?.has_discount) && Number(item?.original_price ?? 0) > Number(item?.price ?? 0);

  return (
    <Modal animationType="slide" transparent visible={Boolean(item)} onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <Pressable style={styles.modalScrim} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          {image ? <Image source={{ uri: image }} style={styles.sheetImage} /> : <View style={styles.sheetImage} />}
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.sheetClose}>
            <MaterialIcons color={TkimphPalette.ink} name="close" size={21} />
          </Pressable>
          <View style={styles.sheetBody}>
            <Text style={styles.sheetTitle}>{item?.name}</Text>
            <View style={styles.priceRow}>
              <Text style={styles.sheetPrice}>{formatPhp(item?.price ?? 0)}</Text>
              {hasDiscount ? <Text style={styles.originalPrice}>{formatPhp(item?.original_price ?? item?.price ?? 0)}</Text> : null}
            </View>
            {hasDiscount ? <Text style={styles.discountText}>{item?.discount_percent}% off</Text> : null}
            {item?.description ? <Text style={styles.sheetDescription}>{item.description}</Text> : null}
          </View>
          <View style={styles.sheetFooter}>
            <View style={styles.stepper}>
              <Pressable onPress={() => onQuantityChange(Math.max(1, quantity - 1))} style={styles.stepButton}>
                <MaterialIcons color={TkimphPalette.ink} name="remove" size={18} />
              </Pressable>
              <Text style={styles.stepQty}>{quantity}</Text>
              <Pressable onPress={() => onQuantityChange(quantity + 1)} style={styles.stepButton}>
                <MaterialIcons color={TkimphPalette.ink} name="add" size={18} />
              </Pressable>
            </View>
            <Pressable onPress={onAdd} style={styles.addButton}>
              <Text style={styles.addButtonText}>Add to cart</Text>
            </Pressable>
          </View>
          {inCartQty > 0 ? (
            <Pressable onPress={onRemove} style={styles.removeButton}>
              <MaterialIcons color={TkimphPalette.primary} name="delete-outline" size={18} />
              <Text style={styles.removeButtonText}>Remove from cart</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: '#F7F8FA',
    flex: 1,
  },
  topBar: {
    alignItems: 'center',
    backgroundColor: '#F7F8FA',
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
    fontSize: 16,
    fontWeight: '900',
  },
  cartBadge: {
    alignItems: 'center',
    backgroundColor: TkimphPalette.yellow,
    borderRadius: 8,
    height: 16,
    justifyContent: 'center',
    position: 'absolute',
    right: -1,
    top: -2,
    minWidth: 16,
  },
  cartBadgeText: {
    color: '#111827',
    fontSize: 9,
    fontWeight: '900',
  },
  content: {
    padding: 14,
    paddingBottom: 24,
  },
  contentWithCart: {
    paddingBottom: 126,
  },
  centerState: {
    alignItems: 'center',
    flex: 1,
    gap: 10,
    justifyContent: 'center',
    padding: 28,
  },
  stateText: {
    color: TkimphPalette.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  errorTitle: {
    color: TkimphPalette.ink,
    fontSize: 19,
    fontWeight: '900',
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EAEEF4',
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    ...Platform.select({
      web: { boxShadow: '0 3px 8px rgba(16, 24, 40, 0.08)' },
      default: { elevation: 2, shadowColor: '#101828', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 8 },
    }),
  },
  heroImage: {
    backgroundColor: '#DDE3EA',
    height: 172,
    width: '100%',
  },
  heroBody: {
    padding: 14,
  },
  cuisine: {
    color: TkimphPalette.green,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  restaurantName: {
    color: TkimphPalette.ink,
    fontSize: 24,
    fontWeight: '900',
    marginTop: 4,
  },
  description: {
    color: TkimphPalette.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 7,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  metaText: {
    color: '#667085',
    fontSize: 13,
    fontWeight: '700',
  },
  metaDot: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '900',
  },
  metaStrong: {
    color: TkimphPalette.green,
    fontSize: 13,
    fontWeight: '900',
  },
  address: {
    color: TkimphPalette.muted,
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
  },
  dealSection: {
    marginTop: 18,
  },
  sectionTitle: {
    color: TkimphPalette.ink,
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 10,
  },
  dealRow: {
    gap: 10,
  },
  dealCard: {
    alignItems: 'center',
    backgroundColor: '#ECFDF3',
    borderColor: '#BBF7D0',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    width: 270,
  },
  dealText: {
    flex: 1,
  },
  dealTitle: {
    color: '#14532D',
    fontSize: 13,
    fontWeight: '900',
  },
  dealCopy: {
    color: '#166534',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  emptyDeal: {
    alignItems: 'center',
    backgroundColor: '#ECFDF3',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 10,
    padding: 12,
  },
  emptyDealText: {
    color: '#166534',
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  search: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#EAEEF4',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    marginTop: 18,
    paddingHorizontal: 14,
  },
  searchInput: {
    color: TkimphPalette.ink,
    flex: 1,
    fontSize: 15,
    minHeight: 48,
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
    paddingVertical: 9,
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
  tabRow: {
    gap: 8,
    paddingVertical: 14,
  },
  menuTab: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E4E7EC',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  menuTabActive: {
    backgroundColor: TkimphPalette.green,
    borderColor: TkimphPalette.green,
  },
  menuTabText: {
    color: '#344054',
    fontSize: 12,
    fontWeight: '900',
  },
  menuTabTextActive: {
    color: '#FFFFFF',
  },
  emptyMenu: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 42,
  },
  menuGroup: {
    marginBottom: 22,
  },
  groupTitle: {
    color: TkimphPalette.ink,
    fontSize: 19,
    fontWeight: '900',
    marginBottom: 10,
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EAEEF4',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 10,
    minHeight: 120,
    overflow: 'hidden',
  },
  itemBody: {
    flex: 1,
    justifyContent: 'center',
    padding: 12,
  },
  itemName: {
    color: TkimphPalette.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  priceRow: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: 8,
    marginTop: 5,
  },
  itemPrice: {
    color: TkimphPalette.green,
    fontSize: 14,
    fontWeight: '900',
  },
  originalPrice: {
    color: TkimphPalette.muted,
    fontSize: 12,
    fontWeight: '700',
    textDecorationLine: 'line-through',
  },
  discountText: {
    color: '#047857',
    fontSize: 11,
    fontWeight: '900',
    marginTop: 4,
  },
  itemDescription: {
    color: TkimphPalette.muted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 5,
  },
  itemImageWrap: {
    backgroundColor: '#DDE3EA',
    height: 132,
    position: 'relative',
    width: 112,
  },
  itemImage: {
    backgroundColor: '#DDE3EA',
    height: 132,
    width: 112,
  },
  itemImageFallback: {
    alignItems: 'center',
    backgroundColor: '#EEF2F6',
    justifyContent: 'center',
  },
  addBubble: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#00000018',
    borderRadius: 18,
    borderWidth: 1,
    bottom: 9,
    height: 34,
    justifyContent: 'center',
    position: 'absolute',
    right: 9,
    width: 34,
  },
  addBubbleText: {
    color: TkimphPalette.ink,
    fontSize: 18,
    fontWeight: '900',
  },
  cartBar: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderTopColor: '#EAEEF4',
    borderTopWidth: 1,
    bottom: 0,
    flexDirection: 'row',
    gap: 12,
    left: 0,
    padding: 14,
    paddingBottom: 18,
    position: 'absolute',
    right: 0,
  },
  cartBarLabel: {
    color: TkimphPalette.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  cartBarTotal: {
    color: TkimphPalette.ink,
    fontSize: 17,
    fontWeight: '900',
  },
  checkoutButton: {
    alignItems: 'center',
    backgroundColor: TkimphPalette.green,
    borderRadius: 12,
    flex: 1,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  checkoutButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
  },
  clearCartButton: {
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
    borderRadius: 12,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalScrim: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    maxHeight: '88%',
    overflow: 'hidden',
  },
  sheetHandle: {
    alignSelf: 'center',
    backgroundColor: '#D0D5DD',
    borderRadius: 999,
    height: 4,
    marginVertical: 9,
    width: 42,
  },
  sheetImage: {
    backgroundColor: '#DDE3EA',
    height: 210,
    width: '100%',
  },
  sheetClose: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    position: 'absolute',
    right: 14,
    top: 20,
    width: 36,
  },
  sheetBody: {
    padding: 16,
  },
  sheetTitle: {
    color: TkimphPalette.ink,
    fontSize: 20,
    fontWeight: '900',
  },
  sheetPrice: {
    color: TkimphPalette.ink,
    fontSize: 20,
    fontWeight: '900',
  },
  sheetDescription: {
    color: TkimphPalette.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 10,
  },
  sheetFooter: {
    alignItems: 'center',
    borderTopColor: '#EAEEF4',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  stepper: {
    alignItems: 'center',
    backgroundColor: '#F2F4F7',
    borderRadius: 18,
    flexDirection: 'row',
    gap: 4,
    padding: 4,
  },
  stepButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  stepQty: {
    color: TkimphPalette.ink,
    fontSize: 14,
    fontWeight: '900',
    minWidth: 24,
    textAlign: 'center',
  },
  addButton: {
    alignItems: 'center',
    backgroundColor: TkimphPalette.green,
    borderRadius: 12,
    flex: 1,
    minHeight: 48,
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  removeButton: {
    alignItems: 'center',
    borderTopColor: '#EAEEF4',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 48,
  },
  removeButtonText: {
    color: TkimphPalette.primary,
    fontSize: 14,
    fontWeight: '900',
  },
});
