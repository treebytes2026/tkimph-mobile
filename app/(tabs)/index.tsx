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
  const [favorites, setFavorites] = useState<Record<number, boolean>>({});
  const router = useRouter();
  const { cartCount } = useCart();

  function toggleFavorite(id: number) {
    setFavorites((prev) => ({ ...prev, [id]: !prev[id] }));
  }

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
          <Image
            source={require('@/assets/images/logo/logo1.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.logoWordmark}>
            <Text style={styles.logoWordmarkGreen}>T&apos;</Text>
            <Text style={styles.logoWordmarkYellow}>KIM</Text>
          </Text>
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
        <HeroBackdrop />
        <Image
          source={require('@/assets/images/emo/catdelivery.png')}
          style={styles.heroImage}
          resizeMode="contain"
        />
        <View style={styles.heroContent}>
          <View style={styles.speechBubble}>
            <Text style={styles.heroTitleDark}>Cravings?</Text>
            <Text style={styles.heroTitleAccent}>T&apos;KIM na!</Text>
            <Text style={styles.heroCopyDark}>Hatid ang Sarap,{'\n'}mabilis pa! 😋</Text>
            <View style={styles.speechBubbleTail} />
          </View>
          <Pressable
            style={styles.heroButton}
            onPress={() => {
              blurActiveElement();
              router.push('/restaurants' as never);
            }}
          >
            <Text style={styles.heroButtonText}>Order Now</Text>
            <MaterialIcons color="#111827" name="chevron-right" size={18} />
          </Pressable>
        </View>
      </View>

      <Pressable
        style={styles.promoBanner}
        onPress={() => {
          blurActiveElement();
          router.push('/restaurants' as never);
        }}
      >
        <View style={styles.promoIcon}>
          <MaterialIcons color={TkimphPalette.green} name="confirmation-number" size={22} />
        </View>
        <Text style={styles.promoText}>
          Enjoy <Text style={styles.promoStrong}>&#8369;50 off</Text> on your first order!
        </Text>
        <View style={styles.promoArrow}>
          <MaterialIcons color="#FFFFFF" name="chevron-right" size={20} />
        </View>
      </Pressable>

      <View style={styles.categoryGrid}>
        {categories.map((category, idx) => (
          <Pressable
            key={category.label}
            style={[styles.categoryCard, idx < categories.length - 1 && styles.categoryDivider]}
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
          style={styles.seeAllRow}
          onPress={() => {
            blurActiveElement();
            router.push('/restaurants' as never);
          }}
        >
          <Text style={styles.seeAll}>See All</Text>
          <MaterialIcons color={TkimphPalette.green} name="chevron-right" size={18} />
        </Pressable>
      </View>

      {loading ? <LoadingState compact label="Loading restaurants..." /> : null}
      {filteredFeed.length === 0 && !loading ? <Text style={styles.muted}>No restaurants or dishes found.</Text> : null}
      {filteredFeed.map((entry) => (
        <RestaurantListCard
          key={entry.id}
          entry={entry}
          badgeKind={badgeKindFor(entry)}
          isFavorite={!!favorites[entry.id]}
          onToggleFavorite={() => toggleFavorite(entry.id)}
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

function HeroBackdrop() {
  const skyBands = [
    { top: 0, height: '22%', color: 'rgba(255,255,255,0.35)' },
    { top: '22%', height: '18%', color: 'rgba(255,255,255,0.18)' },
    { top: '40%', height: '12%', color: 'rgba(255,255,255,0.08)' },
  ] as const;
  const buildingsBack = [
    { left: 100, width: 26, height: 58, opacity: 0.35 },
    { left: 128, width: 34, height: 78, opacity: 0.35 },
    { left: 166, width: 22, height: 50, opacity: 0.35 },
    { left: 192, width: 30, height: 70, opacity: 0.35 },
    { left: 226, width: 38, height: 90, opacity: 0.35 },
    { left: 268, width: 24, height: 58, opacity: 0.35 },
    { left: 296, width: 32, height: 80, opacity: 0.35 },
    { left: 332, width: 22, height: 56, opacity: 0.35 },
  ];
  const buildingsFront = [
    { left: 92, width: 18, height: 30 },
    { left: 116, width: 28, height: 48 },
    { left: 148, width: 18, height: 26 },
    { left: 170, width: 24, height: 40 },
    { left: 198, width: 32, height: 60 },
    { left: 234, width: 20, height: 32 },
    { left: 258, width: 28, height: 48 },
    { left: 290, width: 18, height: 28 },
    { left: 312, width: 26, height: 44 },
    { left: 342, width: 16, height: 24 },
  ];
  const sparkles: Array<{
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
    size: number;
  }> = [
    { top: 28, right: 14, size: 9 },
    { top: 52, right: 38, size: 5 },
    { top: 82, right: 8, size: 6 },
    { bottom: 96, left: 168, size: 7 },
    { bottom: 62, right: 54, size: 5 },
    { bottom: 110, right: 100, size: 4 },
    { top: 96, left: 184, size: 5 },
  ];
  return (
    <View style={styles.heroBackdrop}>
      {skyBands.map((b, i) => (
        <View
          key={`sk-${i}`}
          style={{
            backgroundColor: b.color,
            height: b.height,
            left: 0,
            position: 'absolute',
            right: 0,
            top: b.top,
          }}
        />
      ))}
      <View style={styles.heroHorizon} />
      <View style={styles.heroGround} />
      <View style={styles.heroRoad} />
      {buildingsBack.map((b, i) => (
        <View
          key={`bb-${i}`}
          style={[
            styles.heroBuildingBack,
            { left: b.left, width: b.width, height: b.height, opacity: b.opacity },
          ]}
        />
      ))}
      {buildingsFront.map((b, i) => (
        <View
          key={`bf-${i}`}
          style={[styles.heroBuilding, { left: b.left, width: b.width, height: b.height }]}
        />
      ))}
      {sparkles.map((s, i) => (
        <View
          key={`sp-${i}`}
          style={[
            styles.heroSparkle,
            {
              width: s.size,
              height: s.size,
              borderRadius: s.size / 2,
              ...(s.top != null ? { top: s.top } : {}),
              ...(s.bottom != null ? { bottom: s.bottom } : {}),
              ...(s.left != null ? { left: s.left } : {}),
              ...(s.right != null ? { right: s.right } : {}),
            },
          ]}
        />
      ))}
      <View style={[styles.heroLeafWrap, { right: 22, top: 14 }]}>
        <MaterialIcons color="#2E9C4F" name="eco" size={20} />
      </View>
      <View style={[styles.heroLeafWrap, { right: 8, top: 64, transform: [{ rotate: '-25deg' }] }]}>
        <MaterialIcons color="#2E9C4F" name="eco" size={14} />
      </View>
      <View style={[styles.heroPuff, styles.heroPuffA]} />
      <View style={[styles.heroPuff, styles.heroPuffB]} />
      <View style={[styles.heroPuff, styles.heroPuffC]} />
      <View style={[styles.heroPuff, styles.heroPuffD]} />
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

type BadgeKind = 'free-delivery' | 'popular' | 'top-rated' | 'new' | 'default';

function badgeKindFor(entry: PublicRestaurant): BadgeKind {
  const fee = entry.standard_delivery_fee_php ?? entry.delivery_fee_php;
  if (fee === 0) return 'free-delivery';
  if ((entry.rating ?? 0) >= 4.7 && (entry.review_count ?? 0) >= 100) return 'top-rated';
  if ((entry.review_count ?? 0) >= 50) return 'popular';
  if ((entry.review_count ?? 0) === 0) return 'new';
  return 'default';
}

const BADGE_STYLES: Record<BadgeKind, { bg: string; fg: string; label: string }> = {
  'free-delivery': { bg: '#E6F8EC', fg: TkimphPalette.green, label: 'Free Delivery' },
  popular: { bg: '#FFE9CC', fg: '#C2680A', label: 'Popular' },
  'top-rated': { bg: '#FCE0E9', fg: '#C13970', label: 'Top Rated' },
  new: { bg: '#DBEAFE', fg: '#1D4ED8', label: 'New' },
  default: { bg: '#F1F5F9', fg: '#475467', label: 'Restaurant' },
};

function RestaurantListCard({
  entry,
  badgeKind,
  isFavorite,
  onToggleFavorite,
  onPress,
}: {
  entry: PublicRestaurant;
  badgeKind: BadgeKind;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onPress: () => void;
}) {
  const restaurant = entry;
  const imageUrl = publicFileUrl(restaurant.profile_image_path, restaurant.profile_image_url);
  const deliveryFee = restaurant.standard_delivery_fee_php ?? restaurant.delivery_fee_php;
  const eta =
    restaurant.delivery_min_minutes != null && restaurant.delivery_max_minutes != null
      ? `${restaurant.delivery_min_minutes}-${restaurant.delivery_max_minutes} min`
      : '15-25 min';
  const badge = BADGE_STYLES[badgeKind];
  const badgeLabel = restaurant.promo_label ?? badge.label;
  const deliveryLabel = deliveryFee === 0 ? 'Free Delivery' : deliveryFee != null ? `₱${deliveryFee} delivery` : 'Delivery TBD';
  return (
    <Pressable onPress={onPress} disabled={!restaurant.slug}>
      <Card>
        <View style={styles.restaurantRow}>
          {imageUrl ? <Image source={{ uri: imageUrl }} style={styles.restaurantImage} /> : <View style={styles.restaurantImage} />}
          <View style={styles.restaurantBody}>
            <View style={styles.nameRow}>
              <Text style={styles.restaurantName}>{restaurant.name}</Text>
              <View style={[styles.tag, { backgroundColor: badge.bg }]}>
                <Text style={[styles.tagText, { color: badge.fg }]}>{badgeLabel}</Text>
              </View>
            </View>
            <View style={styles.metaLine}>
              <MaterialIcons color="#FFC107" name="star" size={14} />
              <Text style={styles.metaStrong}>
                {restaurant.review_count ? restaurant.rating?.toFixed(1) : 'New'}
              </Text>
              {restaurant.review_count ? (
                <Text style={styles.metaCount}>({restaurant.review_count}+)</Text>
              ) : null}
            </View>
            <View style={styles.metaLine}>
              <MaterialIcons color="#8B93A6" name="schedule" size={13} />
              <Text style={styles.metaText}>{eta}</Text>
              <View style={styles.metaDot} />
              <Text style={styles.metaText}>{deliveryLabel}</Text>
            </View>
          </View>
          <Pressable
            accessibilityLabel={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            accessibilityRole="button"
            hitSlop={8}
            onPress={(e) => {
              e.stopPropagation?.();
              onToggleFavorite();
            }}
            style={styles.favoriteButton}
          >
            <MaterialIcons
              color={isFavorite ? '#E11D48' : '#C7CCD6'}
              name={isFavorite ? 'favorite' : 'favorite-border'}
              size={20}
            />
          </Pressable>
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
    gap: 6,
  },
  logoImage: {
    height: 48,
    width: 56,
  },
  logoWordmark: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  logoWordmarkGreen: {
    color: TkimphPalette.green,
  },
  logoWordmarkYellow: {
    color: TkimphPalette.yellow,
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
    backgroundColor: '#9FD4B3',
    borderRadius: 24,
    marginTop: 12,
    minHeight: 240,
    overflow: 'hidden',
    paddingHorizontal: 18,
    paddingVertical: 20,
    position: 'relative',
  },
  heroContent: {
    maxWidth: '62%',
    zIndex: 2,
  },
  speechBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    position: 'relative',
    ...Platform.select({
      web: { boxShadow: '0 6px 14px rgba(16, 24, 40, 0.10)' },
      default: {
        elevation: 3,
        shadowColor: '#101828',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
      },
    }),
  },
  speechBubbleTail: {
    backgroundColor: '#FFFFFF',
    bottom: 18,
    height: 18,
    position: 'absolute',
    right: -7,
    transform: [{ rotate: '45deg' }],
    width: 18,
  },
  heroTitleDark: {
    color: TkimphPalette.ink,
    fontSize: 22,
    fontWeight: '900',
  },
  heroTitleAccent: {
    color: TkimphPalette.green,
    fontSize: 22,
    fontWeight: '900',
    marginTop: -2,
  },
  heroCopyDark: {
    color: '#344054',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    marginTop: 6,
  },
  heroButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: TkimphPalette.yellow,
    borderRadius: 22,
    flexDirection: 'row',
    gap: 2,
    height: 44,
    justifyContent: 'center',
    marginTop: 16,
    paddingLeft: 22,
    paddingRight: 14,
    ...Platform.select({
      web: { boxShadow: '0 4px 10px rgba(16, 24, 40, 0.15)' },
      default: {
        elevation: 3,
        shadowColor: '#101828',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
    }),
  },
  heroButtonText: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '900',
  },
  heroImage: {
    bottom: 0,
    height: 230,
    position: 'absolute',
    right: -16,
    width: 240,
    zIndex: 1,
  },
  heroBackdrop: {
    bottom: 0,
    left: 0,
    pointerEvents: 'none',
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 0,
  },
  heroHorizon: {
    backgroundColor: 'rgba(255,255,255,0.45)',
    bottom: '38%',
    height: 6,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  heroGround: {
    backgroundColor: '#7FC79A',
    bottom: 0,
    height: '32%',
    left: 0,
    position: 'absolute',
    right: 0,
  },
  heroRoad: {
    backgroundColor: '#6BB988',
    bottom: 6,
    height: 6,
    left: 0,
    opacity: 0.85,
    position: 'absolute',
    right: 0,
  },
  heroBuildingBack: {
    backgroundColor: '#5FA47B',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    bottom: 32,
    position: 'absolute',
  },
  heroBuilding: {
    backgroundColor: '#4F9D70',
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
    bottom: 24,
    opacity: 0.85,
    position: 'absolute',
  },
  heroSparkle: {
    backgroundColor: '#FFFFFF',
    opacity: 0.9,
    position: 'absolute',
  },
  heroLeafWrap: {
    position: 'absolute',
    transform: [{ rotate: '20deg' }],
  },
  heroPuff: {
    backgroundColor: '#FFFFFF',
    borderRadius: 40,
    opacity: 0.9,
    position: 'absolute',
  },
  heroPuffA: {
    bottom: 18,
    height: 26,
    right: -4,
    width: 38,
  },
  heroPuffB: {
    bottom: 38,
    height: 18,
    right: 14,
    width: 26,
  },
  heroPuffC: {
    bottom: 8,
    height: 14,
    right: 26,
    width: 22,
  },
  heroPuffD: {
    bottom: 50,
    height: 10,
    right: 32,
    width: 14,
  },
  promoBanner: {
    alignItems: 'center',
    backgroundColor: '#E8F3ED',
    borderRadius: 16,
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  promoIcon: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  promoText: {
    color: '#344054',
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  promoStrong: {
    color: TkimphPalette.green,
    fontWeight: '900',
  },
  promoArrow: {
    alignItems: 'center',
    backgroundColor: TkimphPalette.green,
    borderRadius: 14,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  categoryGrid: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    flexDirection: 'row',
    marginTop: 16,
    paddingVertical: 14,
    ...Platform.select({
      web: { boxShadow: '0 3px 8px rgba(16, 24, 40, 0.06)' },
      default: {
        elevation: 2,
        shadowColor: '#101828',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
    }),
  },
  categoryCard: {
    alignItems: 'center',
    flex: 1,
    minHeight: 80,
    paddingVertical: 4,
  },
  categoryDivider: {
    borderRightColor: '#ECEFF4',
    borderRightWidth: 1,
  },
  categoryIcon: {
    alignItems: 'center',
    backgroundColor: '#E8F3ED',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  categoryLabel: {
    color: '#344054',
    fontSize: 12,
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
  seeAllRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 2,
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
    borderRadius: 14,
    height: 96,
    width: 96,
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
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '900',
  },
  metaLine: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 6,
  },
  metaStrong: {
    color: '#475467',
    fontSize: 13,
    fontWeight: '800',
  },
  metaCount: {
    color: '#8B93A6',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 1,
  },
  metaText: {
    color: '#667085',
    fontSize: 12,
    fontWeight: '600',
  },
  metaDot: {
    backgroundColor: '#C7CCD6',
    borderRadius: 2,
    height: 3,
    width: 3,
  },
  favoriteButton: {
    alignItems: 'center',
    alignSelf: 'flex-end',
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  muted: {
    color: TkimphPalette.muted,
    fontSize: 14,
    fontWeight: '700',
  },
});

