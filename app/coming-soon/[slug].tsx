import { useMemo } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { MobileShell } from '@/components/mobile-shell';
import { TkimphPalette } from '@/constants/theme';
import { blurActiveElement } from '@/lib/focus';

const pageCopy = {
  shops: {
    icon: 'storefront',
    title: 'Shops',
    body: 'Local stores are being prepared for customer ordering.',
  },
  groceries: {
    icon: 'shopping-basket',
    title: 'Groceries',
    body: 'Grocery ordering is coming soon for Hinoba-an customers.',
  },
  offers: {
    icon: 'local-offer',
    title: 'Offers',
    body: 'Promos and deal browsing will appear here soon.',
  },
} as const;

export default function ComingSoonScreen() {
  const { slug } = useLocalSearchParams<{ slug?: string }>();
  const router = useRouter();
  const content = useMemo(() => {
    if (slug === 'shops' || slug === 'groceries' || slug === 'offers') return pageCopy[slug];
    return pageCopy.shops;
  }, [slug]);

  return (
    <MobileShell>
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

      <View style={styles.panel}>
        <View style={styles.iconWrap}>
          <MaterialIcons color={TkimphPalette.green} name={content.icon as never} size={36} />
        </View>
        <Text style={styles.eyebrow}>Coming soon</Text>
        <Text style={styles.title}>{content.title}</Text>
        <Text style={styles.body}>{content.body}</Text>
        <Pressable
          onPress={() => {
            blurActiveElement();
            router.push('/restaurants' as never);
          }}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonText}>Browse restaurants</Text>
        </Pressable>
      </View>
    </MobileShell>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#EAEEF4',
    borderRadius: 18,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    marginBottom: 28,
    width: 38,
  },
  panel: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#EAEEF4',
    borderRadius: 18,
    borderWidth: 1,
    padding: 24,
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: '#E8F3ED',
    borderRadius: 30,
    height: 60,
    justifyContent: 'center',
    width: 60,
  },
  eyebrow: {
    color: TkimphPalette.green,
    fontSize: 12,
    fontWeight: '900',
    marginTop: 18,
    textTransform: 'uppercase',
  },
  title: {
    color: TkimphPalette.ink,
    fontSize: 26,
    fontWeight: '900',
    marginTop: 6,
  },
  body: {
    color: TkimphPalette.muted,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 21,
    marginTop: 8,
    textAlign: 'center',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: TkimphPalette.yellow,
    borderRadius: 14,
    height: 44,
    justifyContent: 'center',
    marginTop: 22,
    paddingHorizontal: 22,
  },
  primaryButtonText: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '900',
  },
});
