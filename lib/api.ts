import AsyncStorage from '@react-native-async-storage/async-storage';

const DEFAULT_API_URL = 'https://api.tkimph.com/api';

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, '') || DEFAULT_API_URL;

let nativeToken: string | null = null;
let nativeUser: AuthUser | null = null;
const TOKEN_KEY = 'tkimph:auth-token';
const USER_KEY = 'tkimph:auth-user';
const EXPO_PUSH_TOKEN_KEY = 'tkimph:expo-push-token';
const authListeners = new Set<() => void>();

export type UserRole = 'customer' | 'restaurant_owner' | 'rider' | 'admin' | string;

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  phone?: string | null;
  address?: string | null;
  email_verified?: boolean;
  phone_verified?: boolean;
};

export type AuthResponse = {
  token: string;
  user: AuthUser;
};

export type PushTokenPayload = {
  expo_push_token: string;
  platform?: 'ios' | 'android' | 'web';
  device_id?: string | null;
  device_name?: string | null;
  app_version?: string | null;
  enabled?: boolean;
};

export type PublicRestaurant = {
  id: number;
  name: string;
  slug: string | null;
  description: string | null;
  phone?: string | null;
  address: string | null;
  opening_hours?: PublicOpeningHoursDay[] | null;
  location_images?: PublicLocationImage[];
  profile_image_path: string | null;
  profile_image_url: string | null;
  rating?: number;
  review_count?: number;
  delivery_min_minutes?: number;
  delivery_max_minutes?: number;
  delivery_fee_php?: number;
  standard_delivery_fee_php?: number;
  free_delivery_min_spend_php?: number;
  price_level?: number;
  promo_label?: string | null;
  promotions?: PublicPromotion[];
  is_ad?: boolean;
  cuisine: { id: number; name: string } | null;
  business_type?: { id: number; name: string } | null;
  menus?: { id: number; name: string }[];
};

export type PublicMenuItem = {
  id: number;
  name: string;
  description: string | null;
  price: string;
  original_price?: number;
  has_discount?: boolean;
  discount_percent?: number;
  image_path: string | null;
  image_url: string | null;
  rating?: number;
  review_count?: number;
};

export type PublicOpeningHoursDay = {
  day: number;
  closed: boolean;
  open: string | null;
  close: string | null;
};

export type PublicLocationImage = {
  id: number;
  path: string;
  url: string | null;
  sort_order: number;
};

export type PublicPromotion = {
  id: number;
  code: string;
  name: string;
  min_spend: number;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  max_discount_amount: number | null;
  stackable: boolean;
  auto_apply: boolean;
  first_order_only: boolean;
  ends_at: string | null;
  display_label: string;
};

export type PublicMenuGroup = {
  menu: { id: number; name: string; sort_order: number };
  items: PublicMenuItem[];
};

export type RestaurantWithMenusFeed = {
  restaurant: PublicRestaurant;
  menus: PublicMenuGroup[];
};

export type PaginatedResponse<T> = {
  data: T[];
  current_page?: number;
  first_page_url?: string | null;
  from?: number | null;
  last_page?: number;
  last_page_url?: string | null;
  links?: Array<{ url: string | null; label: string; active: boolean }>;
  next_page_url?: string | null;
  path?: string;
  per_page?: number;
  prev_page_url?: string | null;
  to?: number | null;
  total?: number;
  meta?: { total?: number; limit?: number; per_page?: number; current_page?: number; last_page?: number };
};

export type PublicRestaurantDetailResponse = {
  restaurant: PublicRestaurant;
  menus: PublicMenuGroup[];
  reviews?: Array<{
    id: number;
    restaurant_rating: number;
    comment: string | null;
    customer_name: string | null;
    created_at: string | null;
  }>;
};

export type PartnerOverview = {
  user: AuthUser;
  restaurants: PartnerRestaurant[];
  settings?: {
    partner_self_pause_enabled: boolean;
    partner_cancel_window_minutes: number;
  };
};

export type PartnerOrder = {
  id: number;
  order_number: string;
  status: string;
  payment_method?: string;
  payment_status?: string;
  delivery_mode: string;
  delivery_address?: string | null;
  delivery_floor?: string | null;
  delivery_note?: string | null;
  location_label?: string | null;
  subtotal?: string;
  service_fee?: string;
  delivery_fee?: string;
  gross_sales?: string;
  restaurant_net?: string;
  total: string;
  placed_at: string | null;
  cancelled_by_role?: string | null;
  cancellation_reason?: string | null;
  cancelled_at?: string | null;
  customer: { id: number; name: string; phone: string | null } | null;
  restaurant: { id: number; name: string } | null;
  items?: PartnerOrderItem[];
  timeline?: PartnerOrderTimelineEvent[];
};

export type PartnerRestaurant = {
  id: number;
  name: string;
  slug?: string | null;
  description?: string | null;
  phone?: string | null;
  address: string | null;
  operating_status: 'open' | 'paused' | 'temporarily_closed' | 'suspended';
  operating_note?: string | null;
  paused_until?: string | null;
  publicly_orderable: boolean;
  readiness_status: 'ready' | 'incomplete';
  opening_hours?: PublicOpeningHoursDay[] | null;
  profile_image_path?: string | null;
  profile_image_url?: string | null;
  location_images?: PublicLocationImage[];
  business_type?: { id: number; name: string; slug?: string | null } | null;
  business_category?: { id: number; name: string } | null;
  cuisine?: { id: number; name: string } | null;
};

export type PartnerOrderItem = {
  id: number;
  menu_item_id?: number | null;
  name: string;
  unit_price: string;
  quantity: number;
  line_total: string;
};

export type PartnerOrderTimelineEvent = {
  id: number;
  event_type: string;
  from_status: string | null;
  to_status: string | null;
  note: string | null;
  actor?: { id: number; name: string; role: string } | null;
  created_at: string | null;
};

export type PartnerMenu = {
  id: number;
  restaurant_id: number;
  name: string;
  sort_order: number;
  is_active: boolean;
  discount_enabled: boolean;
  discount_percent: number | string | null;
  items_count?: number;
  items?: PartnerMenuItem[];
  items_pagination?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    next_page_url: string | null;
  };
};

export type PartnerMenuItem = {
  id: number;
  menu_id: number;
  menu_category_id: number | null;
  name: string;
  description: string | null;
  price: string;
  discount_enabled: boolean;
  discount_percent: number | string | null;
  sort_order: number;
  is_available: boolean;
  image_path?: string | null;
  image_url?: string | null;
  menu_category?: PartnerMenuCategory | null;
  menuCategory?: PartnerMenuCategory | null;
};

export type PartnerMenuCategory = {
  id: number;
  name: string;
  slug?: string | null;
  sort_order?: number;
  is_active?: boolean;
};

export type UploadFile = {
  uri: string;
  name: string;
  type: string;
  file?: Blob;
};

export type PartnerEarnings = {
  restaurant_id: number;
  restaurant_name: string;
  order_count: number;
  gross_sales: number;
  commission_rate: number;
  platform_commission: number;
  delivery_fees: number;
  restaurant_net: number;
  payment_details?: {
    gcash_name?: string | null;
    gcash_number?: string | null;
  };
};

export type PartnerPromotion = {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  is_active: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
  min_spend: number | string;
  discount_type: 'percentage' | 'fixed' | string;
  discount_value: number | string;
  max_discount_amount?: number | string | null;
  global_usage_limit?: number | null;
  per_user_usage_limit?: number | null;
  stackable: boolean;
  auto_apply: boolean;
  first_order_only: boolean;
  priority?: number;
};

export type PartnerCommissionCollection = {
  id: number;
  restaurant_id: number;
  restaurant?: { id: number; name: string } | null;
  period_from: string | null;
  period_to: string | null;
  due_date: string | null;
  is_overdue: boolean;
  order_count: number;
  gross_sales: number;
  commission_amount: number;
  restaurant_net: number;
  status: string;
  partner_payment_method?: string | null;
  partner_reference_number?: string | null;
  partner_payment_note?: string | null;
  payment_proof_url?: string | null;
  payment_submitted_at?: string | null;
  collection_reference?: string | null;
  notes?: string | null;
  received_at?: string | null;
};

export type PartnerSettlement = {
  id: number;
  restaurant_id: number;
  restaurant?: { id: number; name: string } | null;
  period_from: string | null;
  period_to: string | null;
  due_date: string | null;
  status: string;
  platform_revenue: number;
  partner_reference_number?: string | null;
  partner_payment_note?: string | null;
  payment_proof_url?: string | null;
  payment_submitted_at?: string | null;
};

export type PartnerNotification = {
  id: string;
  type: string;
  data?: {
    title?: string;
    message?: string;
    body?: string;
    [key: string]: unknown;
  };
  read_at: string | null;
  created_at: string | null;
};

export type RiderOverview = {
  rider: {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    is_active: boolean;
  };
  active_orders_count: number;
  completed_today_count: number;
};

export type RiderOrder = {
  id: number;
  order_number: string;
  status: string;
  delivery_mode: string;
  delivery_address: string;
  delivery_floor?: string | null;
  delivery_note?: string | null;
  placed_at?: string | null;
  total: number;
  customer: { id: number; name: string; phone: string | null } | null;
  restaurant: { id: number; name: string; phone: string | null } | null;
};

export type CustomerOrder = {
  id: number;
  order_number: string;
  status: string;
  payment_method?: string;
  payment_status?: string;
  refund_status?: string;
  delivery_mode?: 'delivery' | 'pickup' | string;
  delivery_address?: string;
  delivery_floor?: string | null;
  delivery_note?: string | null;
  location_label?: string | null;
  subtotal?: number;
  service_fee?: number;
  delivery_fee?: number;
  discounts_total?: number;
  total: number;
  placed_at: string | null;
  customer_cancel_requested_at?: string | null;
  customer_cancel_reason?: string | null;
  customer_cancel_eligible?: boolean;
  restaurant: {
    id: number;
    name: string;
    slug?: string | null;
    address?: string | null;
    profile_image_path: string | null;
    profile_image_url: string | null;
  } | null;
  items: Array<{
    id: number;
    menu_item_id?: number | null;
    name: string;
    quantity: number;
    unit_price?: number;
    line_total?: number;
    image_path?: string | null;
    image_url?: string | null;
  }>;
  discounts?: Array<{
    id: number;
    code: string;
    discount_type: string;
    discount_value: number;
    discount_amount: number;
  }>;
  issues?: Array<{
    id: number;
    issue_type: string;
    status: string;
    subject: string;
    description: string;
    resolution: string | null;
    created_at: string | null;
    resolved_at: string | null;
  }>;
  review?: {
    id: number;
    restaurant_rating: number;
    rider_rating: number | null;
    comment: string | null;
    status: string;
    created_at: string | null;
  } | null;
  timeline?: Array<{
    id: number;
    event_type: string;
    from_status: string | null;
    to_status: string | null;
    note: string | null;
    created_at: string | null;
    actor?: { id: number; name: string; role: string } | null;
  }>;
  rider?: { id: number; name: string; phone: string | null } | null;
};

export type PlaceOrderPayload = {
  restaurant_id: number;
  delivery_mode: 'delivery' | 'pickup';
  payment_method: 'cod' | 'wallet' | 'card';
  promo_code?: string | null;
  delivery_address: string;
  delivery_floor?: string | null;
  delivery_note?: string | null;
  location_label?: string | null;
  items: Array<{ item_id: number; qty: number }>;
};

type ApiErrorBody = {
  message?: string;
  error?: string;
  errors?: Record<string, string[]>;
};

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

function hasWindowStorage() {
  return typeof window !== 'undefined' && 'localStorage' in window;
}

function notifyAuthChanged() {
  authListeners.forEach((listener) => listener());
}

export function subscribeAuthChanged(listener: () => void) {
  authListeners.add(listener);
  return () => {
    authListeners.delete(listener);
  };
}

export async function hydrateSession() {
  if (hasWindowStorage()) return;
  const [token, userJson] = await Promise.all([AsyncStorage.getItem(TOKEN_KEY), AsyncStorage.getItem(USER_KEY)]);
  nativeToken = token;
  nativeUser = userJson ? (JSON.parse(userJson) as AuthUser) : null;
  notifyAuthChanged();
}

function parseMessage(data: ApiErrorBody): string | null {
  if (data.errors) {
    const first = Object.values(data.errors)[0];
    if (Array.isArray(first) && first[0]) return first[0];
  }
  return data.message || data.error || null;
}

export function getStoredToken(): string | null {
  if (hasWindowStorage()) return window.localStorage.getItem('token');
  return nativeToken;
}

export function getStoredUser(): AuthUser | null {
  if (hasWindowStorage()) {
    const raw = window.localStorage.getItem('user');
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  }
  return nativeUser;
}

export function setSession(session: AuthResponse) {
  if (hasWindowStorage()) {
    window.localStorage.setItem('token', session.token);
    window.localStorage.setItem('user', JSON.stringify(session.user));
    notifyAuthChanged();
    return;
  }
  nativeToken = session.token;
  nativeUser = session.user;
  AsyncStorage.multiSet([
    [TOKEN_KEY, session.token],
    [USER_KEY, JSON.stringify(session.user)],
  ]).catch(() => undefined);
  notifyAuthChanged();
}

export function updateStoredUser(user: AuthUser) {
  if (hasWindowStorage()) {
    window.localStorage.setItem('user', JSON.stringify(user));
    notifyAuthChanged();
    return;
  }
  nativeUser = user;
  AsyncStorage.setItem(USER_KEY, JSON.stringify(user)).catch(() => undefined);
  notifyAuthChanged();
}

export function clearSession() {
  if (hasWindowStorage()) {
    window.localStorage.removeItem('token');
    window.localStorage.removeItem('user');
    notifyAuthChanged();
    return;
  }
  nativeToken = null;
  nativeUser = null;
  AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]).catch(() => undefined);
  notifyAuthChanged();
}

export function apiOrigin(): string {
  return API_URL.endsWith('/api') ? API_URL.slice(0, -4) : API_URL;
}

export function publicFileUrl(path?: string | null, fallback?: string | null): string | null {
  const clean = path?.replace(/^\/+/, '').replace(/^storage\//, '');
  if (clean) return `${apiOrigin()}/storage/${clean}`;
  return fallback?.trim() || null;
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers: HeadersInit = {
    Accept: 'application/json',
    ...(!isFormData && options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (!response.ok) {
    const text = await response.text();
    let body: unknown = text;
    let message = response.statusText || 'Request failed';
    try {
      const parsed = JSON.parse(text) as ApiErrorBody;
      body = parsed;
      message = parseMessage(parsed) || message;
    } catch {
      if (text) message = text.slice(0, 200);
    }
    if (response.status === 401) clearSession();
    throw new ApiError(message, response.status, body);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function cacheExpoPushToken(token: string | null) {
  if (!token) {
    await AsyncStorage.removeItem(EXPO_PUSH_TOKEN_KEY);
    return;
  }
  await AsyncStorage.setItem(EXPO_PUSH_TOKEN_KEY, token);
}

export function getCachedExpoPushToken() {
  return AsyncStorage.getItem(EXPO_PUSH_TOKEN_KEY);
}

export function registerExpoPushToken(payload: PushTokenPayload) {
  return request<{ message: string; token: { id: number; enabled: boolean; platform?: string | null } }>('/me/push-token', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function unregisterCachedExpoPushToken(authToken = getStoredToken()) {
  const expoPushToken = await getCachedExpoPushToken();
  if (!expoPushToken || !authToken) {
    await cacheExpoPushToken(null);
    return;
  }

  await fetch(`${API_URL}/me/push-token`, {
    method: 'DELETE',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({ expo_push_token: expoPushToken }),
  }).catch(() => undefined);

  await cacheExpoPushToken(null);
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const session = await request<AuthResponse>('/login', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim(), password }),
  });
  if (session.user.role === 'admin') {
    throw new ApiError('Admin access stays on the web dashboard.', 403);
  }
  setSession(session);
  return session;
}

export async function logout(): Promise<void> {
  const token = getStoredToken();
  await unregisterCachedExpoPushToken(token);
  clearSession();
  if (!token) return;
  await request<void>('/logout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => undefined);
}

export async function fetchCurrentUser(): Promise<AuthUser> {
  const user = await request<AuthUser>('/user');
  updateStoredUser(user);
  return user;
}

export async function updateCustomerProfile(payload: {
  name: string;
  email: string;
  phone: string;
  address?: string | null;
}) {
  const response = await request<{ message: string; user: AuthUser }>('/customer/profile', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  updateStoredUser(response.user);
  return response;
}

export function changeCustomerPassword(payload: {
  current_password: string;
  password: string;
  password_confirmation: string;
}) {
  return request<{ message: string }>('/customer/change-password', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function fetchPublicRestaurants(params: { perPage?: number; page?: number; cuisineId?: number; q?: string } = {}) {
  const search = new URLSearchParams();
  search.set('per_page', String(params.perPage ?? 24));
  if (params.page != null) search.set('page', String(params.page));
  if (params.cuisineId != null) search.set('cuisine_id', String(params.cuisineId));
  if (params.q?.trim()) search.set('q', params.q.trim());
  return request<PaginatedResponse<PublicRestaurant>>(`/public/restaurants?${search.toString()}`);
}

export function fetchPublicRestaurantsMenuFeed(limit = 8, cuisineId?: number, q?: string, page?: number) {
  const params = new URLSearchParams();
  params.set('per_page', String(limit));
  params.set('limit', String(limit));
  if (page != null) params.set('page', String(page));
  if (cuisineId != null) params.set('cuisine_id', String(cuisineId));
  if (q?.trim()) params.set('q', q.trim());
  return request<PaginatedResponse<RestaurantWithMenusFeed>>(
    `/public/restaurants-menu-feed?${params.toString()}`
  );
}

export function fetchPublicRestaurantBySlug(slug: string) {
  return request<PublicRestaurantDetailResponse>(`/public/restaurants/${encodeURIComponent(slug)}`);
}

export function fetchPartnerOverview() {
  return request<PartnerOverview>('/partner/overview');
}

function uploadForm(field: string, file: UploadFile, extra?: Record<string, string | number | boolean | null | undefined>) {
  const form = new FormData();
  Object.entries(extra ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) form.append(key, String(value));
  });
  if (typeof Blob !== 'undefined' && file.file instanceof Blob) {
    form.append(field, file.file, file.name);
  } else {
    form.append(field, { uri: file.uri, name: file.name, type: file.type } as unknown as Blob);
  }
  return form;
}

export async function updatePartnerProfile(payload: { name: string; phone?: string | null }) {
  const response = await request<{ message: string; user: AuthUser }>('/partner/profile', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  updateStoredUser(response.user);
  return response;
}

export function changePartnerPassword(payload: {
  current_password: string;
  password: string;
  password_confirmation: string;
}) {
  return request<{ message: string }>('/partner/change-password', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updatePartnerRestaurant(
  restaurantId: number,
  payload: Partial<Pick<PartnerRestaurant, 'name' | 'description' | 'phone' | 'address' | 'opening_hours'>>
) {
  return request<PartnerRestaurant>(`/partner/restaurants/${restaurantId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function uploadPartnerRestaurantProfileImage(restaurantId: number, image: UploadFile) {
  return request<PartnerRestaurant>(`/partner/restaurants/${restaurantId}/profile-image`, {
    method: 'POST',
    body: uploadForm('image', image),
  });
}

export function deletePartnerRestaurantProfileImage(restaurantId: number) {
  return request<PartnerRestaurant>(`/partner/restaurants/${restaurantId}/profile-image`, {
    method: 'DELETE',
  });
}

export function uploadPartnerRestaurantLocationImage(restaurantId: number, image: UploadFile) {
  return request<PartnerRestaurant>(`/partner/restaurants/${restaurantId}/location-images`, {
    method: 'POST',
    body: uploadForm('image', image),
  });
}

export function deletePartnerRestaurantLocationImage(restaurantId: number, imageId: number) {
  return request<PartnerRestaurant>(`/partner/restaurants/${restaurantId}/location-images/${imageId}`, {
    method: 'DELETE',
  });
}

export function fetchPartnerOrders(params: string | { status?: string; live?: boolean; perPage?: number; page?: number; sinceId?: number } = {}) {
  const options = typeof params === 'string' ? { status: params } : params;
  const query = new URLSearchParams();
  if (options.status) query.set('status', options.status);
  if (options.live) query.set('live', '1');
  query.set('per_page', String(options.perPage ?? 20));
  if (options.page != null) query.set('page', String(options.page));
  if (options.sinceId != null) query.set('since_id', String(options.sinceId));
  return request<PaginatedResponse<PartnerOrder>>(`/partner/orders?${query.toString()}`);
}

export function updatePartnerOrderStatus(orderId: number, status: string, reason?: string | null) {
  return request<{ message: string; order: PartnerOrder }>(`/partner/orders/${orderId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, reason: reason ?? null }),
  });
}

export function updatePartnerRestaurantAvailability(
  restaurantId: number,
  payload: { operating_status: 'open' | 'paused'; operating_note?: string | null; paused_until?: string | null }
) {
  return request<PartnerRestaurant>(`/partner/restaurants/${restaurantId}/availability`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function fetchPartnerMenus(restaurantId: number, page = 1) {
  return request<PaginatedResponse<PartnerMenu>>(`/partner/restaurants/${restaurantId}/menus?per_page=50&page=${page}`);
}

export function fetchPartnerMenu(restaurantId: number, menuId: number) {
  return request<PartnerMenu>(`/partner/restaurants/${restaurantId}/menus/${menuId}`);
}

export function updatePartnerMenu(
  restaurantId: number,
  menuId: number,
  payload: Partial<Pick<PartnerMenu, 'name' | 'sort_order' | 'is_active' | 'discount_enabled' | 'discount_percent'>>
) {
  return request<PartnerMenu>(`/partner/restaurants/${restaurantId}/menus/${menuId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function createPartnerMenu(
  restaurantId: number,
  payload: Pick<PartnerMenu, 'name'> & Partial<Pick<PartnerMenu, 'sort_order' | 'is_active' | 'discount_enabled' | 'discount_percent'>>
) {
  return request<PartnerMenu>(`/partner/restaurants/${restaurantId}/menus`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function deletePartnerMenu(restaurantId: number, menuId: number) {
  return request<{ message: string }>(`/partner/restaurants/${restaurantId}/menus/${menuId}`, {
    method: 'DELETE',
  });
}

export function createPartnerMenuItem(
  restaurantId: number,
  menuId: number,
  payload: Pick<PartnerMenuItem, 'menu_category_id' | 'name' | 'price'> &
    Partial<Pick<PartnerMenuItem, 'description' | 'discount_enabled' | 'discount_percent' | 'sort_order' | 'is_available'>>
) {
  return request<PartnerMenuItem>(`/partner/restaurants/${restaurantId}/menus/${menuId}/items`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updatePartnerMenuItem(
  restaurantId: number,
  menuId: number,
  itemId: number,
  payload: Partial<
    Pick<
      PartnerMenuItem,
      'menu_category_id' | 'name' | 'description' | 'price' | 'discount_enabled' | 'discount_percent' | 'sort_order' | 'is_available'
    >
  >
) {
  return request<PartnerMenuItem>(`/partner/restaurants/${restaurantId}/menus/${menuId}/items/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deletePartnerMenuItem(restaurantId: number, menuId: number, itemId: number) {
  return request<{ message: string }>(`/partner/restaurants/${restaurantId}/menus/${menuId}/items/${itemId}`, {
    method: 'DELETE',
  });
}

export function uploadPartnerMenuItemImage(restaurantId: number, menuId: number, itemId: number, image: UploadFile) {
  return request<PartnerMenuItem>(`/partner/restaurants/${restaurantId}/menus/${menuId}/items/${itemId}/image`, {
    method: 'POST',
    body: uploadForm('image', image),
  });
}

export function deletePartnerMenuItemImage(restaurantId: number, menuId: number, itemId: number) {
  return request<PartnerMenuItem>(`/partner/restaurants/${restaurantId}/menus/${menuId}/items/${itemId}/image`, {
    method: 'DELETE',
  });
}

export function fetchPartnerMenuCategories() {
  return request<{ data: PartnerMenuCategory[] }>('/partner/menu-categories');
}

export function fetchPartnerPromotions(restaurantId: number) {
  return request<{ data: PartnerPromotion[] }>(`/partner/restaurants/${restaurantId}/promotions`);
}

export function createPartnerPromotion(restaurantId: number, payload: Partial<PartnerPromotion>) {
  return request<PartnerPromotion>(`/partner/restaurants/${restaurantId}/promotions`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updatePartnerPromotion(restaurantId: number, promotionId: number, payload: Partial<PartnerPromotion>) {
  return request<PartnerPromotion>(`/partner/restaurants/${restaurantId}/promotions/${promotionId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deletePartnerPromotion(restaurantId: number, promotionId: number) {
  return request<{ message: string }>(`/partner/restaurants/${restaurantId}/promotions/${promotionId}`, {
    method: 'DELETE',
  });
}

export function fetchPartnerEarnings() {
  return request<PartnerEarnings>('/partner/earnings');
}

export function fetchPartnerCommissionCollections() {
  return request<{
    data: PartnerCommissionCollection[];
    payment_details?: { gcash_name?: string | null; gcash_number?: string | null };
  }>('/partner/commission-collections');
}

export function submitPartnerCommissionCollectionProof(
  collectionId: number,
  payload: { proof: UploadFile; partner_payment_method: 'gcash'; partner_reference_number?: string | null; partner_payment_note?: string | null }
) {
  return request<{ message: string; collection: PartnerCommissionCollection }>(`/partner/commission-collections/${collectionId}/payment-proof`, {
    method: 'POST',
    body: uploadForm('payment_proof', payload.proof, {
      partner_payment_method: payload.partner_payment_method,
      partner_reference_number: payload.partner_reference_number,
      partner_payment_note: payload.partner_payment_note,
    }),
  });
}

export function fetchPartnerSettlements() {
  return request<{ data: PartnerSettlement[] }>('/partner/settlements');
}

export function submitPartnerSettlementProof(
  settlementId: number,
  payload: { proof: UploadFile; partner_reference_number: string; partner_payment_note?: string | null }
) {
  return request<{ message: string; settlement: PartnerSettlement }>(`/partner/settlements/${settlementId}/payment-proof`, {
    method: 'POST',
    body: uploadForm('payment_proof', payload.proof, {
      partner_reference_number: payload.partner_reference_number,
      partner_payment_note: payload.partner_payment_note,
    }),
  });
}

export function fetchPartnerNotifications(perPage = 10) {
  return request<{ data: PartnerNotification[] }>(`/partner/notifications?per_page=${perPage}`);
}

export function fetchPartnerNotificationUnreadCount() {
  return request<{ count: number }>('/partner/notifications/unread-count');
}

export function markPartnerNotificationRead(notificationId: string) {
  return request<{ message: string }>(`/partner/notifications/${notificationId}/read`, {
    method: 'POST',
  });
}

export function markAllPartnerNotificationsRead() {
  return request<{ message: string }>('/partner/notifications/read-all', {
    method: 'POST',
  });
}

export function fetchRiderOverview() {
  return request<RiderOverview>('/rider/overview');
}

export function fetchAvailableRiderOrders() {
  return request<{ data: RiderOrder[] }>('/rider/orders/available');
}

export function fetchRiderOrders(status?: string) {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  return request<{ data: RiderOrder[] }>(`/rider/orders${query}`);
}

export function setRiderAvailability(isActive: boolean) {
  return request<{ id: number; is_active: boolean }>('/rider/availability', {
    method: 'PATCH',
    body: JSON.stringify({ is_active: isActive }),
  });
}

export function claimRiderOrder(orderId: number) {
  return request<{ message: string; order: RiderOrder }>(`/rider/orders/${orderId}/claim`, {
    method: 'POST',
  });
}

export function updateRiderOrderStatus(orderId: number, status: string, note?: string | null) {
  return request<{ message: string; order: RiderOrder }>(`/rider/orders/${orderId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, note: note ?? null }),
  });
}

export function sendRiderLocationPing(
  orderId: number,
  payload: { latitude: number; longitude: number; accuracy_meters?: number | null }
) {
  return request<{ message: string }>(`/rider/orders/${orderId}/location`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function fetchCustomerOrders(perPage = 10) {
  return request<{ data: CustomerOrder[] }>(`/customer/orders?per_page=${perPage}`);
}

export function fetchCustomerOrder(orderId: number) {
  return request<{ order: CustomerOrder }>(`/customer/orders/${orderId}`);
}

export function requestCustomerOrderCancel(orderId: number, reason: string) {
  return request<{ message: string; order: CustomerOrder }>(`/customer/orders/${orderId}/cancel-request`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export function submitCustomerOrderReview(
  orderId: number,
  payload: { restaurant_rating: number; rider_rating?: number | null; comment?: string | null }
) {
  return request<{ message: string }>(`/customer/orders/${orderId}/reviews`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function submitCustomerOrderItemReview(
  orderId: number,
  payload: { menu_item_id: number; rating: number; comment?: string | null }
) {
  return request<{ message: string }>(`/customer/orders/${orderId}/item-reviews`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function submitCustomerHelpCenterConcern(payload: { subject: string; message: string }) {
  return request<{ message: string }>('/customer/help-center', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function validateCustomerPromotion(payload: {
  code: string;
  subtotal: number;
  restaurant_id?: number;
}) {
  return request<{
    valid: boolean;
    code: string | null;
    discount_amount: number;
    audit_meta: Record<string, unknown> | null;
    invalid_reasons?: Record<string, unknown>;
    message: string;
  }>('/customer/promotions/validate', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function placeCustomerOrder(payload: PlaceOrderPayload) {
  return request<{ message: string; order: CustomerOrder }>('/customer/orders', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
