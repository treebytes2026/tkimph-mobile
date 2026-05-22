import { useEffect, useState } from 'react';

import { AuthUser, getStoredToken, getStoredUser, subscribeAuthChanged, UserRole } from '@/lib/api';

type AuthSessionState = {
  user: AuthUser | null;
  token: string | null;
  role: UserRole | null;
  isRider: boolean;
  isCustomer: boolean;
  isRestaurantOwner: boolean;
};

function readAuthSession(): AuthSessionState {
  const user = getStoredUser();
  const token = getStoredToken();
  const role = user?.role ?? null;

  return {
    user,
    token,
    role,
    isRider: role === 'rider' && Boolean(token),
    isCustomer: (!role || role === 'customer') && Boolean(token),
    isRestaurantOwner: role === 'restaurant_owner' && Boolean(token),
  };
}

export function hasRiderSession() {
  return readAuthSession().isRider;
}

export function hasRestaurantOwnerSession() {
  return readAuthSession().isRestaurantOwner;
}

export function useAuthSession() {
  const [session, setSession] = useState<AuthSessionState>(() => readAuthSession());

  useEffect(() => subscribeAuthChanged(() => setSession(readAuthSession())), []);

  return session;
}
