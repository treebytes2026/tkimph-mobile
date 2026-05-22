import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { FlatList, Image, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LoadingState } from '@/components/loading-state';
import { TkimphPalette } from '@/constants/theme';
import { fetchPublicRestaurants, publicFileUrl, PublicRestaurant } from '@/lib/api';
import { blurActiveElement } from '@/lib/focus';

function deliveryText(fee?: number) {
  if (typeof fee !== 'number') return 'Delivery set by admin';
  return `Standard delivery ₱${fee}`;
}

export default function RestaurantsScreen() {
  const [restaurants, setRestaurants] = useState<PublicRestaurant[]>([]);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const loadRestaurants = useCallback(async (nextPage = 1) => {
    const initial = nextPage === 1;
    if (initial) setLoading(true);
    else setLoadingMore(true);
    try {
      const response = await fetchPublicRestaurants({ perPage: 20, page: nextPage, q: debouncedQuery });
      setRestaurants((current) => (initial ? response.data : [...current, ...response.data]));
      setPage(response.current_page ?? nextPage);
      setHasMore(Boolean(response.next_page_url));
    } catch {
      if (initial) setRestaurants([]);
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [debouncedQuery]);

  const topRestaurants = useMemo(
    () =>
      [...restaurants]
        .filter((entry) => (entry.review_count ?? 0) > 0)
        .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
        .slice(0, 5),
    [restaurants]
  );

  useEffect(() => {
    void loadRestaurants(1);
  }, [loadRestaurants]);

  const header = (
    <>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => {
            blurActiveElement();
            router.back();
          }}
          style={styles.backButton}
        >
          <MaterialIcons color={TkimphPalette.ink} name="arrow-back" size={22} />
        </Pressable>
        <View>
          <Text style={styles.title}>Restaurants</Text>
          <Text style={styles.subtitle}>Top-rated places first</Text>
        </View>
      </View>

      <View style={styles.search}>
        <MaterialIcons color={TkimphPalette.muted} name="search" size={20} />
        <TextInput
          onChangeText={setQuery}
          placeholder="Search restaurant or food..."
          placeholderTextColor={TkimphPalette.muted}
          style={styles.searchInput}
          value={query}
        />
      </View>

      {topRestaurants.length > 0 && !debouncedQuery ? (
        <>
          <Text style={styles.sectionTitle}>Top restaurants</Text>
          {topRestaurants.map((entry, index) => (
            <RestaurantRow key={`top-${entry.id}`} restaurant={entry} rank={index + 1} />
          ))}
        </>
      ) : null}

      <Text style={styles.sectionTitle}>{debouncedQuery ? 'Search results' : 'All restaurants'}</Text>
      {loading ? <LoadingState compact label="Loading restaurants..." /> : null}
      {!loading && restaurants.length === 0 ? <Text style={styles.emptyText}>No restaurants match your search.</Text> : null}
    </>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        contentContainerStyle={styles.content}
        data={restaurants}
        keyExtractor={(item) => String(item.id)}
        ListFooterComponent={loadingMore ? <LoadingState compact label="Loading more..." /> : null}
        ListHeaderComponent={header}
        onEndReached={() => {
          if (!loading && !loadingMore && hasMore) void loadRestaurants(page + 1);
        }}
        onEndReachedThreshold={0.4}
        renderItem={({ item }) => <RestaurantRow restaurant={item} />}
      />
    </SafeAreaView>
  );
}

const RestaurantRow = memo(function RestaurantRow({ restaurant, rank }: { restaurant: PublicRestaurant; rank?: number }) {
  const router = useRouter();
  const imageUrl = publicFileUrl(restaurant.profile_image_path, restaurant.profile_image_url);
  const deliveryFee = restaurant.standard_delivery_fee_php ?? restaurant.delivery_fee_php;
  const eta =
    restaurant.delivery_min_minutes != null && restaurant.delivery_max_minutes != null
      ? `${restaurant.delivery_min_minutes}-${restaurant.delivery_max_minutes} min`
      : '15-25 min';

  return (
    <Pressable
      disabled={!restaurant.slug}
      onPress={() => {
        if (restaurant.slug) {
          blurActiveElement();
          router.push(`/restaurant/${encodeURIComponent(restaurant.slug)}` as never);
        }
      }}
      style={styles.card}
    >
      {imageUrl ? <Image source={{ uri: imageUrl }} style={styles.image} /> : <View style={styles.image} />}
      <View style={styles.body}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{restaurant.name}</Text>
          {rank ? (
            <View style={styles.rank}>
              <Text style={styles.rankText}>#{rank}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.cuisine}>{restaurant.cuisine?.name || 'Restaurant'}</Text>
        <View style={styles.metaLine}>
          <MaterialIcons color="#FFC107" name="star" size={14} />
          <Text style={styles.metaText}>{restaurant.review_count ? restaurant.rating?.toFixed(1) : 'New'}</Text>
          <Text style={styles.metaText}>{eta}</Text>
          <Text style={styles.metaText}>{deliveryText(deliveryFee)}</Text>
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#F7F8FA',
    flex: 1,
  },
  content: {
    padding: 14,
    paddingBottom: 96,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#EAEEF4',
    borderRadius: 18,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  title: {
    color: TkimphPalette.ink,
    fontSize: 24,
    fontWeight: '900',
  },
  subtitle: {
    color: TkimphPalette.muted,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  search: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#EAEEF4',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 46,
    paddingHorizontal: 14,
  },
  searchInput: {
    color: TkimphPalette.ink,
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    minHeight: 46,
  },
  sectionTitle: {
    color: TkimphPalette.ink,
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 10,
    marginTop: 18,
  },
  card: {
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
  image: {
    backgroundColor: '#DDE3EA',
    borderRadius: 12,
    height: 82,
    width: 82,
  },
  body: {
    flex: 1,
  },
  nameRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  name: {
    color: TkimphPalette.ink,
    flex: 1,
    fontSize: 16,
    fontWeight: '900',
  },
  cuisine: {
    color: TkimphPalette.muted,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  rank: {
    backgroundColor: '#FFF4CC',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  rankText: {
    color: '#946200',
    fontSize: 11,
    fontWeight: '900',
  },
  metaLine: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 8,
  },
  metaText: {
    color: '#667085',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyText: {
    color: TkimphPalette.muted,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    textAlign: 'center',
  },
});
