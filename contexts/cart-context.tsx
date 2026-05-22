import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { getStoredUser, PublicMenuItem, PublicRestaurant, subscribeAuthChanged } from '@/lib/api';

export type CartLine = {
  item: PublicMenuItem;
  qty: number;
};

type PersistedCart = {
  v: 1;
  cartRestaurant: PublicRestaurant | null;
  cart: CartLine[];
};

type CartContextValue = {
  hydrated: boolean;
  cartRestaurant: PublicRestaurant | null;
  cart: CartLine[];
  cartTotal: number;
  cartCount: number;
  registerCartRestaurant: (restaurant: PublicRestaurant) => void;
  addToCart: (item: PublicMenuItem) => void;
  setQty: (itemId: number, qty: number) => void;
  setLineQuantity: (item: PublicMenuItem, qty: number) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function storageKey() {
  const userId = getStoredUser()?.id;
  return userId != null ? `tkimph:cart-v1:user:${userId}` : 'tkimph:cart-v1:guest';
}

function parseCart(raw: string | null): PersistedCart | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as PersistedCart;
    if (data.v !== 1 || !Array.isArray(data.cart)) return null;
    return data;
  } catch {
    return null;
  }
}

export function CartProvider({ children }: PropsWithChildren) {
  const [hydrated, setHydrated] = useState(false);
  const [activeKey, setActiveKey] = useState(() => storageKey());
  const [cartRestaurant, setCartRestaurant] = useState<PublicRestaurant | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);

  const loadCart = useCallback((key: string) => {
    let cancelled = false;
    setHydrated(false);
    setActiveKey(key);
    AsyncStorage.getItem(key)
      .then((raw) => {
        if (cancelled) return;
        const saved = parseCart(raw);
        setCartRestaurant(saved?.cartRestaurant ?? null);
        setCart(saved?.cart ?? []);
      })
      .finally(() => {
        if (!cancelled) setHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return loadCart(storageKey());
  }, [loadCart]);

  useEffect(() => {
    return subscribeAuthChanged(() => {
      loadCart(storageKey());
    });
  }, [loadCart]);

  useEffect(() => {
    if (!hydrated) return;
    const payload: PersistedCart = { v: 1, cartRestaurant, cart };
    AsyncStorage.setItem(activeKey, JSON.stringify(payload)).catch(() => undefined);
  }, [activeKey, cart, cartRestaurant, hydrated]);

  const registerCartRestaurant = useCallback((restaurant: PublicRestaurant) => {
    setCartRestaurant((previous) => {
      if (previous && previous.id !== restaurant.id) {
        setCart([]);
      }
      return restaurant;
    });
  }, []);

  const addToCart = useCallback((item: PublicMenuItem) => {
    setCart((previous) => {
      const index = previous.findIndex((line) => line.item.id === item.id);
      if (index < 0) return [...previous, { item, qty: 1 }];
      const next = [...previous];
      next[index] = { ...next[index], qty: next[index].qty + 1 };
      return next;
    });
  }, []);

  const setQty = useCallback((itemId: number, qty: number) => {
    setCart((previous) => {
      if (qty < 1) return previous.filter((line) => line.item.id !== itemId);
      return previous.map((line) => (line.item.id === itemId ? { ...line, qty } : line));
    });
  }, []);

  const setLineQuantity = useCallback((item: PublicMenuItem, qty: number) => {
    setCart((previous) => {
      if (qty < 1) return previous.filter((line) => line.item.id !== item.id);
      const index = previous.findIndex((line) => line.item.id === item.id);
      if (index < 0) return [...previous, { item, qty }];
      const next = [...previous];
      next[index] = { ...next[index], qty };
      return next;
    });
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setCartRestaurant(null);
  }, []);

  const cartTotal = useMemo(
    () => cart.reduce((sum, line) => sum + Number(line.item.price) * line.qty, 0),
    [cart]
  );
  const cartCount = useMemo(() => cart.reduce((sum, line) => sum + line.qty, 0), [cart]);

  const value = useMemo(
    () => ({
      hydrated,
      cartRestaurant,
      cart,
      cartTotal,
      cartCount,
      registerCartRestaurant,
      addToCart,
      setQty,
      setLineQuantity,
      clearCart,
    }),
    [addToCart, cart, cartCount, cartRestaurant, cartTotal, clearCart, hydrated, registerCartRestaurant, setLineQuantity, setQty]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used inside CartProvider');
  return context;
}
