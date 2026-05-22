import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useCart } from '@/contexts/cart-context';
import { TkimphPalette } from '@/constants/theme';
import { publicFileUrl } from '@/lib/api';
import { blurActiveElement } from '@/lib/focus';

function formatPhp(value: number) {
  if (Number.isNaN(value)) return '\u20B10.00';
  return `\u20B1${value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function CartScreen() {
  const router = useRouter();
  const { cart, cartCount, cartRestaurant, cartTotal, setQty } = useCart();
  const restaurantImage = publicFileUrl(cartRestaurant?.profile_image_path, cartRestaurant?.profile_image_url);

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
        <Text style={styles.topTitle}>Your cart</Text>
        <View style={styles.roundButtonSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {cart.length === 0 || !cartRestaurant ? (
          <View style={styles.emptyCard}>
            <MaterialIcons color={TkimphPalette.green} name="shopping-cart" size={44} />
            <Text style={styles.emptyTitle}>Cart is empty</Text>
            <Text style={styles.mutedText}>Add items from a restaurant menu before checkout.</Text>
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
            <View style={styles.restaurantCard}>
              {restaurantImage ? <Image source={{ uri: restaurantImage }} style={styles.restaurantImage} /> : <View style={styles.restaurantImage} />}
              <View style={styles.restaurantInfo}>
                <Text style={styles.restaurantName}>{cartRestaurant.name}</Text>
                <Text style={styles.mutedText}>{cartCount} items in cart</Text>
              </View>
            </View>

            {cartRestaurant.slug ? (
              <Pressable
                onPress={() => {
                  blurActiveElement();
                  router.push(`/restaurant/${encodeURIComponent(cartRestaurant.slug!)}` as never);
                }}
                style={styles.secondaryButton}>
                <MaterialIcons color={TkimphPalette.green} name="restaurant-menu" size={18} />
                <Text style={styles.secondaryButtonText}>Continue shopping</Text>
              </Pressable>
            ) : null}

            <View style={styles.section}>
              {cart.map((line) => {
                const image = publicFileUrl(line.item.image_path, line.item.image_url);
                const lineTotal = Number(line.item.price) * line.qty;
                return (
                  <View key={line.item.id} style={styles.lineItem}>
                    {image ? <Image source={{ uri: image }} style={styles.lineImage} /> : <View style={styles.lineImage} />}
                    <View style={styles.lineBody}>
                      <View style={styles.lineHeader}>
                        <Text style={styles.lineName}>{line.item.name}</Text>
                        <Text style={styles.lineTotal}>{formatPhp(lineTotal)}</Text>
                      </View>
                      <Text style={styles.mutedText}>{formatPhp(Number(line.item.price))}</Text>
                      <View style={styles.lineActions}>
                        <View style={styles.stepper}>
                          <Pressable onPress={() => setQty(line.item.id, line.qty - 1)} style={styles.stepButton}>
                            <MaterialIcons color={TkimphPalette.ink} name="remove" size={16} />
                          </Pressable>
                          <Text style={styles.stepQty}>{line.qty}</Text>
                          <Pressable onPress={() => setQty(line.item.id, line.qty + 1)} style={styles.stepButton}>
                            <MaterialIcons color={TkimphPalette.ink} name="add" size={16} />
                          </Pressable>
                        </View>
                        <Pressable
                          accessibilityLabel={`Remove ${line.item.name} from cart`}
                          accessibilityRole="button"
                          hitSlop={8}
                          onPress={() => setQty(line.item.id, 0)}
                          style={styles.removeButton}
                        >
                          <MaterialIcons color={TkimphPalette.primary} name="delete-outline" size={18} />
                        </Pressable>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>

            <View style={styles.summaryCard}>
              <View>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryTotal}>{formatPhp(cartTotal)}</Text>
              </View>
              <Pressable
                onPress={() => {
                  blurActiveElement();
                  router.push('/checkout' as never);
                }}
                style={styles.checkoutButton}
              >
                <Text style={styles.checkoutButtonText}>Continue to checkout</Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
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
  roundButtonSpacer: {
    height: 40,
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
  restaurantName: {
    color: TkimphPalette.ink,
    fontSize: 16,
    fontWeight: '900',
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: '#E8F3ED',
    borderColor: '#BFE8CF',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 12,
    minHeight: 46,
  },
  secondaryButtonText: {
    color: TkimphPalette.green,
    fontSize: 14,
    fontWeight: '900',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EAEEF4',
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    marginTop: 12,
    padding: 14,
  },
  lineItem: {
    alignItems: 'flex-start',
    borderBottomColor: '#F1F3F6',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
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
  lineHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  lineName: {
    color: TkimphPalette.ink,
    flex: 1,
    fontSize: 14,
    fontWeight: '900',
  },
  removeButton: {
    alignItems: 'center',
    backgroundColor: '#FEECEC',
    borderRadius: 15,
    height: 30,
    justifyContent: 'center',
    width: 30,
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
  },
  lineActions: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  summaryCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#EAEEF4',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    padding: 14,
  },
  summaryLabel: {
    color: TkimphPalette.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  summaryTotal: {
    color: TkimphPalette.ink,
    fontSize: 18,
    fontWeight: '900',
  },
  checkoutButton: {
    alignItems: 'center',
    backgroundColor: TkimphPalette.green,
    borderRadius: 12,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 12,
  },
  checkoutButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center',
  },
});
