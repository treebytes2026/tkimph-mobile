import { ComponentProps, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { Image, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { LoadingState } from '@/components/loading-state';
import { Card, MobileShell } from '@/components/mobile-shell';
import { useCart } from '@/contexts/cart-context';
import { TkimphPalette } from '@/constants/theme';
import { fetchPublicRestaurants, publicFileUrl, PublicRestaurant } from '@/lib/api';
import { blurActiveElement } from '@/lib/focus';

const categories = [
  { label: 'Restaurants', icon: 'restaurant', route: '/restaurants' },
  { label: 'Shops', icon: 'storefront', route: '/coming-soon/shops' },
  { label: 'Groceries', icon: 'shopping-basket', route: '/coming-soon/groceries' },
  { label: 'Offers', icon: 'local-offer', route: '/coming-soon/offers' },
] as const;
const LOCATION_LABEL_KEY = 'tkimph:customer-location-label';

function deliveryText(fee?: number) {
  if (typeof fee !== 'number') return 'Delivery set by admin';
  return `Standard delivery \u20B1${fee}`;
}

export default function HomeScreen() {
  const [feed, setFeed] = useState<PublicRestaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [locationLabel, setLocationLabel] = useState('Hinoba-an, Negros Occidental');
  const [locating, setLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const router = useRouter();
  const { cartCount } = useCart();

  useEffect(() => {
    AsyncStorage.getItem(LOCATION_LABEL_KEY)
      .then((saved) => {
        if (saved?.trim()) setLocationLabel(saved);
      })
      .catch(() => undefined);
  }, []);

  async function handleLocateMe() {
    setLocating(true);
    setLocationMessage(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== Location.PermissionStatus.GRANTED) {
        setLocationMessage('Location permission is required to update your area.');
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const nextLabel =
        (await resolveLocationLabel(position.coords.latitude, position.coords.longitude)) ||
        `${position.coords.latitude.toFixed(5)}, ${position.coords.longitude.toFixed(5)}`;
      setLocationLabel(nextLabel);
      await AsyncStorage.setItem(LOCATION_LABEL_KEY, nextLabel);
    } catch (err) {
      setLocationMessage(err instanceof Error ? err.message : 'Could not detect your location.');
    } finally {
      setLocating(false);
    }
  }

  useEffect(() => {
    fetchPublicRestaurants({ perPage: 6 })
      .then((response) => setFeed(response.data))
      .catch(() => setFeed([]))
      .finally(() => setLoading(false));
  }, []);

  const filteredFeed = feed.filter((entry) => {
    const clean = query.trim().toLowerCase();
    if (!clean) return true;
    const haystack = `${entry.name} ${entry.cuisine?.name ?? ''}`.toLowerCase();
    return haystack.includes(clean);
  });

  function openBrowseSearch() {
    const clean = query.trim();
    blurActiveElement();
    router.push(clean ? ({ pathname: '/(tabs)/browse', params: { q: clean } } as never) : ('/(tabs)/browse' as never));
  }

  return (
    <MobileShell>
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View style={styles.logoMark}>
            <Text style={styles.logoInitial}>T</Text>
          </View>
          <Text style={styles.logoText}>T&apos;KIM</Text>
        </View>
        <View style={styles.headerActions}>
          <RoundIcon name="notifications-none" />
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              blurActiveElement();
              router.push('/cart' as never);
            }}
          >
            <RoundIcon name="shopping-cart" />
            {cartCount > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{cartCount > 99 ? '99+' : cartCount}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>
      </View>

      <Pressable
        accessibilityLabel="Use my current location"
        accessibilityRole="button"
        disabled={locating}
        hitSlop={8}
        onPress={handleLocateMe}
        style={[styles.locationRow, locating && styles.locationRowDisabled]}
      >
        <MaterialIcons color={TkimphPalette.green} name="place" size={16} />
        <Text style={styles.locationText}>{locating ? 'Locating...' : locationLabel}</Text>
        <MaterialIcons color={TkimphPalette.muted} name="my-location" size={15} />
      </Pressable>
      {locationMessage ? <Text style={styles.locationMessage}>{locationMessage}</Text> : null}

      <View style={styles.search}>
        <MaterialIcons color={TkimphPalette.muted} name="search" size={21} />
        <TextInput
          placeholder="Search pagkain, milk tea, grocery..."
          placeholderTextColor={TkimphPalette.muted}
          returnKeyType="search"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={openBrowseSearch}
          style={styles.searchInput}
        />
      </View>

      <View style={styles.hero}>
        <View>
          <Text style={styles.heroTitle}>Cravings? T&apos;KIM na!</Text>
          <Text style={styles.heroCopy}>Hatid ang Sarap, mabilis pa</Text>
          <Pressable
            style={styles.heroButton}
            onPress={() => {
              blurActiveElement();
              router.push('/restaurants' as never);
            }}
          >
            <Text style={styles.heroButtonText}>Order Now</Text>
          </Pressable>
        </View>
        <View style={styles.heroArt}>
          <Text style={styles.heroArtText}>TK</Text>
        </View>
      </View>

      <View style={styles.categoryGrid}>
        {categories.map((category) => (
          <Pressable
            key={category.label}
            style={styles.categoryCard}
            onPress={() => {
              blurActiveElement();
              router.push(category.route as never);
            }}
          >
            <View style={styles.categoryIcon}>
              <MaterialIcons color={TkimphPalette.green} name={category.icon} size={24} />
            </View>
            <Text style={styles.categoryLabel}>{category.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Popular Restaurants</Text>
        <Pressable
          onPress={() => {
            blurActiveElement();
            router.push('/restaurants' as never);
          }}
        >
          <Text style={styles.seeAll}>See All</Text>
        </Pressable>
      </View>

      {loading ? <LoadingState compact label="Loading restaurants..." /> : null}
      {filteredFeed.length === 0 && !loading ? <Text style={styles.muted}>No restaurants or dishes found.</Text> : null}
      {filteredFeed.map((entry, index) => (
        <RestaurantListCard
          key={entry.id}
          entry={entry}
          isPopular={index === 1}
          onPress={() => {
            if (entry.slug) {
              blurActiveElement();
              router.push(`/restaurant/${encodeURIComponent(entry.slug)}` as never);
            }
          }}
        />
      ))}
    </MobileShell>
  );
}

function RoundIcon({ name }: { name: ComponentProps<typeof MaterialIcons>['name'] }) {
  return (
    <View style={styles.roundIcon}>
      <MaterialIcons color="#667085" name={name} size={22} />
    </View>
  );
}

function formatLocationLabel(place?: Location.LocationGeocodedAddress) {
  if (!place) return null;
  return [
    place.street || place.name,
    place.district || place.subregion || place.city,
    place.region,
  ]
    .filter(Boolean)
    .join(', ');
}

async function resolveLocationLabel(latitude: number, longitude: number) {
  if (Platform.OS === 'web') return reverseGeocodeForWeb(latitude, longitude);

  const [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
  return formatLocationLabel(place);
}

async function reverseGeocodeForWeb(latitude: number, longitude: number) {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
    { headers: { Accept: 'application/json' } }
  );
  if (!response.ok) return null;
  const data = (await response.json()) as {
    name?: string;
    display_name?: string;
    address?: {
      road?: string;
      neighbourhood?: string;
      suburb?: string;
      city?: string;
      town?: string;
      municipality?: string;
      province?: string;
      state?: string;
      country?: string;
    };
  };
  return (
    [
      data.name ?? data.address?.road,
      data.address?.neighbourhood ?? data.address?.suburb,
      data.address?.city ?? data.address?.town ?? data.address?.municipality,
      data.address?.province ?? data.address?.state,
    ]
      .filter(Boolean)
      .join(', ') || data.display_name || null
  );
}

function RestaurantListCard({
  entry,
  isPopular,
  onPress,
}: {
  entry: PublicRestaurant;
  isPopular?: boolean;
  onPress: () => void;
}) {
  const restaurant = entry;
  const imageUrl = publicFileUrl(restaurant.profile_image_path, restaurant.profile_image_url);
  const deliveryFee = restaurant.standard_delivery_fee_php ?? restaurant.delivery_fee_php;
  const eta =
    restaurant.delivery_min_minutes != null && restaurant.delivery_max_minutes != null
      ? `${restaurant.delivery_min_minutes}-${restaurant.delivery_max_minutes} min`
      : '15-25 min';
  const badgeText = restaurant.promo_label ?? (isPopular ? 'Popular' : restaurant.cuisine?.name ?? 'Restaurant');
  return (
    <Pressable onPress={onPress} disabled={!restaurant.slug}>
      <Card>
      <View style={styles.restaurantRow}>
        {imageUrl ? <Image source={{ uri: imageUrl }} style={styles.restaurantImage} /> : <View style={styles.restaurantImage} />}
        <View style={styles.restaurantBody}>
          <View style={styles.nameRow}>
            <Text style={styles.restaurantName}>{restaurant.name}</Text>
            <View style={styles.tag}>
              <Text style={styles.tagText}>{badgeText}</Text>
            </View>
          </View>
          <View style={styles.metaLine}>
            <MaterialIcons color="#FFC107" name="star" size={14} />
            <Text style={styles.metaStrong}>{restaurant.review_count ? restaurant.rating?.toFixed(1) : 'New'}</Text>
            <Text style={styles.metaText}>{eta}</Text>
            <Text style={styles.metaText}>{deliveryText(deliveryFee)}</Text>
          </View>
          {restaurant.promo_label ? <Text style={styles.minimum}>{restaurant.promo_label}</Text> : null}
        </View>
      </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  brandRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  logoMark: {
    alignItems: 'center',
    backgroundColor: TkimphPalette.yellow,
    borderRadius: 12,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  logoInitial: {
    color: TkimphPalette.green,
    fontSize: 24,
    fontWeight: '900',
  },
  logoText: {
    color: TkimphPalette.green,
    fontSize: 28,
    fontWeight: '900',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  roundIcon: {
    alignItems: 'center',
    backgroundColor: '#F3F5F7',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  badge: {
    alignItems: 'center',
    backgroundColor: TkimphPalette.yellow,
    borderRadius: 9,
    height: 18,
    justifyContent: 'center',
    position: 'absolute',
    right: -2,
    top: -5,
    width: 18,
  },
  badgeText: {
    color: '#111827',
    fontSize: 11,
    fontWeight: '900',
  },
  locationRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
    minHeight: 32,
    marginBottom: 8,
    paddingVertical: 4,
  },
  locationRowDisabled: {
    opacity: 0.65,
  },
  locationText: {
    color: '#566179',
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  locationMessage: {
    color: TkimphPalette.primary,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    marginBottom: 12,
  },
  search: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#ECEFF4',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 48,
    paddingHorizontal: 16,
    ...Platform.select({
      web: { boxShadow: '0 3px 8px rgba(16, 24, 40, 0.07)' },
      default: {
        elevation: 2,
        shadowColor: '#101828',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.07,
        shadowRadius: 8,
      },
    }),
  },
  searchInput: {
    color: TkimphPalette.muted,
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    minHeight: 48,
  },
  hero: {
    alignItems: 'center',
    backgroundColor: TkimphPalette.green,
    borderRadius: 22,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    minHeight: 145,
    padding: 20,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
  },
  heroCopy: {
    color: '#E4F7EA',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 6,
  },
  heroButton: {
    alignItems: 'center',
    backgroundColor: TkimphPalette.yellow,
    borderRadius: 14,
    height: 40,
    justifyContent: 'center',
    marginTop: 18,
    paddingHorizontal: 22,
  },
  heroButtonText: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '900',
  },
  heroArt: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 36,
    height: 72,
    justifyContent: 'center',
    width: 72,
  },
  heroArtText: {
    color: TkimphPalette.yellow,
    fontSize: 24,
    fontWeight: '900',
  },
  categoryGrid: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 16,
  },
  categoryCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#ECEFF4',
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    minHeight: 90,
    paddingVertical: 12,
    ...Platform.select({
      web: { boxShadow: '0 3px 6px rgba(16, 24, 40, 0.07)' },
      default: {
        elevation: 2,
        shadowColor: '#101828',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.07,
        shadowRadius: 6,
      },
    }),
  },
  categoryIcon: {
    alignItems: 'center',
    backgroundColor: '#E8F3ED',
    borderRadius: 18,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  categoryLabel: {
    color: '#344054',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 10,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 22,
  },
  sectionTitle: {
    color: TkimphPalette.ink,
    fontSize: 18,
    fontWeight: '900',
  },
  seeAll: {
    color: TkimphPalette.green,
    fontSize: 13,
    fontWeight: '900',
  },
  restaurantRow: {
    flexDirection: 'row',
    gap: 12,
  },
  restaurantImage: {
    backgroundColor: '#E7ECF2',
    borderRadius: 12,
    height: 84,
    width: 84,
  },
  restaurantBody: {
    flex: 1,
  },
  nameRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  restaurantName: {
    color: TkimphPalette.ink,
    flex: 1,
    fontSize: 16,
    fontWeight: '900',
  },
  tag: {
    backgroundColor: '#ECFDF3',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tagText: {
    color: TkimphPalette.green,
    fontSize: 10,
    fontWeight: '900',
  },
  metaLine: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 7,
  },
  metaStrong: {
    color: '#475467',
    fontSize: 13,
    fontWeight: '800',
  },
  metaText: {
    color: '#667085',
    fontSize: 12,
    fontWeight: '600',
  },
  minimum: {
    color: TkimphPalette.ink,
    fontSize: 15,
    fontWeight: '900',
    marginTop: 7,
  },
  minimumSub: {
    color: TkimphPalette.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  muted: {
    color: TkimphPalette.muted,
    fontSize: 14,
    fontWeight: '700',
  },
});

