import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Tabs, useNavigationContainerRef, usePathname, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getStoredUser, subscribeAuthChanged, UserRole } from '@/lib/api';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const navigationRef = useNavigationContainerRef();
  const router = useRouter();
  const pathname = usePathname();
  const [role, setRole] = useState<UserRole | null>(() => getStoredUser()?.role ?? null);
  const [isNavigationReady, setIsNavigationReady] = useState(() => navigationRef.isReady());
  const isRider = role === 'rider';
  const isRestaurantOwner = role === 'restaurant_owner';
  const showCustomerTabs = !isRider && !isRestaurantOwner;

  useEffect(() => {
    if (isNavigationReady) return;

    let frame: number | null = null;
    let cancelled = false;

    const checkNavigationReady = () => {
      if (cancelled) return;

      if (navigationRef.isReady()) {
        setIsNavigationReady(true);
        return;
      }

      frame = requestAnimationFrame(checkNavigationReady);
    };

    frame = requestAnimationFrame(checkNavigationReady);

    return () => {
      cancelled = true;
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [isNavigationReady, navigationRef]);

  useEffect(() => {
    return subscribeAuthChanged(() => setRole(getStoredUser()?.role ?? null));
  }, []);

  useEffect(() => {
    if (!isNavigationReady) return;

    const restaurantPaths = ['/restaurant', '/restaurant-orders', '/restaurant-menu', '/restaurant-promos', '/restaurant-money', '/restaurant-store'];

    if (isRider && ['/', '/browse', '/orders', ...restaurantPaths].includes(pathname)) {
      router.replace('/driver' as never);
      return;
    }

    if (isRestaurantOwner && ['/', '/browse', '/orders', '/driver', '/rider-jobs', '/rider-history'].includes(pathname)) {
      router.replace('/restaurant' as never);
      return;
    }

    if (showCustomerTabs && ['/driver', '/rider-jobs', '/rider-history', ...restaurantPaths].includes(pathname)) {
      router.replace('/' as never);
    }
  }, [isNavigationReady, isRestaurantOwner, isRider, pathname, router, showCustomerTabs]);

  return (
    <Tabs
      tabBar={(props: BottomTabBarProps) => <AppTabBar {...props} role={role} />}
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        tabBarInactiveTintColor: '#98A2B3',
        tabBarActiveBackgroundColor: '#FFFFFF',
        tabBarInactiveBackgroundColor: '#FFFFFF',
        headerShown: false,
        tabBarItemStyle: {
          borderRadius: 0,
          marginHorizontal: 0,
          marginVertical: 0,
          paddingVertical: 0,
        },
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#EAEEF4',
          height: 74,
          overflow: 'hidden',
          paddingBottom: 9,
          paddingTop: 7,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '800',
          marginTop: 1,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          href: showCustomerTabs ? '/' : null,
          title: 'Home',
          tabBarLabel: ({ focused }) => <TabLabel focused={focused}>Home</TabLabel>,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused}>
              <IconSymbol size={20} name="house.fill" color={focused ? '#1E8544' : color} />
            </TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="browse"
        options={{
          href: showCustomerTabs ? '/browse' : null,
          title: 'Browse',
          tabBarLabel: ({ focused }) => <TabLabel focused={focused}>Browse</TabLabel>,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused}>
              <IconSymbol size={20} name="magnifyingglass" color={focused ? '#1E8544' : color} />
            </TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          href: showCustomerTabs ? '/orders' : null,
          title: 'Orders',
          tabBarLabel: ({ focused }) => <TabLabel focused={focused}>Orders</TabLabel>,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused}>
              <IconSymbol size={20} name="doc.text.fill" color={focused ? '#1E8544' : color} />
            </TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="restaurant"
        options={{
          href: isRestaurantOwner ? '/restaurant' : null,
          title: 'Dashboard',
          tabBarLabel: ({ focused }) => <TabLabel focused={focused}>Dashboard</TabLabel>,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused}>
              <IconSymbol size={20} name="storefront.fill" color={focused ? '#1E8544' : color} />
            </TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="restaurant-orders"
        options={{
          href: isRestaurantOwner ? '/restaurant-orders' : null,
          title: 'Orders',
          tabBarLabel: ({ focused }) => <TabLabel focused={focused}>Orders</TabLabel>,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused}>
              <IconSymbol size={20} name="doc.text.fill" color={focused ? '#1E8544' : color} />
            </TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="restaurant-menu"
        options={{
          href: isRestaurantOwner ? '/restaurant-menu' : null,
          title: 'Menu',
          tabBarLabel: ({ focused }) => <TabLabel focused={focused}>Menu</TabLabel>,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused}>
              <IconSymbol size={20} name="briefcase.fill" color={focused ? '#1E8544' : color} />
            </TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="restaurant-promos"
        options={{
          href: null,
          title: 'Promos',
          tabBarLabel: ({ focused }) => <TabLabel focused={focused}>Promos</TabLabel>,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused}>
              <IconSymbol size={20} name="paperplane.fill" color={focused ? '#1E8544' : color} />
            </TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="restaurant-money"
        options={{
          href: null,
          title: 'Money',
          tabBarLabel: ({ focused }) => <TabLabel focused={focused}>Money</TabLabel>,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused}>
              <IconSymbol size={20} name="clock.arrow.circlepath" color={focused ? '#1E8544' : color} />
            </TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="restaurant-store"
        options={{
          href: null,
          title: 'Store',
          tabBarLabel: ({ focused }) => <TabLabel focused={focused}>Store</TabLabel>,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused}>
              <IconSymbol size={20} name="storefront.fill" color={focused ? '#1E8544' : color} />
            </TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="driver"
        options={{
          href: isRider ? '/driver' : null,
          title: 'Dashboard',
          tabBarLabel: ({ focused }) => <TabLabel focused={focused}>Dashboard</TabLabel>,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused}>
              <IconSymbol size={20} name="car.fill" color={focused ? '#1E8544' : color} />
            </TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="rider-jobs"
        options={{
          href: isRider ? '/rider-jobs' : null,
          title: 'Jobs',
          tabBarLabel: ({ focused }) => <TabLabel focused={focused}>Jobs</TabLabel>,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused}>
              <IconSymbol size={20} name="briefcase.fill" color={focused ? '#1E8544' : color} />
            </TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="rider-history"
        options={{
          href: isRider ? '/rider-history' : null,
          title: 'History',
          tabBarLabel: ({ focused }) => <TabLabel focused={focused}>History</TabLabel>,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused}>
              <IconSymbol size={20} name="clock.arrow.circlepath" color={focused ? '#1E8544' : color} />
            </TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Profile',
          tabBarLabel: ({ focused }) => <TabLabel focused={focused}>Profile</TabLabel>,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused}>
              <IconSymbol size={20} name="person.crop.circle.fill" color={focused ? '#1E8544' : color} />
            </TabIcon>
          ),
        }}
      />
    </Tabs>
  );
}

function AppTabBar({ state, descriptors, navigation, role }: BottomTabBarProps & { role: UserRole | null }) {
  const visibleRouteNames =
    role === 'rider'
      ? ['driver', 'rider-jobs', 'rider-history', 'account']
      : role === 'restaurant_owner'
        ? ['restaurant', 'restaurant-orders', 'restaurant-menu', 'account']
        : ['index', 'browse', 'orders', 'account'];
  const visibleRoutes = state.routes.filter((route) => visibleRouteNames.includes(route.name));

  return (
    <View style={styles.tabBar}>
      {visibleRoutes.map((route) => {
        const descriptor = descriptors[route.key];
        const options = descriptor.options;
        const focused = state.index === state.routes.findIndex((item) => item.key === route.key);
        const color = focused ? '#1E8544' : '#98A2B3';
        const label =
          typeof options.tabBarLabel === 'string'
            ? options.tabBarLabel
            : typeof options.title === 'string'
              ? options.title
              : route.name;

        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={focused ? { selected: true } : undefined}
            key={route.key}
            onPress={() => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params);
              }
            }}
            style={({ hovered, pressed }) => [
              styles.tabItem,
              (hovered || pressed) && styles.tabItemHover,
            ]}>
            {options.tabBarIcon ? options.tabBarIcon({ focused, color, size: 20 }) : null}
            <Text style={[styles.label, focused && styles.labelActive]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function TabIcon({ children, focused }: { children: React.ReactNode; focused: boolean }) {
  return <View style={[styles.iconBubble, focused && styles.iconBubbleActive]}>{children}</View>;
}

function TabLabel({ children, focused }: { children: string; focused: boolean }) {
  return <Text style={[styles.label, focused && styles.labelActive]}>{children}</Text>;
}

const styles = StyleSheet.create({
  tabBar: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderTopColor: '#EAEEF4',
    borderTopWidth: 1,
    flexDirection: 'row',
    height: 74,
    justifyContent: 'space-around',
    paddingBottom: 9,
    paddingTop: 7,
    ...Platform.select({
      web: { boxShadow: '0 -1px 4px rgba(16, 24, 40, 0.04)' },
      default: {},
    }),
  },
  tabItem: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minHeight: 58,
  },
  tabItemHover: {
    backgroundColor: 'transparent',
  },
  iconBubble: {
    alignItems: 'center',
    borderRadius: 15,
    height: 30,
    justifyContent: 'center',
    marginBottom: -1,
    width: 30,
  },
  iconBubbleActive: {
    backgroundColor: '#E6F4EC',
  },
  label: {
    color: '#98A2B3',
    fontSize: 10,
    fontWeight: '800',
    lineHeight: 13,
    marginTop: 1,
  },
  labelActive: {
    color: '#1E8544',
  },
});
