import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useCallback, useEffect, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Card, MobileShell } from '@/components/mobile-shell';
import { formatPartnerMoney, PartnerActionButton, PartnerEmpty, PartnerNotice, StatusChip } from '@/components/restaurant-workflow';
import { BodyText, Kicker, ScreenTitle } from '@/components/ui-kit';
import { TkimphPalette } from '@/constants/theme';
import { hasRestaurantOwnerSession, useAuthSession } from '@/hooks/use-auth-session';
import {
  createPartnerPromotion,
  deletePartnerPromotion,
  fetchPartnerOverview,
  fetchPartnerPromotions,
  PartnerPromotion,
  PartnerRestaurant,
  updatePartnerPromotion,
} from '@/lib/api';

type PromoForm = {
  code: string;
  name: string;
  description: string;
  is_active: boolean;
  starts_at: string;
  ends_at: string;
  min_spend: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: string;
  max_discount_amount: string;
  global_usage_limit: string;
  per_user_usage_limit: string;
  stackable: boolean;
  auto_apply: boolean;
  first_order_only: boolean;
  priority: string;
};

const blankForm: PromoForm = {
  code: '',
  name: '',
  description: '',
  is_active: true,
  starts_at: '',
  ends_at: '',
  min_spend: '0',
  discount_type: 'percentage',
  discount_value: '10',
  max_discount_amount: '',
  global_usage_limit: '',
  per_user_usage_limit: '1',
  stackable: false,
  auto_apply: false,
  first_order_only: false,
  priority: '0',
};

function blurActiveElement() {
  if (Platform.OS !== 'web') return;
  const active = document.activeElement;
  if (active instanceof HTMLElement) active.blur();
}

function formFromPromo(promo: PartnerPromotion): PromoForm {
  return {
    code: promo.code,
    name: promo.name,
    description: promo.description ?? '',
    is_active: promo.is_active,
    starts_at: promo.starts_at ?? '',
    ends_at: promo.ends_at ?? '',
    min_spend: String(promo.min_spend ?? 0),
    discount_type: promo.discount_type === 'fixed' ? 'fixed' : 'percentage',
    discount_value: String(promo.discount_value ?? 0),
    max_discount_amount: promo.max_discount_amount == null ? '' : String(promo.max_discount_amount),
    global_usage_limit: promo.global_usage_limit == null ? '' : String(promo.global_usage_limit),
    per_user_usage_limit: promo.per_user_usage_limit == null ? '1' : String(promo.per_user_usage_limit),
    stackable: promo.stackable,
    auto_apply: promo.auto_apply,
    first_order_only: promo.first_order_only,
    priority: String(promo.priority ?? 0),
  };
}

function payloadFromForm(form: PromoForm) {
  return {
    code: form.code.trim().toUpperCase(),
    name: form.name.trim(),
    description: form.description.trim() || null,
    is_active: form.is_active,
    starts_at: form.starts_at.trim() || null,
    ends_at: form.ends_at.trim() || null,
    min_spend: Number(form.min_spend || 0),
    discount_type: form.discount_type,
    discount_value: Number(form.discount_value || 0),
    max_discount_amount: form.max_discount_amount.trim() ? Number(form.max_discount_amount) : null,
    global_usage_limit: form.global_usage_limit.trim() ? Number(form.global_usage_limit) : null,
    per_user_usage_limit: Number(form.per_user_usage_limit || 1),
    stackable: form.stackable,
    auto_apply: form.auto_apply,
    first_order_only: form.first_order_only,
    priority: Number(form.priority || 0),
  };
}

export default function RestaurantPromosScreen() {
  const auth = useAuthSession();
  const canView = auth.isRestaurantOwner;
  const [restaurant, setRestaurant] = useState<PartnerRestaurant | null>(null);
  const [promos, setPromos] = useState<PartnerPromotion[]>([]);
  const [form, setForm] = useState<PromoForm>(blankForm);
  const [editing, setEditing] = useState<PartnerPromotion | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<PartnerPromotion | null>(null);
  const [acting, setActing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const reset = useCallback(() => {
    setRestaurant(null);
    setPromos([]);
    setCreating(false);
    setEditing(null);
    setDeleting(null);
    setError(null);
    setMessage(null);
  }, []);

  const load = useCallback(async () => {
    if (!hasRestaurantOwnerSession()) {
      reset();
      return;
    }
    setLoading(true);
    try {
      const overview = await fetchPartnerOverview();
      if (!hasRestaurantOwnerSession()) return;
      const nextRestaurant = overview.restaurants[0] ?? null;
      setRestaurant(nextRestaurant);
      if (!nextRestaurant) {
        setPromos([]);
        return;
      }
      const nextPromos = await fetchPartnerPromotions(nextRestaurant.id);
      if (!hasRestaurantOwnerSession()) return;
      setPromos(nextPromos.data);
      setError(null);
    } catch (err) {
      if (hasRestaurantOwnerSession()) setError(err instanceof Error ? err.message : 'Could not load promos.');
    } finally {
      if (hasRestaurantOwnerSession()) setLoading(false);
    }
  }, [reset]);

  useEffect(() => {
    if (!canView) {
      reset();
      return;
    }
    void load();
  }, [canView, load, reset]);

  async function savePromo() {
    if (!restaurant || !hasRestaurantOwnerSession()) return;
    blurActiveElement();
    setActing(true);
    try {
      const payload = payloadFromForm(form);
      const saved = editing
        ? await updatePartnerPromotion(restaurant.id, editing.id, payload)
        : await createPartnerPromotion(restaurant.id, payload);
      if (!hasRestaurantOwnerSession()) return;
      setPromos((current) => (editing ? current.map((entry) => (entry.id === saved.id ? saved : entry)) : [saved, ...current]));
      setEditing(null);
      setCreating(false);
      setMessage(editing ? 'Promo updated.' : 'Promo created.');
    } catch (err) {
      if (hasRestaurantOwnerSession()) setError(err instanceof Error ? err.message : 'Could not save promo.');
    } finally {
      if (hasRestaurantOwnerSession()) setActing(false);
    }
  }

  async function confirmDelete() {
    if (!restaurant || !deleting || !hasRestaurantOwnerSession()) return;
    setActing(true);
    try {
      await deletePartnerPromotion(restaurant.id, deleting.id);
      if (!hasRestaurantOwnerSession()) return;
      setPromos((current) => current.filter((entry) => entry.id !== deleting.id));
      setDeleting(null);
      setMessage('Promo deleted.');
    } catch (err) {
      if (hasRestaurantOwnerSession()) setError(err instanceof Error ? err.message : 'Could not delete promo.');
    } finally {
      if (hasRestaurantOwnerSession()) setActing(false);
    }
  }

  if (!canView) {
    return (
      <MobileShell>
        <Kicker>Promos</Kicker>
        <ScreenTitle>Restaurant login required.</ScreenTitle>
        <BodyText>Promotions are available for approved restaurant owners.</BodyText>
      </MobileShell>
    );
  }

  return (
    <MobileShell>
      <Kicker>Restaurant promos</Kicker>
      <ScreenTitle>Vouchers</ScreenTitle>
      <BodyText>Create, edit, pause, and delete restaurant promotions.</BodyText>

      {error ? <PartnerNotice tone="danger" text={error} /> : null}
      {message ? <PartnerNotice tone="success" text={message} /> : null}

      <View style={styles.toolbar}>
        <Text style={styles.toolbarText}>{loading ? 'Loading promos...' : restaurant?.name ?? 'No restaurant linked'}</Text>
        <PartnerActionButton compact icon="add" label="New promo" disabled={!restaurant} onPress={() => { setForm(blankForm); setCreating(true); }} />
        <PartnerActionButton compact tone="outline" icon="refresh" label="Refresh" disabled={loading} onPress={() => void load()} />
      </View>

      {promos.length === 0 ? (
        <PartnerEmpty icon="local-offer" title="No promos yet" text="Create a voucher for discounts, first orders, or auto-applied promos." />
      ) : (
        promos.map((promo) => (
          <Card key={promo.id}>
            <View style={styles.rowBetween}>
              <View style={styles.flex}>
                <Text style={styles.promoCode}>{promo.code}</Text>
                <Text style={styles.promoName}>{promo.name}</Text>
              </View>
              <StatusChip tone={promo.is_active ? 'green' : 'neutral'}>{promo.is_active ? 'active' : 'inactive'}</StatusChip>
            </View>
            <Text style={styles.meta}>
              {promo.discount_type === 'fixed' ? formatPartnerMoney(promo.discount_value) : `${Number(promo.discount_value)}%`} off | Min {formatPartnerMoney(promo.min_spend)}
            </Text>
            <Text style={styles.meta}>{promo.auto_apply ? 'Auto applies' : 'Code required'} | {promo.first_order_only ? 'First order only' : 'All eligible customers'}</Text>
            <View style={styles.actions}>
              <PartnerActionButton compact tone="outline" icon="edit" label="Edit" onPress={() => { setEditing(promo); setForm(formFromPromo(promo)); }} />
              <PartnerActionButton compact tone="red" icon="delete" label="Delete" onPress={() => setDeleting(promo)} />
            </View>
          </Card>
        ))
      )}

      <PromoModal
        visible={creating || Boolean(editing)}
        title={editing ? 'Edit promo' : 'Create promo'}
        form={form}
        saving={acting}
        onChange={setForm}
        onClose={() => { setCreating(false); setEditing(null); }}
        onSave={() => void savePromo()}
      />
      <ConfirmModal
        visible={Boolean(deleting)}
        title="Delete promo?"
        text={`This removes ${deleting?.code ?? 'this promo'} from your restaurant.`}
        saving={acting}
        onClose={() => setDeleting(null)}
        onConfirm={() => void confirmDelete()}
      />
    </MobileShell>
  );
}

function PromoModal({ visible, title, form, saving, onChange, onClose, onSave }: {
  visible: boolean;
  title: string;
  form: PromoForm;
  saving: boolean;
  onChange: (form: PromoForm) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <ModalHeader title={title} onClose={onClose} />
          <ScrollView contentContainerStyle={styles.modalScroll} showsVerticalScrollIndicator={false}>
            <Field placeholder="Code" value={form.code} onChangeText={(code) => onChange({ ...form, code })} />
            <Field placeholder="Name" value={form.name} onChangeText={(name) => onChange({ ...form, name })} />
            <Field placeholder="Description" value={form.description} onChangeText={(description) => onChange({ ...form, description })} multiline />
            <View style={styles.segment}>
              <SegmentButton active={form.discount_type === 'percentage'} label="Percent" onPress={() => onChange({ ...form, discount_type: 'percentage' })} />
              <SegmentButton active={form.discount_type === 'fixed'} label="Fixed PHP" onPress={() => onChange({ ...form, discount_type: 'fixed' })} />
            </View>
            <Field placeholder="Discount value" value={form.discount_value} onChangeText={(discount_value) => onChange({ ...form, discount_value })} numeric />
            <Field placeholder="Minimum spend" value={form.min_spend} onChangeText={(min_spend) => onChange({ ...form, min_spend })} numeric />
            <Field placeholder="Max discount amount" value={form.max_discount_amount} onChangeText={(max_discount_amount) => onChange({ ...form, max_discount_amount })} numeric />
            <Field placeholder="Global usage limit" value={form.global_usage_limit} onChangeText={(global_usage_limit) => onChange({ ...form, global_usage_limit })} numeric />
            <Field placeholder="Per-user usage limit" value={form.per_user_usage_limit} onChangeText={(per_user_usage_limit) => onChange({ ...form, per_user_usage_limit })} numeric />
            <Field placeholder="Starts at (YYYY-MM-DD)" value={form.starts_at} onChangeText={(starts_at) => onChange({ ...form, starts_at })} />
            <Field placeholder="Ends at (YYYY-MM-DD)" value={form.ends_at} onChangeText={(ends_at) => onChange({ ...form, ends_at })} />
            <Field placeholder="Priority" value={form.priority} onChangeText={(priority) => onChange({ ...form, priority })} numeric />
            <ToggleRow label="Active" active={form.is_active} onPress={() => onChange({ ...form, is_active: !form.is_active })} />
            <ToggleRow label="Auto apply" active={form.auto_apply} onPress={() => onChange({ ...form, auto_apply: !form.auto_apply })} />
            <ToggleRow label="Stackable" active={form.stackable} onPress={() => onChange({ ...form, stackable: !form.stackable })} />
            <ToggleRow label="First order only" active={form.first_order_only} onPress={() => onChange({ ...form, first_order_only: !form.first_order_only })} />
            <PartnerActionButton icon="save" label={saving ? 'Saving' : title} disabled={saving || !form.code.trim() || !form.name.trim()} onPress={onSave} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function Field({ placeholder, value, onChangeText, numeric, multiline }: { placeholder: string; value: string; onChangeText: (text: string) => void; numeric?: boolean; multiline?: boolean }) {
  return <TextInput keyboardType={numeric ? 'numeric' : 'default'} multiline={multiline} placeholder={placeholder} placeholderTextColor={TkimphPalette.muted} value={value} onChangeText={onChangeText} style={[styles.input, multiline && styles.textArea]} />;
}

function SegmentButton({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.segmentButton, active && styles.segmentButtonActive]}>
      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</Text>
    </Pressable>
  );
}

function ToggleRow({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <View style={[styles.toggleTrack, active && styles.toggleTrackActive]}>
        <View style={[styles.toggleKnob, active && styles.toggleKnobActive]} />
      </View>
    </Pressable>
  );
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <View style={styles.modalHeader}>
      <Text style={styles.modalTitle}>{title}</Text>
      <Pressable onPress={onClose} style={styles.closeButton}>
        <MaterialIcons color={TkimphPalette.ink} name="close" size={21} />
      </Pressable>
    </View>
  );
}

function ConfirmModal({ visible, title, text, saving, onClose, onConfirm }: { visible: boolean; title: string; text: string; saving: boolean; onClose: () => void; onConfirm: () => void }) {
  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <ModalHeader title={title} onClose={onClose} />
          <Text style={styles.meta}>{text}</Text>
          <View style={styles.actions}>
            <PartnerActionButton tone="outline" label="Cancel" onPress={onClose} />
            <PartnerActionButton tone="red" icon="delete" label={saving ? 'Deleting' : 'Delete'} disabled={saving} onPress={onConfirm} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  toolbar: { alignItems: 'center', flexDirection: 'row', gap: 8, justifyContent: 'space-between', marginTop: 16 },
  toolbarText: { color: TkimphPalette.muted, flex: 1, fontSize: 13, fontWeight: '800' },
  rowBetween: { alignItems: 'center', flexDirection: 'row', gap: 10, justifyContent: 'space-between' },
  flex: { flex: 1 },
  promoCode: { color: TkimphPalette.green, fontSize: 13, fontWeight: '900' },
  promoName: { color: TkimphPalette.ink, fontSize: 17, fontWeight: '900', marginTop: 3 },
  meta: { color: TkimphPalette.muted, fontSize: 13, fontWeight: '700', lineHeight: 19, marginTop: 7 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  modalBackdrop: { alignItems: 'center', backgroundColor: 'rgba(15, 23, 42, 0.46)', flex: 1, justifyContent: 'center', padding: 18 },
  modalCard: { backgroundColor: '#FFFFFF', borderRadius: 18, gap: 12, maxHeight: '88%', maxWidth: 430, padding: 16, width: '100%' },
  modalHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  modalTitle: { color: TkimphPalette.ink, fontSize: 19, fontWeight: '900' },
  modalScroll: { gap: 12 },
  closeButton: { alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 18, height: 38, justifyContent: 'center', width: 38 },
  input: { backgroundColor: '#F8FAFC', borderColor: '#E4E7EC', borderRadius: 12, borderWidth: 1, color: TkimphPalette.ink, fontSize: 14, minHeight: 46, paddingHorizontal: 12 },
  textArea: { minHeight: 82, paddingTop: 10, textAlignVertical: 'top' },
  segment: { backgroundColor: '#F1F5F9', borderRadius: 12, flexDirection: 'row', padding: 4 },
  segmentButton: { alignItems: 'center', borderRadius: 9, flex: 1, minHeight: 38, justifyContent: 'center' },
  segmentButtonActive: { backgroundColor: '#FFFFFF' },
  segmentText: { color: TkimphPalette.muted, fontSize: 13, fontWeight: '900' },
  segmentTextActive: { color: TkimphPalette.green },
  toggleRow: { alignItems: 'center', backgroundColor: '#F8FAFC', borderColor: '#E4E7EC', borderRadius: 12, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', minHeight: 46, paddingHorizontal: 12 },
  toggleLabel: { color: TkimphPalette.ink, fontSize: 14, fontWeight: '900' },
  toggleTrack: { backgroundColor: '#CBD5E1', borderRadius: 999, height: 24, padding: 2, width: 44 },
  toggleTrackActive: { backgroundColor: TkimphPalette.green },
  toggleKnob: { backgroundColor: '#FFFFFF', borderRadius: 10, height: 20, width: 20 },
  toggleKnobActive: { transform: [{ translateX: 20 }] },
});
