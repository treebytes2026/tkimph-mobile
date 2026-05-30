import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ComponentProps, PropsWithChildren } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { TkimphPalette } from '@/constants/theme';

export const LIVE_PARTNER_STATUSES = ['pending', 'accepted', 'preparing', 'ready', 'out_for_delivery'] as const;
export const EXCEPTION_PARTNER_STATUSES = ['cancelled', 'failed'] as const;

export function formatPartnerMoney(value?: string | number | null) {
  const amount = Number(value ?? 0);
  return `PHP ${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatPartnerStatus(status?: string | null) {
  return (status || 'unknown').replace(/_/g, ' ');
}

export function partnerStatusTone(status?: string | null): 'green' | 'yellow' | 'blue' | 'red' | 'neutral' {
  const clean = status?.toLowerCase() ?? '';
  if (clean === 'ready' || clean === 'completed') return 'green';
  if (clean === 'pending' || clean === 'accepted' || clean === 'preparing') return 'yellow';
  if (clean === 'out_for_delivery') return 'blue';
  if (clean === 'cancelled' || clean === 'failed') return 'red';
  return 'neutral';
}

export function nextPartnerStatus(status: string): { label: string; status: string; icon: ComponentProps<typeof MaterialIcons>['name'] } | null {
  if (status === 'pending') return { label: 'Accept order', status: 'accepted', icon: 'task-alt' };
  if (status === 'accepted') return { label: 'Start preparing', status: 'preparing', icon: 'restaurant-menu' };
  if (status === 'preparing') return { label: 'Mark ready', status: 'ready', icon: 'shopping-bag' };
  return null;
}

export function StatusChip({ children, tone = 'neutral' }: PropsWithChildren<{ tone?: 'green' | 'yellow' | 'blue' | 'red' | 'neutral' }>) {
  const color =
    tone === 'green'
      ? TkimphPalette.green
      : tone === 'yellow'
        ? '#92400E'
        : tone === 'blue'
          ? TkimphPalette.blue
          : tone === 'red'
            ? '#B42318'
            : TkimphPalette.muted;
  const background =
    tone === 'green'
      ? '#E8F3ED'
      : tone === 'yellow'
        ? '#FEF3C7'
        : tone === 'blue'
          ? '#E0F2FE'
          : tone === 'red'
            ? '#FEE4E2'
            : '#F8FAFC';
  return (
    <View style={[styles.chip, { backgroundColor: background, borderColor: color }]}>
      <Text style={[styles.chipText, { color }]}>{children}</Text>
    </View>
  );
}

type MetricTone = 'green' | 'yellow' | 'blue' | 'red' | 'violet';

const METRIC_TONES: Record<MetricTone, { fg: string; bg: string; accent: string }> = {
  green: { fg: TkimphPalette.green, bg: '#E8F3ED', accent: '#1E8544' },
  yellow: { fg: '#92400E', bg: '#FEF3C7', accent: '#D97706' },
  blue: { fg: '#1D4ED8', bg: '#DBEAFE', accent: '#2563EB' },
  red: { fg: '#B91C1C', bg: '#FEE2E2', accent: '#DC2626' },
  violet: { fg: '#6D28D9', bg: '#EDE9FE', accent: '#7C3AED' },
};

export function PartnerMetricCard({
  label,
  value,
  icon,
  tone = 'green',
  trend,
}: {
  label: string;
  value: string;
  icon: ComponentProps<typeof MaterialIcons>['name'];
  tone?: MetricTone;
  trend?: string;
}) {
  const palette = METRIC_TONES[tone];
  return (
    <View style={[styles.metricCard, { borderTopColor: palette.accent, borderTopWidth: 3 }]}>
      <View style={styles.metricHeader}>
        <View style={[styles.metricIcon, { backgroundColor: palette.bg }]}>
          <MaterialIcons color={palette.fg} name={icon} size={20} />
        </View>
        {trend ? (
          <View style={[styles.metricTrend, { backgroundColor: palette.bg }]}>
            <Text style={[styles.metricTrendText, { color: palette.fg }]}>{trend}</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

export function PartnerNotice({ tone, text }: { tone: 'success' | 'danger' | 'warning'; text: string }) {
  const color = tone === 'success' ? TkimphPalette.green : tone === 'warning' ? '#92400E' : '#B42318';
  const background = tone === 'success' ? '#E8F3ED' : tone === 'warning' ? '#FEF3C7' : '#FEE4E2';
  return (
    <View style={[styles.notice, { backgroundColor: background, borderColor: color }]}>
      <MaterialIcons color={color} name={tone === 'success' ? 'check-circle' : tone === 'warning' ? 'info' : 'error-outline'} size={19} />
      <Text style={[styles.noticeText, { color }]}>{text}</Text>
    </View>
  );
}

export function PartnerEmpty({ icon, title, text }: { icon: ComponentProps<typeof MaterialIcons>['name']; title: string; text: string }) {
  return (
    <View style={styles.emptyCard}>
      <MaterialIcons color={TkimphPalette.green} name={icon} size={34} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

export function PartnerActionButton({
  label,
  icon,
  onPress,
  disabled,
  tone = 'green',
  compact,
}: {
  label: string;
  icon?: ComponentProps<typeof MaterialIcons>['name'];
  onPress: () => void;
  disabled?: boolean;
  tone?: 'green' | 'red' | 'outline' | 'yellow';
  compact?: boolean;
}) {
  const style =
    tone === 'red' ? styles.buttonRed : tone === 'outline' ? styles.buttonOutline : tone === 'yellow' ? styles.buttonYellow : styles.buttonGreen;
  const color = tone === 'outline' || tone === 'yellow' ? TkimphPalette.ink : '#FFFFFF';
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, style, compact && styles.buttonCompact, disabled && styles.buttonDisabled, pressed && !disabled && styles.buttonPressed]}>
      {icon ? <MaterialIcons color={color} name={icon} size={compact ? 16 : 18} /> : null}
      <Text style={[styles.buttonText, { color }, compact && styles.buttonTextCompact]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'capitalize',
  },
  metricCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EAEEF4',
    borderRadius: 16,
    borderWidth: 1,
    flexBasis: '47%',
    flexGrow: 1,
    minHeight: 112,
    padding: 14,
    ...Platform.select({
      web: { boxShadow: '0 6px 16px rgba(16, 24, 40, 0.06)' },
      default: {
        elevation: 2,
        shadowColor: '#101828',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.06,
        shadowRadius: 14,
      },
    }),
  },
  metricHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricIcon: {
    alignItems: 'center',
    borderRadius: 16,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  metricTrend: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  metricTrendText: {
    fontSize: 10,
    fontWeight: '900',
  },
  metricValue: {
    color: TkimphPalette.ink,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginTop: 10,
  },
  metricLabel: {
    color: TkimphPalette.muted,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
  notice: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    padding: 12,
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#EAEEF4',
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  emptyTitle: {
    color: TkimphPalette.ink,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 10,
  },
  emptyText: {
    color: TkimphPalette.muted,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    marginTop: 4,
    textAlign: 'center',
  },
  button: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 14,
  },
  buttonGreen: {
    backgroundColor: TkimphPalette.green,
    borderColor: TkimphPalette.green,
  },
  buttonRed: {
    backgroundColor: '#B42318',
    borderColor: '#B42318',
  },
  buttonOutline: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
  },
  buttonYellow: {
    backgroundColor: TkimphPalette.yellow,
    borderColor: TkimphPalette.yellow,
  },
  buttonCompact: {
    minHeight: 38,
    paddingHorizontal: 10,
  },
  buttonDisabled: {
    opacity: 0.58,
  },
  buttonPressed: {
    opacity: 0.86,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '900',
  },
  buttonTextCompact: {
    fontSize: 12,
  },
});
