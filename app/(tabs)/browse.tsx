import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { LoadingState } from '@/components/loading-state';
import { MobileShell } from '@/components/mobile-shell';
import { TkimphPalette } from '@/constants/theme';
import { useCart } from '@/contexts/cart-context';
import { fetchPublicRestaurantsMenuFeed, publicFileUrl, RestaurantWithMenusFeed } from '@/lib/api';
import { blurActiveElement } from '@/lib/focus';

type BrowseMode = 'restaurants' | 'food';
type SortMode = 'relevance' | 'rating' | 'delivery';
type FoodResult = {
  groupName: string;
  item: RestaurantWithMenusFeed['menus'][number]['items'][number];
  restaurant: RestaurantWithMenusFeed['restaurant'];
};

function deliveryText(fee?: number) {
  if (typeof fee !== 'number') return 'Delivery set by admin';
  return `Standard delivery \u20B1${fee}`;
}

export default function BrowseScreen() {
  const [feed, setFeed] = useState<RestaurantWithMenusFeed[]>([]);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [mode, setMode] = useState<BrowseMode>('restaurants');
  const [activeChip, setActiveChip] = useState('All');
  const [sortMode, setSortMode] = useState<SortMode>('relevance');
  const [loading, setLoading] = useState(true);
  const [selectedFood, setSelectedFood] = useState<FoodResult | null>(null);
  const [selectedQty, setSelectedQty] = useState(1);
  const params = useLocalSearchParams<{ q?: string }>();
  const router = useRouter();
  const { cart, cartCount, cartRestaurant, registerCartRestaurant, setLineQuantity } = useCart();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    setLoading(true);
    fetchPublicRestaurantsMenuFeed(10, undefined, debouncedQuery)
      .then((response) => setFeed(response.data))
      .catch(() => setFeed([]))
      .finally(() => setLoading(false));
  }, [debouncedQuery]);

  useEffect(() => {
    if (typeof params.q === 'string') setQuery(params.q);
  }, [params.q]);

  const chips = useMemo(() => {
    const values = feed.flatMap((entry) =>
      mode === 'restaurants'
        ? [entry.restaurant.cuisine?.name, entry.restaurant.business_type?.name]
        : entry.menus.flatMap((group) => [group.menu.name, ...group.items.map((item) => item.name)])
    );
    return ['All', ...Array.from(new Set(values.filter((value): value is string => Boolean(value?.trim())))).slice(0, 8)];
  }, [feed, mode]);

  const foodResults = useMemo(
    () =>
      feed.flatMap((entry) =>
        entry.menus.flatMap((group) =>
          group.items.map((item) => ({
            groupName: group.menu.name,
            item,
            restaurant: entry.restaurant,
          }))
        )
      ),
    [feed]
  );

  const filteredFeed = feed.filter((entry) => {
    const clean = query.trim().toLowerCase();
    const chip = activeChip === 'All' ? '' : activeChip.toLowerCase();
    const dishes = entry.menus
      .flatMap((group) => [group.menu.name, ...group.items.map((item) => `${item.name} ${item.description ?? ''} ${item.price}`)])
      .join(' ');
    const haystack =
      `${entry.restaurant.name} ${entry.restaurant.description ?? ''} ${entry.restaurant.cuisine?.name ?? ''} ${entry.restaurant.business_type?.name ?? ''} ${entry.restaurant.address ?? ''} ${dishes}`.toLowerCase();
    if (chip && !haystack.includes(chip)) return false;
    if (!clean) return true;
    return haystack.includes(clean);
  }).sort(sortRestaurants(sortMode));

  const filteredFood = foodResults
    .filter((entry) => {
      const clean = query.trim().toLowerCase();
      const chip = activeChip === 'All' ? '' : activeChip.toLowerCase();
      const haystack =
        `${entry.item.name} ${entry.item.description ?? ''} ${entry.item.price} ${entry.groupName} ${entry.restaurant.name} ${entry.restaurant.cuisine?.name ?? ''}`.toLowerCase();
      if (chip && !haystack.includes(chip)) return false;
      if (!clean) return true;
      return haystack.includes(clean);
    })
    .sort(sortFood(sortMode));
  const hasSearch = debouncedQuery.length > 0;

  function cycleSortMode() {
    setSortMode((current) => (current === 'relevance' ? 'rating' : current === 'rating' ? 'delivery' : 'relevance'));
  }

  function updateMode(nextMode: BrowseMode) {
    setMode(nextMode);
    setActiveChip('All');
  }

  function openFood(food: FoodResult) {
    blurActiveElement();
    const existing = cart.find((line) => line.item.id === food.item.id);
    setSelectedQty(existing?.qty ?? 1);
    setSelectedFood(food);
  }

  function addSelectedFood() {
    if (!selectedFood) return;
    registerCartRestaurant(selectedFood.restaurant);
    setLineQuantity(selectedFood.item, selectedQty);
    setSelectedFood(null);
  }

  return (
    <MobileShell>
      <Text style={styles.title}>Browse</Text>
      {cartCount > 0 ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            blurActiveElement();
            router.push('/cart' as never);
          }}
          style={styles.cartStrip}
        >
          <View>
            <Text style={styles.cartStripTitle}>
              {cartCount} item{cartCount > 1 ? 's' : ''} in cart
            </Text>
            <Text style={styles.cartStripMeta}>{cartRestaurant?.name ?? 'Ready to checkout'}</Text>
          </View>
          <MaterialIcons color="#FFFFFF" name="shopping-cart" size={20} />
        </Pressable>
      ) : null}
      <View style={styles.search}>
        <MaterialIcons color={TkimphPalette.muted} name="search" size={20} />
        <TextInput
          placeholder="Search restaurants or food..."
          placeholderTextColor={TkimphPalette.muted}
          value={query}
          onChangeText={setQuery}
          style={styles.searchInput}
        />
        <Pressable accessibilityLabel={`Sort by ${sortLabel(sortMode)}`} accessibilityRole="button" hitSlop={8} onPress={cycleSortMode}>
          <MaterialIcons color={TkimphPalette.muted} name="filter-list" size={20} />
        </Pressable>
      </View>
      <Text style={styles.sortText}>Sorted by {sortLabel(sortMode)}</Text>

      <View style={styles.segmentRow}>
        <Pressable style={mode === 'restaurants' ? styles.segmentActive : styles.segment} onPress={() => updateMode('restaurants')}>
          <Text style={mode === 'restaurants' ? styles.segmentActiveText : styles.segmentText}>Restaurants</Text>
        </Pressable>
        <Pressable style={mode === 'food' ? styles.segmentActive : styles.segment} onPress={() => updateMode('food')}>
          <Text style={mode === 'food' ? styles.segmentActiveText : styles.segmentText}>Food</Text>
        </Pressable>
      </View>

      <View style={styles.chipRow}>
        {chips.map((chip) => (
          <Pressable key={chip} style={[styles.chip, activeChip === chip && styles.chipActive]} onPress={() => setActiveChip(chip)}>
            <Text style={[styles.chipText, activeChip === chip && styles.chipActiveText]}>{chip}</Text>
          </Pressable>
        ))}
      </View>

      {loading ? <LoadingState compact label="Loading browse results..." /> : null}

      {!loading && hasSearch ? (
        <Text style={styles.resultSummary}>
          {filteredFeed.length + filteredFood.length} results for {query.trim()}
        </Text>
      ) : null}

      {!loading && hasSearch && filteredFeed.length + filteredFood.length === 0 ? (
        <Text style={styles.emptyText}>No restaurants or food items match your search.</Text>
      ) : null}

      {!loading && hasSearch && filteredFood.length > 0 ? <Text style={styles.groupTitle}>Food matches</Text> : null}
      {!loading && (hasSearch ? filteredFood : mode === 'food' ? filteredFood : []).map((food) => {
        const { groupName, item, restaurant } = food;
        const imageUrl = publicFileUrl(item.image_path, item.image_url);
        return (
          <Pressable
            key={`${restaurant.id}-${item.id}`}
            onPress={() => openFood(food)}
            style={styles.foodCard}>
            {imageUrl ? <Image source={{ uri: imageUrl }} style={styles.foodImage} /> : <View style={styles.foodImage} />}
            <View style={styles.foodBody}>
              <Text style={styles.foodName}>{item.name}</Text>
              <Text numberOfLines={2} style={styles.foodDescription}>{item.description || groupName}</Text>
              <View style={styles.foodFooter}>
                <Text style={styles.price}>₱{item.price}</Text>
                <Text style={styles.metaText}>{restaurant.name}</Text>
              </View>
            </View>
            <View style={styles.addPill}>
              <MaterialIcons color="#FFFFFF" name="add" size={18} />
            </View>
          </Pressable>
        );
      })}

      {!loading && hasSearch && filteredFeed.length > 0 ? <Text style={styles.groupTitle}>Restaurant matches</Text> : null}
      {!loading && (hasSearch ? filteredFeed : mode === 'restaurants' ? filteredFeed : []).map((entry) => {
        const restaurant = entry.restaurant;
        const imageUrl = publicFileUrl(restaurant.profile_image_path, restaurant.profile_image_url);
        const deliveryFee = restaurant.standard_delivery_fee_php ?? restaurant.delivery_fee_php;
        const eta =
          restaurant.delivery_min_minutes != null && restaurant.delivery_max_minutes != null
            ? `${restaurant.delivery_min_minutes}-${restaurant.delivery_max_minutes} min`
            : '15-25 min';
        return (
          <Pressable
            key={restaurant.id}
            disabled={!restaurant.slug}
            onPress={() => {
              if (restaurant.slug) {
                blurActiveElement();
                router.push(`/restaurant/${encodeURIComponent(restaurant.slug)}` as never);
              }
            }}
            style={styles.card}>
            {imageUrl ? <Image source={{ uri: imageUrl }} style={styles.image} /> : <View style={styles.image} />}
            <View style={styles.cardBody}>
              <View style={styles.rowBetween}>
                <Text style={styles.name}>{restaurant.name}</Text>
                <View style={styles.tag}>
                  <Text style={styles.tagText}>{restaurant.cuisine?.name || 'Food'}</Text>
                </View>
              </View>
              <View style={styles.metaLine}>
                <MaterialIcons color="#FFC107" name="star" size={14} />
                <Text style={styles.metaText}>{restaurant.review_count ? restaurant.rating?.toFixed(1) : 'New'}</Text>
                <Text style={styles.metaText}>{eta}</Text>
                <Text style={styles.metaText}>{deliveryText(deliveryFee)}</Text>
              </View>
            </View>
          </Pressable>
        );
      })}

      {!loading && !hasSearch && mode === 'restaurants' && filteredFeed.length === 0 ? (
        <Text style={styles.emptyText}>No restaurants match this filter.</Text>
      ) : null}
      {!loading && !hasSearch && mode === 'food' && filteredFood.length === 0 ? <Text style={styles.emptyText}>No food items match this filter.</Text> : null}

      <Modal animationType="slide" transparent visible={Boolean(selectedFood)} onRequestClose={() => setSelectedFood(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setSelectedFood(null)}>
          <Pressable style={styles.quickAddPanel} onPress={(event) => event.stopPropagation()}>
            <View style={styles.modalHandle} />
            <View style={styles.modalTop}>
              <Text style={styles.modalTitle}>Add to cart</Text>
              <Pressable accessibilityRole="button" hitSlop={8} onPress={() => setSelectedFood(null)}>
                <MaterialIcons color={TkimphPalette.muted} name="close" size={24} />
              </Pressable>
            </View>
            {selectedFood ? (
              <>
                <View style={styles.selectedRow}>
                  {publicFileUrl(selectedFood.item.image_path, selectedFood.item.image_url) ? (
                    <Image source={{ uri: publicFileUrl(selectedFood.item.image_path, selectedFood.item.image_url)! }} style={styles.selectedImage} />
                  ) : (
                    <View style={styles.selectedImage} />
                  )}
                  <View style={styles.selectedBody}>
                    <Text style={styles.selectedName}>{selectedFood.item.name}</Text>
                    <Text style={styles.selectedRestaurant}>{selectedFood.restaurant.name}</Text>
                    <Text style={styles.selectedPrice}>{`\u20B1${selectedFood.item.price}`}</Text>
                  </View>
                </View>
                <View style={styles.qtyRow}>
                  <Pressable onPress={() => setSelectedQty((qty) => Math.max(1, qty - 1))} style={styles.qtyButton}>
                    <MaterialIcons color={TkimphPalette.ink} name="remove" size={20} />
                  </Pressable>
                  <Text style={styles.qtyText}>{selectedQty}</Text>
                  <Pressable onPress={() => setSelectedQty((qty) => qty + 1)} style={styles.qtyButton}>
                    <MaterialIcons color={TkimphPalette.ink} name="add" size={20} />
                  </Pressable>
                </View>
                {cartRestaurant && cartRestaurant.id !== selectedFood.restaurant.id ? (
                  <Text style={styles.cartWarning}>Adding this will replace your cart from {cartRestaurant.name}.</Text>
                ) : null}
                <Pressable onPress={addSelectedFood} style={styles.primaryButton}>
                  <Text style={styles.primaryButtonText}>Add {selectedQty} to cart</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    addSelectedFood();
                    blurActiveElement();
                    router.push('/cart' as never);
                  }}
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryButtonText}>Add and view cart</Text>
                </Pressable>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </MobileShell>
  );
}

function sortLabel(sortMode: SortMode) {
  if (sortMode === 'rating') return 'rating';
  if (sortMode === 'delivery') return 'delivery fee';
  return 'relevance';
}

function sortRestaurants(sortMode: SortMode) {
  return (a: RestaurantWithMenusFeed, b: RestaurantWithMenusFeed) => {
    if (sortMode === 'rating') return (b.restaurant.rating ?? 0) - (a.restaurant.rating ?? 0);
    if (sortMode === 'delivery') {
      const aFee = a.restaurant.standard_delivery_fee_php ?? a.restaurant.delivery_fee_php ?? Number.MAX_SAFE_INTEGER;
      const bFee = b.restaurant.standard_delivery_fee_php ?? b.restaurant.delivery_fee_php ?? Number.MAX_SAFE_INTEGER;
      return aFee - bFee;
    }
    return 0;
  };
}

function sortFood(sortMode: SortMode) {
  return (
    a: { item: RestaurantWithMenusFeed['menus'][number]['items'][number]; restaurant: RestaurantWithMenusFeed['restaurant'] },
    b: { item: RestaurantWithMenusFeed['menus'][number]['items'][number]; restaurant: RestaurantWithMenusFeed['restaurant'] }
  ) => {
    if (sortMode === 'rating') return (b.item.rating ?? 0) - (a.item.rating ?? 0);
    if (sortMode === 'delivery') {
      const aFee = a.restaurant.standard_delivery_fee_php ?? a.restaurant.delivery_fee_php ?? Number.MAX_SAFE_INTEGER;
      const bFee = b.restaurant.standard_delivery_fee_php ?? b.restaurant.delivery_fee_php ?? Number.MAX_SAFE_INTEGER;
      return aFee - bFee;
    }
    return 0;
  };
}

const styles = StyleSheet.create({
  title: {
    color: TkimphPalette.ink,
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 14,
  },
  search: {
    alignItems: 'center',
    backgroundColor: '#F2F4F7',
    borderRadius: 15,
    flexDirection: 'row',
    gap: 10,
    minHeight: 45,
    paddingHorizontal: 14,
  },
  searchInput: {
    color: TkimphPalette.muted,
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    minHeight: 45,
  },
  sortText: {
    color: TkimphPalette.muted,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 7,
    textAlign: 'right',
  },
  resultSummary: {
    color: TkimphPalette.muted,
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 10,
  },
  groupTitle: {
    color: TkimphPalette.ink,
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 10,
    marginTop: 4,
  },
  emptyText: {
    color: TkimphPalette.muted,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    marginTop: 16,
    textAlign: 'center',
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  segmentActive: {
    backgroundColor: TkimphPalette.green,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  segment: {
    backgroundColor: '#EEF0F4',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  segmentActiveText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  segmentText: {
    color: '#667085',
    fontSize: 13,
    fontWeight: '900',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
    marginTop: 12,
  },
  chip: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E4E7EC',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipActive: {
    backgroundColor: TkimphPalette.green,
    borderColor: TkimphPalette.green,
  },
  chipText: {
    color: '#344054',
    fontSize: 13,
    fontWeight: '800',
  },
  chipActiveText: {
    color: '#FFFFFF',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EAEEF4',
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
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
  image: {
    backgroundColor: '#DDE3EA',
    height: 146,
    width: '100%',
  },
  cardBody: {
    padding: 12,
  },
  rowBetween: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  name: {
    color: TkimphPalette.ink,
    flex: 1,
    fontSize: 16,
    fontWeight: '900',
  },
  tag: {
    backgroundColor: '#F2F4F7',
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  tagText: {
    color: '#667085',
    fontSize: 11,
    fontWeight: '700',
  },
  metaLine: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 7,
  },
  metaText: {
    color: '#667085',
    fontSize: 12,
    fontWeight: '700',
  },
  foodCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#EAEEF4',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
    padding: 10,
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
  foodImage: {
    backgroundColor: '#DDE3EA',
    borderRadius: 12,
    height: 82,
    width: 82,
  },
  foodBody: {
    flex: 1,
  },
  foodName: {
    color: TkimphPalette.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  foodDescription: {
    color: TkimphPalette.muted,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
    marginTop: 4,
  },
  foodFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    marginTop: 8,
  },
  price: {
    color: TkimphPalette.green,
    fontSize: 14,
    fontWeight: '900',
  },
  cartStrip: {
    alignItems: 'center',
    backgroundColor: TkimphPalette.green,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    minHeight: 52,
    paddingHorizontal: 14,
  },
  cartStripTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  cartStripMeta: {
    color: '#DFF5E8',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  addPill: {
    alignItems: 'center',
    backgroundColor: TkimphPalette.green,
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  modalBackdrop: {
    backgroundColor: 'rgba(7, 18, 37, 0.42)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  quickAddPanel: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 18,
    paddingBottom: 28,
  },
  modalHandle: {
    alignSelf: 'center',
    backgroundColor: '#D0D5DD',
    borderRadius: 3,
    height: 5,
    marginBottom: 14,
    width: 42,
  },
  modalTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitle: {
    color: TkimphPalette.ink,
    fontSize: 18,
    fontWeight: '900',
  },
  selectedRow: {
    flexDirection: 'row',
    gap: 12,
  },
  selectedImage: {
    backgroundColor: '#DDE3EA',
    borderRadius: 14,
    height: 88,
    width: 88,
  },
  selectedBody: {
    flex: 1,
  },
  selectedName: {
    color: TkimphPalette.ink,
    fontSize: 17,
    fontWeight: '900',
  },
  selectedRestaurant: {
    color: TkimphPalette.muted,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  selectedPrice: {
    color: TkimphPalette.green,
    fontSize: 16,
    fontWeight: '900',
    marginTop: 8,
  },
  qtyRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 18,
    justifyContent: 'center',
    marginVertical: 18,
  },
  qtyButton: {
    alignItems: 'center',
    backgroundColor: '#F2F4F7',
    borderRadius: 18,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  qtyText: {
    color: TkimphPalette.ink,
    fontSize: 18,
    fontWeight: '900',
    minWidth: 28,
    textAlign: 'center',
  },
  cartWarning: {
    color: TkimphPalette.primary,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 18,
    marginBottom: 12,
    textAlign: 'center',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: TkimphPalette.yellow,
    borderRadius: 15,
    height: 48,
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '900',
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: TkimphPalette.green,
    borderRadius: 15,
    borderWidth: 1,
    height: 46,
    justifyContent: 'center',
    marginTop: 10,
  },
  secondaryButtonText: {
    color: TkimphPalette.green,
    fontSize: 14,
    fontWeight: '900',
  },
});
