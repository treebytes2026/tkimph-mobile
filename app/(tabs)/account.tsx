import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { MobileShell } from '@/components/mobile-shell';
import { Field, PrimaryButton } from '@/components/ui-kit';
import { TkimphPalette } from '@/constants/theme';
import { ApiError, AuthUser, clearSession, fetchCurrentUser, getStoredToken, getStoredUser, login, logout, subscribeAuthChanged } from '@/lib/api';

const accountActions = [
  {
    title: 'Profile',
    subtitle: 'Name, phone, email, and saved address',
    icon: 'person-outline',
    color: '#DBEAFE',
    route: '/account/profile',
  },
  {
    title: 'Password',
    subtitle: 'Update your account password',
    icon: 'lock-outline',
    color: '#F3E8FF',
    route: '/account/password',
  },
  {
    title: 'Help & support',
    subtitle: 'Send a concern to support',
    icon: 'help-outline',
    color: '#FEF3C7',
    route: '/account/support',
  },
] as const;

const restaurantActions = [
  {
    title: 'Store profile',
    subtitle: 'Edit store details, hours, photos, and owner settings',
    icon: 'storefront',
    color: '#DCFCE7',
    route: '/restaurant-store',
  },
  {
    title: 'Promotions',
    subtitle: 'Create and manage vouchers and promo codes',
    icon: 'local-offer',
    color: '#FEF3C7',
    route: '/restaurant-promos',
  },
  {
    title: 'Money',
    subtitle: 'Earnings, commissions, payment details, and proofs',
    icon: 'payments',
    color: '#E0F2FE',
    route: '/restaurant-money',
  },
] as const;

const legalActions = [
  {
    title: 'Terms & Conditions',
    subtitle: 'The rules for using TKimph',
    icon: 'gavel',
    color: '#E0F2FE',
    route: '/legal/terms',
  },
  {
    title: 'Privacy Policy',
    subtitle: 'How we handle your information',
    icon: 'privacy-tip',
    color: '#DCFCE7',
    route: '/legal/privacy',
  },
  {
    title: 'Cookie Policy',
    subtitle: 'How we use cookies and storage',
    icon: 'cookie',
    color: '#FEF3C7',
    route: '/legal/cookies',
  },
] as const;

function blurActiveElement() {
  if (Platform.OS !== 'web') return;
  const active = document.activeElement;
  if (active instanceof HTMLElement) active.blur();
}

export default function ProfileScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser());
  const [loading, setLoading] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    return subscribeAuthChanged(() => setUser(getStoredUser()));
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    if (!getStoredToken()) {
      clearSession();
      setUser(null);
      return;
    }
    fetchCurrentUser()
      .then(setUser)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          setUser(null);
        }
      });
  }, [user?.id]);

  async function handleLogin() {
    setLoading(true);
    setMessage(null);
    try {
      const session = await login(email, password);
      setUser(session.user);
      setPassword('');
      if (session.user.role === 'rider') {
        blurActiveElement();
        router.push('/driver' as never);
      } else if (session.user.role === 'restaurant_owner') {
        blurActiveElement();
        router.push('/restaurant' as never);
      }
    } catch (err) {
      if (err instanceof ApiError && [401, 403, 422].includes(err.status)) {
        setMessage('The email and password are not correct.');
      } else {
        setMessage(err instanceof Error ? err.message : 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
      setUser(null);
      setConfirmingLogout(false);
    } finally {
      setLoggingOut(false);
    }
  }

  if (!user) {
    return (
      <MobileShell>
        <Text style={styles.signInTitle}>Account</Text>
        <View style={styles.loginCard}>
          <View style={styles.loginIcon}>
            <MaterialIcons color={TkimphPalette.green} name="person-outline" size={30} />
          </View>
          <Text style={styles.loginHeading}>Sign in to continue</Text>
          <Text style={styles.loginCopy}>Access your profile, saved address, orders, and support from one place.</Text>
          <View style={styles.form}>
            <Field label="Email" value={email} onChangeText={setEmail} />
            <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry />
            {message ? <Text style={styles.message}>{message}</Text> : null}
            <PrimaryButton disabled={loading || !email || !password} icon="login" label={loading ? 'Signing in' : 'Sign in'} onPress={handleLogin} />
          </View>
        </View>
        <View style={styles.legalLinksRow}>
          {legalActions.map((item) => (
            <Pressable
              key={item.title}
              accessibilityRole="link"
              onPress={() => {
                blurActiveElement();
                router.push(item.route as never);
              }}>
              <Text style={styles.legalLinkText}>{item.title}</Text>
            </Pressable>
          ))}
        </View>
      </MobileShell>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.profileHeader}>
        <Text style={styles.headerTitle}>Account</Text>
        <View style={styles.identity}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user.name.slice(0, 1).toUpperCase()}</Text>
          </View>
          <View style={styles.identityText}>
            <Text style={styles.userName}>{user.name}</Text>
            <Text style={styles.userMeta}>{user.email}</Text>
            <Text style={styles.userMeta}>{user.phone || 'No phone set'}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.accountScrollContent}
        showsVerticalScrollIndicator={false}
        style={styles.accountScroll}>
        <View style={styles.accountContent}>
          <View style={styles.statusCard}>
            <StatusPill
              icon="verified-user"
              label="Email"
              active={Boolean(user.email_verified)}
              onPress={() => {
                blurActiveElement();
                router.push('/account/profile' as never);
              }}
            />
            <StatusPill
              icon="phone-iphone"
              label="Phone"
              active={Boolean(user.phone_verified)}
              onPress={() => {
                blurActiveElement();
                router.push('/account/profile' as never);
              }}
            />
            <StatusPill
              icon="place"
              label="Address"
              active={Boolean(user.address)}
              onPress={() => {
                blurActiveElement();
                router.push('/account/profile' as never);
              }}
            />
          </View>

          <View style={styles.menuCard}>
            {user.role === 'restaurant_owner'
              ? restaurantActions.map((item) => (
                  <Pressable
                    key={item.title}
                    onPress={() => {
                      blurActiveElement();
                      router.push(item.route as never);
                    }}
                    style={styles.menuItem}>
                    <View style={[styles.menuIcon, { backgroundColor: item.color }]}>
                      <MaterialIcons color={TkimphPalette.green} name={item.icon} size={22} />
                    </View>
                    <View style={styles.menuText}>
                      <Text style={styles.menuTitle}>{item.title}</Text>
                      <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                    </View>
                    <MaterialIcons color="#CBD5E1" name="chevron-right" size={22} />
                  </Pressable>
                ))
              : null}
            {accountActions.map((item) => (
              <Pressable
                key={item.title}
                onPress={() => {
                  blurActiveElement();
                  router.push(item.route as never);
                }}
                style={styles.menuItem}>
                <View style={[styles.menuIcon, { backgroundColor: item.color }]}>
                  <MaterialIcons color={TkimphPalette.green} name={item.icon} size={22} />
                </View>
                <View style={styles.menuText}>
                  <Text style={styles.menuTitle}>{item.title}</Text>
                  <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                </View>
                <MaterialIcons color="#CBD5E1" name="chevron-right" size={22} />
              </Pressable>
            ))}
          </View>

          <Text style={styles.sectionLabel}>Legal</Text>
          <View style={styles.menuCard}>
            {legalActions.map((item) => (
              <Pressable
                key={item.title}
                onPress={() => {
                  blurActiveElement();
                  router.push(item.route as never);
                }}
                style={styles.menuItem}>
                <View style={[styles.menuIcon, { backgroundColor: item.color }]}>
                  <MaterialIcons color={TkimphPalette.green} name={item.icon} size={22} />
                </View>
                <View style={styles.menuText}>
                  <Text style={styles.menuTitle}>{item.title}</Text>
                  <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                </View>
                <MaterialIcons color="#CBD5E1" name="chevron-right" size={22} />
              </Pressable>
            ))}
          </View>

          <Pressable
            style={styles.logoutButton}
            onPress={() => {
              blurActiveElement();
              setConfirmingLogout(true);
            }}>
            <MaterialIcons color={TkimphPalette.primary} name="logout" size={20} />
            <Text style={styles.logoutText}>Sign out</Text>
          </Pressable>
        </View>
      </ScrollView>

      <Modal
        animationType="fade"
        transparent
        visible={confirmingLogout}
        onRequestClose={() => {
          if (!loggingOut) setConfirmingLogout(false);
        }}>
        <View style={styles.modalBackdrop}>
          <View style={styles.confirmCard}>
            <View style={styles.confirmIcon}>
              <MaterialIcons color="#B42318" name="logout" size={26} />
            </View>
            <Text style={styles.confirmTitle}>Sign out?</Text>
            <Text style={styles.confirmCopy}>You will need to sign in again to access your account and rider tools.</Text>
            <View style={styles.confirmActions}>
              <Pressable
                disabled={loggingOut}
                style={[styles.confirmButton, styles.cancelButton, loggingOut && styles.confirmButtonDisabled]}
                onPress={() => setConfirmingLogout(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                disabled={loggingOut}
                style={[styles.confirmButton, styles.signOutButton, loggingOut && styles.confirmButtonDisabled]}
                onPress={handleLogout}>
                <MaterialIcons color="#FFFFFF" name="logout" size={18} />
                <Text style={styles.signOutButtonText}>{loggingOut ? 'Signing out' : 'Sign out'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function StatusPill({
  icon,
  label,
  active,
  onPress,
}: {
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.statusPill, active && styles.statusPillActive]}>
      <MaterialIcons color={active ? TkimphPalette.green : TkimphPalette.muted} name={icon} size={18} />
      <Text style={[styles.statusPillText, active && styles.statusPillTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#F7F8FA',
    flex: 1,
  },
  accountScroll: {
    flex: 1,
  },
  accountScrollContent: {
    flexGrow: 1,
  },
  signInTitle: {
    color: TkimphPalette.ink,
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 16,
  },
  loginCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#EAEEF4',
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
  },
  loginIcon: {
    alignItems: 'center',
    backgroundColor: '#E8F3ED',
    borderRadius: 22,
    height: 54,
    justifyContent: 'center',
    width: 54,
  },
  loginHeading: {
    color: TkimphPalette.ink,
    fontSize: 21,
    fontWeight: '900',
    marginTop: 12,
  },
  loginCopy: {
    color: TkimphPalette.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
    textAlign: 'center',
  },
  form: {
    alignSelf: 'stretch',
    gap: 14,
    marginTop: 18,
  },
  message: {
    color: '#B42318',
    fontSize: 14,
    fontWeight: '700',
  },
  profileHeader: {
    backgroundColor: TkimphPalette.green,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingBottom: 54,
    paddingHorizontal: 22,
    paddingTop: 50,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 23,
    fontWeight: '900',
    marginBottom: 18,
  },
  identity: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: TkimphPalette.yellow,
    borderRadius: 18,
    height: 68,
    justifyContent: 'center',
    width: 68,
  },
  avatarText: {
    color: TkimphPalette.green,
    fontSize: 31,
    fontWeight: '900',
  },
  identityText: {
    flex: 1,
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '900',
  },
  userMeta: {
    color: '#DDF5E6',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 3,
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EAEEF4',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    padding: 10,
    ...Platform.select({
      web: { boxShadow: '0 8px 18px rgba(16, 24, 40, 0.08)' },
      default: {
        elevation: 3,
        shadowColor: '#101828',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 18,
      },
    }),
  },
  accountContent: {
    padding: 14,
    paddingBottom: 96,
  },
  statusPill: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 13,
    flex: 1,
    gap: 4,
    minHeight: 58,
    justifyContent: 'center',
  },
  statusPillActive: {
    backgroundColor: '#E8F3ED',
  },
  statusPillText: {
    color: TkimphPalette.muted,
    fontSize: 11,
    fontWeight: '900',
  },
  statusPillTextActive: {
    color: TkimphPalette.green,
  },
  menuCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EAEEF4',
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 14,
    overflow: 'hidden',
  },
  sectionLabel: {
    color: TkimphPalette.muted,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginTop: 22,
    textTransform: 'uppercase',
  },
  legalLinksRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'center',
    marginTop: 22,
  },
  legalLinkText: {
    color: TkimphPalette.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  menuItem: {
    alignItems: 'center',
    borderBottomColor: '#F1F3F6',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 74,
    paddingHorizontal: 16,
  },
  menuIcon: {
    alignItems: 'center',
    borderRadius: 16,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  menuText: {
    flex: 1,
  },
  menuTitle: {
    color: TkimphPalette.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  menuSubtitle: {
    color: TkimphPalette.muted,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
    marginTop: 2,
  },
  logoutButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#EAEEF4',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 14,
    minHeight: 50,
  },
  logoutText: {
    color: TkimphPalette.primary,
    fontSize: 14,
    fontWeight: '900',
  },
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  confirmCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#EAEEF4',
    borderRadius: 18,
    borderWidth: 1,
    maxWidth: 380,
    padding: 18,
    width: '100%',
    ...Platform.select({
      web: { boxShadow: '0 18px 40px rgba(15, 23, 42, 0.22)' },
      default: {
        elevation: 8,
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.18,
        shadowRadius: 24,
      },
    }),
  },
  confirmIcon: {
    alignItems: 'center',
    backgroundColor: '#FEE4E2',
    borderRadius: 24,
    height: 54,
    justifyContent: 'center',
    width: 54,
  },
  confirmTitle: {
    color: TkimphPalette.ink,
    fontSize: 21,
    fontWeight: '900',
    marginTop: 14,
    textAlign: 'center',
  },
  confirmCopy: {
    color: TkimphPalette.muted,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    marginTop: 7,
    textAlign: 'center',
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
    width: '100%',
  },
  confirmButton: {
    alignItems: 'center',
    borderRadius: 13,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 12,
  },
  cancelButton: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  signOutButton: {
    backgroundColor: '#B42318',
    borderColor: '#B42318',
  },
  confirmButtonDisabled: {
    opacity: 0.65,
  },
  cancelButtonText: {
    color: TkimphPalette.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  signOutButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
});
