import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React, { type ComponentProps } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Card } from '@/components/mobile-shell';
import { Pill } from '@/components/ui-kit';
import { TkimphPalette } from '@/constants/theme';
import { RiderOrder } from '@/lib/api';

export const ACTIVE_STATUSES = ['pending', 'accepted', 'preparing', 'out_for_delivery'];
export const HISTORY_STATUSES = ['completed', 'failed', 'undeliverable'];

export type GpsState = 'idle' | 'starting' | 'live' | 'blocked';

export type GpsSample = {
  latitude: number;
  longitude: number;
  accuracy_meters: number | null;
};

export function formatMoney(value: number | string) {
  const amount = typeof value === 'number' ? value : Number(value);
  return `\u20B1${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatStatus(status: string) {
  return status.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function statusTone(status: string): 'neutral' | 'green' | 'yellow' | 'blue' {
  if (status === 'completed') return 'green';
  if (status === 'out_for_delivery') return 'blue';
  if (status === 'preparing' || status === 'accepted') return 'yellow';
  return 'neutral';
}

export function nextStatusAction(status: string): { status: string; label: string; icon: ComponentProps<typeof MaterialIcons>['name'] } | null {
  if (status === 'pending') return { status: 'accepted', label: 'Accept order', icon: 'task-alt' };
  if (status === 'accepted') return { status: 'preparing', label: 'Picked up', icon: 'shopping-bag' };
  if (status === 'preparing') return { status: 'out_for_delivery', label: 'Start delivery', icon: 'delivery-dining' };
  if (status === 'out_for_delivery') return { status: 'completed', label: 'Delivered', icon: 'check-circle' };
  return null;
}

export function distanceBetweenMeters(a: GpsSample, b: GpsSample) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadius = 6371000;
  const latDelta = toRadians(b.latitude - a.latitude);
  const lonDelta = toRadians(b.longitude - a.longitude);
  const latA = toRadians(a.latitude);
  const latB = toRadians(b.latitude);
  const haversine =
    Math.sin(latDelta / 2) * Math.sin(latDelta / 2) +
    Math.cos(latA) * Math.cos(latB) * Math.sin(lonDelta / 2) * Math.sin(lonDelta / 2);

  return 2 * earthRadius * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function MetricCard({ label, value, icon }: { label: string; value: string; icon: ComponentProps<typeof MaterialIcons>['name'] }) {
  return (
    <View style={styles.metricCard}>
      <MaterialIcons color={TkimphPalette.primary} name={icon} size={19} />
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

export function TrackingMapPanel({
  gpsState,
  gpsSending,
  lastGpsSentAt,
  order,
  sample,
}: {
  gpsState: GpsState;
  gpsSending: boolean;
  lastGpsSentAt: number | null;
  order: RiderOrder | null;
  sample: GpsSample | null;
}) {
  const hasLiveOrder = order?.status === 'out_for_delivery';
  const mapSrc = sample ? openStreetMapEmbedUrl(sample) : null;
  const sentLabel = lastGpsSentAt ? new Date(lastGpsSentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Waiting';

  return (
    <View style={styles.trackingCard}>
      <View style={styles.trackingHeader}>
        <View style={styles.trackingTitleWrap}>
          <Text style={styles.trackingKicker}>Live tracking</Text>
          <Text style={styles.trackingTitle}>{order ? order.order_number : 'No active route'}</Text>
          <Text style={styles.trackingSubtitle}>
            {order
              ? `${order.restaurant?.name ?? 'Restaurant'} to ${order.customer?.name ?? 'Customer'}`
              : 'Claim an order to start route monitoring.'}
          </Text>
        </View>
        <View style={[styles.liveBadge, hasLiveOrder && gpsState === 'live' && styles.liveBadgeOn]}>
          <MaterialIcons color={hasLiveOrder && gpsState === 'live' ? '#FFFFFF' : TkimphPalette.muted} name="gps-fixed" size={15} />
          <Text style={[styles.liveBadgeText, hasLiveOrder && gpsState === 'live' && styles.liveBadgeTextOn]}>
            {gpsSending ? 'Sending' : gpsState === 'live' ? 'Live' : gpsState === 'starting' ? 'Starting' : gpsState === 'blocked' ? 'Blocked' : 'Idle'}
          </Text>
        </View>
      </View>

      <View style={styles.mapFrame}>
        {mapSrc && Platform.OS === 'web' ? (
          React.createElement('iframe', {
            src: mapSrc,
            title: 'Live rider location map',
            style: { border: 0, height: '100%', width: '100%' },
          })
        ) : (
          <MapPlaceholder sample={sample} />
        )}
      </View>

      <View style={styles.trackingStats}>
        <TrackingStat icon="place" label="Delivery" value={order?.delivery_address || 'No delivery address'} />
        <TrackingStat
          icon="my-location"
          label="Rider GPS"
          value={sample ? `${sample.latitude.toFixed(5)}, ${sample.longitude.toFixed(5)}` : 'Waiting for route start'}
        />
        <TrackingStat icon="schedule" label="Last ping" value={sentLabel} />
      </View>
    </View>
  );
}

export function ActiveOrderCard({
  order,
  acting,
  gpsState,
  gpsSending,
  exceptionNote,
  onExceptionNoteChange,
  onCallCustomer,
  onCallRestaurant,
  onUpdate,
  onFail,
  onUndeliverable,
}: {
  order: RiderOrder;
  acting: boolean;
  gpsState: GpsState;
  gpsSending: boolean;
  exceptionNote: string;
  onExceptionNoteChange: (text: string) => void;
  onCallCustomer: () => void;
  onCallRestaurant: () => void;
  onUpdate: (status: string) => void;
  onFail: () => void;
  onUndeliverable: () => void;
}) {
  const action = nextStatusAction(order.status);
  return (
    <Card>
      <OrderHeading order={order} />
      <OrderAddress order={order} />
      <View style={styles.buttonGrid}>
        <ActionButton label="Customer" icon="call" tone="outline" disabled={!order.customer?.phone} onPress={onCallCustomer} compact />
        <ActionButton label="Restaurant" icon="store" tone="outline" disabled={!order.restaurant?.phone} onPress={onCallRestaurant} compact />
      </View>
      {action ? <ActionButton label={acting ? 'Updating...' : action.label} icon={action.icon} disabled={acting} onPress={() => onUpdate(action.status)} /> : null}
      {order.status === 'out_for_delivery' ? <GpsPill gpsSending={gpsSending} gpsState={gpsState} /> : null}
      <View style={styles.exceptionBox}>
        <Text style={styles.exceptionLabel}>Exception note</Text>
        <TextInput
          onChangeText={onExceptionNoteChange}
          placeholder="Required for failed or undeliverable"
          placeholderTextColor="#8B93A6"
          style={styles.noteInput}
          value={exceptionNote}
        />
        <View style={styles.buttonGrid}>
          <ActionButton label="Failed" icon="error-outline" tone="danger" disabled={acting} onPress={onFail} compact />
          <ActionButton label="Undeliverable" icon="report-problem" tone="danger" disabled={acting} onPress={onUndeliverable} compact />
        </View>
      </View>
    </Card>
  );
}

export function AvailableJobCard({
  order,
  acting,
  canClaim,
  onClaim,
}: {
  order: RiderOrder;
  acting: boolean;
  canClaim: boolean;
  onClaim: () => void;
}) {
  return (
    <Card>
      <OrderHeading order={order} />
      <OrderAddress order={order} />
      <ActionButton
        label={!canClaim ? 'Finish current order first' : acting ? 'Claiming...' : 'Claim order'}
        icon="add-task"
        disabled={!canClaim || acting}
        onPress={onClaim}
      />
    </Card>
  );
}

export function HistoryOrderCard({ order }: { order: RiderOrder }) {
  return (
    <Card>
      <OrderHeading order={order} />
      <OrderAddress order={order} />
      <View style={styles.historyRow}>
        <Text style={styles.historyLabel}>Placed</Text>
        <Text style={styles.historyValue}>{order.placed_at ? new Date(order.placed_at).toLocaleString() : 'Not recorded'}</Text>
      </View>
    </Card>
  );
}

export function EmptyCard({
  icon,
  title,
  text,
}: {
  icon: ComponentProps<typeof MaterialIcons>['name'];
  title: string;
  text: string;
}) {
  return (
    <Card>
      <MaterialIcons color={TkimphPalette.primary} name={icon} size={30} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{text}</Text>
    </Card>
  );
}

export function Notice({ tone, text }: { tone: 'danger' | 'success' | 'warning'; text: string }) {
  return (
    <View
      style={[
        styles.notice,
        tone === 'danger' && styles.noticeDanger,
        tone === 'success' && styles.noticeSuccess,
        tone === 'warning' && styles.noticeWarning,
      ]}>
      <Text
        style={[
          styles.noticeText,
          tone === 'danger' && styles.noticeTextDanger,
          tone === 'success' && styles.noticeTextSuccess,
          tone === 'warning' && styles.noticeTextWarning,
        ]}>
        {text}
      </Text>
    </View>
  );
}

export function ActionButton({
  label,
  icon,
  onPress,
  disabled,
  tone = 'green',
  compact,
}: {
  label: string;
  icon: ComponentProps<typeof MaterialIcons>['name'];
  onPress: () => void;
  disabled?: boolean;
  tone?: 'green' | 'yellow' | 'outline' | 'danger';
  compact?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        compact && styles.actionButtonCompact,
        tone === 'yellow' && styles.actionButtonYellow,
        tone === 'outline' && styles.actionButtonOutline,
        tone === 'danger' && styles.actionButtonDanger,
        disabled && styles.actionButtonDisabled,
        pressed && !disabled && styles.actionButtonPressed,
      ]}>
      <MaterialIcons
        color={tone === 'outline' ? TkimphPalette.primary : tone === 'yellow' ? TkimphPalette.ink : '#FFFFFF'}
        name={icon}
        size={compact ? 17 : 20}
      />
      <Text
        style={[
          styles.actionButtonText,
          compact && styles.actionButtonTextCompact,
          tone === 'outline' && styles.actionButtonTextOutline,
          tone === 'yellow' && styles.actionButtonTextYellow,
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

function OrderHeading({ order }: { order: RiderOrder }) {
  return (
    <View style={styles.orderHeader}>
      <View style={styles.orderTitleWrap}>
        <Text style={styles.orderNumber}>{order.order_number}</Text>
        <Text style={styles.orderMeta}>
          {order.restaurant?.name ?? 'Restaurant'} to {order.customer?.name ?? 'Customer'}
        </Text>
      </View>
      <Pill tone={statusTone(order.status)}>{formatStatus(order.status)}</Pill>
      <Text style={styles.total}>{formatMoney(order.total)}</Text>
    </View>
  );
}

function OrderAddress({ order }: { order: RiderOrder }) {
  return (
    <View style={styles.addressBox}>
      <MaterialIcons color={TkimphPalette.primary} name="place" size={18} />
      <View style={styles.addressText}>
        <Text style={styles.addressTitle}>{order.delivery_address || 'No delivery address'}</Text>
        {order.delivery_floor ? <Text style={styles.orderMeta}>Floor/unit: {order.delivery_floor}</Text> : null}
        {order.delivery_note ? <Text style={styles.orderMeta}>Note: {order.delivery_note}</Text> : null}
      </View>
    </View>
  );
}

function GpsPill({ gpsState, gpsSending }: { gpsState: GpsState; gpsSending: boolean }) {
  return (
    <View style={styles.gpsPill}>
      <MaterialIcons color={gpsState === 'live' ? TkimphPalette.green : TkimphPalette.muted} name="gps-fixed" size={17} />
      <Text style={styles.gpsText}>
        {gpsState === 'live'
          ? gpsSending
            ? 'Sending live GPS...'
            : 'Live GPS active'
          : gpsState === 'starting'
            ? 'Starting GPS...'
            : gpsState === 'blocked'
              ? 'GPS blocked'
              : 'GPS will start during delivery'}
      </Text>
    </View>
  );
}

function MapPlaceholder({ sample }: { sample: GpsSample | null }) {
  return (
    <View style={styles.mapPlaceholder}>
      <View style={[styles.mapRoad, styles.mapRoadPrimary]} />
      <View style={[styles.mapRoad, styles.mapRoadSecondary]} />
      <View style={[styles.mapRoad, styles.mapRoadTertiary]} />
      <View style={styles.mapPulse} />
      <View style={styles.mapPin}>
        <MaterialIcons color="#FFFFFF" name={sample ? 'navigation' : 'location-searching'} size={22} />
      </View>
    </View>
  );
}

function TrackingStat({
  icon,
  label,
  value,
}: {
  icon: ComponentProps<typeof MaterialIcons>['name'];
  label: string;
  value: string;
}) {
  return (
    <View style={styles.trackingStat}>
      <MaterialIcons color={TkimphPalette.primary} name={icon} size={18} />
      <View style={styles.trackingStatText}>
        <Text style={styles.trackingStatLabel}>{label}</Text>
        <Text numberOfLines={2} style={styles.trackingStatValue}>{value}</Text>
      </View>
    </View>
  );
}

function openStreetMapEmbedUrl(sample: GpsSample) {
  const delta = 0.01;
  const left = sample.longitude - delta;
  const right = sample.longitude + delta;
  const bottom = sample.latitude - delta;
  const top = sample.latitude + delta;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${left},${bottom},${right},${top}&layer=mapnik&marker=${sample.latitude},${sample.longitude}`;
}

const styles = StyleSheet.create({
  metricCard: {
    backgroundColor: '#FFFFFF',
    borderColor: TkimphPalette.line,
    borderRadius: 14,
    borderWidth: 1,
    flexBasis: '47%',
    flexGrow: 1,
    minHeight: 96,
    padding: 14,
  },
  metricValue: {
    color: TkimphPalette.ink,
    fontSize: 20,
    fontWeight: '900',
    marginTop: 8,
  },
  metricLabel: {
    color: TkimphPalette.muted,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
  trackingCard: {
    backgroundColor: '#FFFFFF',
    borderColor: TkimphPalette.line,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 16,
    overflow: 'hidden',
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
  trackingHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    padding: 16,
  },
  trackingTitleWrap: {
    flex: 1,
  },
  trackingKicker: {
    color: TkimphPalette.primary,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  trackingTitle: {
    color: TkimphPalette.ink,
    fontSize: 21,
    fontWeight: '900',
    marginTop: 4,
  },
  trackingSubtitle: {
    color: TkimphPalette.muted,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 3,
  },
  liveBadge: {
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  liveBadgeOn: {
    backgroundColor: TkimphPalette.green,
  },
  liveBadgeText: {
    color: TkimphPalette.muted,
    fontSize: 11,
    fontWeight: '900',
  },
  liveBadgeTextOn: {
    color: '#FFFFFF',
  },
  mapFrame: {
    backgroundColor: '#DDEFE6',
    height: 230,
    overflow: 'hidden',
  },
  mapPlaceholder: {
    backgroundColor: '#E8F3ED',
    flex: 1,
    overflow: 'hidden',
  },
  mapRoad: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D0E4D8',
    borderWidth: 1,
    position: 'absolute',
  },
  mapRoadPrimary: {
    height: 32,
    left: -30,
    top: 110,
    transform: [{ rotate: '-18deg' }],
    width: 430,
  },
  mapRoadSecondary: {
    height: 26,
    left: 120,
    top: -20,
    transform: [{ rotate: '68deg' }],
    width: 360,
  },
  mapRoadTertiary: {
    height: 22,
    left: -80,
    top: 42,
    transform: [{ rotate: '24deg' }],
    width: 320,
  },
  mapPulse: {
    backgroundColor: 'rgba(30, 133, 68, 0.18)',
    borderRadius: 52,
    height: 104,
    left: '50%',
    marginLeft: -52,
    marginTop: -52,
    position: 'absolute',
    top: '50%',
    width: 104,
  },
  mapPin: {
    alignItems: 'center',
    backgroundColor: TkimphPalette.primary,
    borderColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 3,
    height: 48,
    justifyContent: 'center',
    left: '50%',
    marginLeft: -24,
    marginTop: -24,
    position: 'absolute',
    top: '50%',
    width: 48,
  },
  trackingStats: {
    gap: 10,
    padding: 14,
  },
  trackingStat: {
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 9,
    padding: 11,
  },
  trackingStatText: {
    flex: 1,
  },
  trackingStatLabel: {
    color: TkimphPalette.muted,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  trackingStatValue: {
    color: TkimphPalette.ink,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
    marginTop: 2,
  },
  orderHeader: {
    gap: 10,
  },
  orderTitleWrap: {
    gap: 4,
  },
  orderNumber: {
    color: TkimphPalette.ink,
    fontSize: 18,
    fontWeight: '900',
  },
  orderMeta: {
    color: TkimphPalette.muted,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  total: {
    color: TkimphPalette.green,
    fontSize: 20,
    fontWeight: '900',
  },
  addressBox: {
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
    borderColor: '#E8EDF4',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    padding: 12,
  },
  addressText: {
    flex: 1,
  },
  addressTitle: {
    color: TkimphPalette.ink,
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
  },
  buttonGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  gpsPill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#ECFDF3',
    borderColor: '#BBF7D0',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 7,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  gpsText: {
    color: TkimphPalette.green,
    fontSize: 12,
    fontWeight: '900',
  },
  exceptionBox: {
    borderTopColor: '#EEF2F7',
    borderTopWidth: 1,
    marginTop: 14,
    paddingTop: 14,
  },
  exceptionLabel: {
    color: TkimphPalette.ink,
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 8,
  },
  noteInput: {
    backgroundColor: '#FFFDF9',
    borderColor: TkimphPalette.line,
    borderRadius: 10,
    borderWidth: 1,
    color: TkimphPalette.ink,
    fontSize: 14,
    minHeight: 46,
    paddingHorizontal: 12,
  },
  historyRow: {
    alignItems: 'center',
    borderTopColor: '#EEF2F7',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
  },
  historyLabel: {
    color: TkimphPalette.muted,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  historyValue: {
    color: TkimphPalette.ink,
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'right',
  },
  emptyTitle: {
    color: TkimphPalette.ink,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 12,
  },
  emptyText: {
    color: TkimphPalette.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  notice: {
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 14,
    padding: 12,
  },
  noticeDanger: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  noticeSuccess: {
    backgroundColor: '#ECFDF3',
    borderColor: '#BBF7D0',
  },
  noticeWarning: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  noticeText: {
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  noticeTextDanger: {
    color: '#B42318',
  },
  noticeTextSuccess: {
    color: TkimphPalette.green,
  },
  noticeTextWarning: {
    color: '#92400E',
  },
  actionButton: {
    alignItems: 'center',
    backgroundColor: TkimphPalette.primary,
    borderColor: TkimphPalette.primary,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 12,
    minHeight: 52,
    paddingHorizontal: 14,
  },
  actionButtonCompact: {
    flex: 1,
    marginTop: 0,
    minHeight: 44,
  },
  actionButtonYellow: {
    backgroundColor: TkimphPalette.yellow,
    borderColor: TkimphPalette.yellow,
  },
  actionButtonOutline: {
    backgroundColor: '#FFFFFF',
    borderColor: TkimphPalette.line,
  },
  actionButtonDanger: {
    backgroundColor: '#B42318',
    borderColor: '#B42318',
  },
  actionButtonDisabled: {
    opacity: 0.56,
  },
  actionButtonPressed: {
    transform: [{ scale: 0.99 }],
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  actionButtonTextCompact: {
    fontSize: 13,
  },
  actionButtonTextOutline: {
    color: TkimphPalette.primary,
  },
  actionButtonTextYellow: {
    color: TkimphPalette.ink,
  },
});
