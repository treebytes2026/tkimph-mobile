import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useCallback, useEffect, useState } from 'react';
import { Image, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Card, MobileShell } from '@/components/mobile-shell';
import { PartnerActionButton, PartnerEmpty, PartnerNotice, StatusChip } from '@/components/restaurant-workflow';
import { BodyText, Kicker, ScreenTitle, SectionHeader } from '@/components/ui-kit';
import { TkimphPalette } from '@/constants/theme';
import { hasRestaurantOwnerSession, useAuthSession } from '@/hooks/use-auth-session';
import {
  changePartnerPassword,
  deletePartnerRestaurantLocationImage,
  deletePartnerRestaurantProfileImage,
  fetchPartnerOverview,
  PartnerRestaurant,
  PublicOpeningHoursDay,
  updatePartnerProfile,
  updatePartnerRestaurant,
  uploadPartnerRestaurantLocationImage,
  uploadPartnerRestaurantProfileImage,
} from '@/lib/api';
import { pickImageUpload } from '@/lib/uploads';

type StoreForm = {
  name: string;
  description: string;
  phone: string;
  address: string;
};

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function blurActiveElement() {
  if (Platform.OS !== 'web') return;
  const active = document.activeElement;
  if (active instanceof HTMLElement) active.blur();
}

function defaultHours(): PublicOpeningHoursDay[] {
  return dayNames.map((_, day) => ({ day, closed: false, open: '08:00', close: '20:00' }));
}

function normalizeHours(hours?: PublicOpeningHoursDay[] | null) {
  const source = hours?.length === 7 ? hours : defaultHours();
  return dayNames.map((_, day) => {
    const found = source.find((entry) => Number(entry.day) === day);
    return found ?? { day, closed: false, open: '08:00', close: '20:00' };
  });
}

export default function RestaurantStoreScreen() {
  const auth = useAuthSession();
  const canView = auth.isRestaurantOwner;
  const [restaurant, setRestaurant] = useState<PartnerRestaurant | null>(null);
  const [form, setForm] = useState<StoreForm>({ name: '', description: '', phone: '', address: '' });
  const [hours, setHours] = useState<PublicOpeningHoursDay[]>(defaultHours());
  const [accountName, setAccountName] = useState(auth.user?.name ?? '');
  const [accountPhone, setAccountPhone] = useState(auth.user?.phone ?? '');
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const reset = useCallback(() => {
    setRestaurant(null);
    setForm({ name: '', description: '', phone: '', address: '' });
    setHours(defaultHours());
    setError(null);
    setMessage(null);
    setSaving(null);
  }, []);

  const applyRestaurant = useCallback((next: PartnerRestaurant | null) => {
    setRestaurant(next);
    setForm({
      name: next?.name ?? '',
      description: next?.description ?? '',
      phone: next?.phone ?? '',
      address: next?.address ?? '',
    });
    setHours(normalizeHours(next?.opening_hours));
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
      applyRestaurant(overview.restaurants[0] ?? null);
      setAccountName(overview.user.name);
      setAccountPhone(overview.user.phone ?? '');
      setError(null);
    } catch (err) {
      if (hasRestaurantOwnerSession()) setError(err instanceof Error ? err.message : 'Could not load store profile.');
    } finally {
      if (hasRestaurantOwnerSession()) setLoading(false);
    }
  }, [applyRestaurant, reset]);

  useEffect(() => {
    if (!canView) {
      reset();
      return;
    }
    void load();
  }, [canView, load, reset]);

  async function saveStore() {
    if (!restaurant || !hasRestaurantOwnerSession()) return;
    blurActiveElement();
    setSaving('store');
    try {
      const updated = await updatePartnerRestaurant(restaurant.id, {
        name: form.name.trim(),
        description: form.description.trim() || null,
        phone: form.phone.trim() || null,
        address: form.address.trim(),
        opening_hours: hours,
      });
      if (!hasRestaurantOwnerSession()) return;
      applyRestaurant(updated);
      setMessage('Store profile updated.');
    } catch (err) {
      if (hasRestaurantOwnerSession()) setError(err instanceof Error ? err.message : 'Could not save store.');
    } finally {
      if (hasRestaurantOwnerSession()) setSaving(null);
    }
  }

  async function saveAccount() {
    if (!hasRestaurantOwnerSession()) return;
    blurActiveElement();
    setSaving('account');
    try {
      await updatePartnerProfile({ name: accountName.trim(), phone: accountPhone.trim() || null });
      if (!hasRestaurantOwnerSession()) return;
      setMessage('Account profile updated.');
    } catch (err) {
      if (hasRestaurantOwnerSession()) setError(err instanceof Error ? err.message : 'Could not save account profile.');
    } finally {
      if (hasRestaurantOwnerSession()) setSaving(null);
    }
  }

  async function savePassword() {
    if (!hasRestaurantOwnerSession()) return;
    blurActiveElement();
    setSaving('password');
    try {
      await changePartnerPassword({ current_password: currentPassword, password, password_confirmation: passwordConfirm });
      if (!hasRestaurantOwnerSession()) return;
      setPasswordOpen(false);
      setCurrentPassword('');
      setPassword('');
      setPasswordConfirm('');
      setMessage('Password updated.');
    } catch (err) {
      if (hasRestaurantOwnerSession()) setError(err instanceof Error ? err.message : 'Could not update password.');
    } finally {
      if (hasRestaurantOwnerSession()) setSaving(null);
    }
  }

  async function uploadProfileImage() {
    if (!restaurant || !hasRestaurantOwnerSession()) return;
    try {
      const file = await pickImageUpload();
      if (!file || !hasRestaurantOwnerSession()) return;
      setSaving('profile-image');
      const updated = await uploadPartnerRestaurantProfileImage(restaurant.id, file);
      if (!hasRestaurantOwnerSession()) return;
      applyRestaurant(updated);
      setMessage('Profile image uploaded.');
    } catch (err) {
      if (hasRestaurantOwnerSession()) setError(err instanceof Error ? err.message : 'Could not upload profile image.');
    } finally {
      if (hasRestaurantOwnerSession()) setSaving(null);
    }
  }

  async function deleteProfileImage() {
    if (!restaurant || !hasRestaurantOwnerSession()) return;
    setSaving('profile-image');
    try {
      const updated = await deletePartnerRestaurantProfileImage(restaurant.id);
      if (!hasRestaurantOwnerSession()) return;
      applyRestaurant(updated);
      setMessage('Profile image deleted.');
    } catch (err) {
      if (hasRestaurantOwnerSession()) setError(err instanceof Error ? err.message : 'Could not delete profile image.');
    } finally {
      if (hasRestaurantOwnerSession()) setSaving(null);
    }
  }

  async function uploadLocationImage() {
    if (!restaurant || !hasRestaurantOwnerSession()) return;
    try {
      const file = await pickImageUpload();
      if (!file || !hasRestaurantOwnerSession()) return;
      setSaving('location-image');
      const updated = await uploadPartnerRestaurantLocationImage(restaurant.id, file);
      if (!hasRestaurantOwnerSession()) return;
      applyRestaurant(updated);
      setMessage('Location image uploaded.');
    } catch (err) {
      if (hasRestaurantOwnerSession()) setError(err instanceof Error ? err.message : 'Could not upload location image.');
    } finally {
      if (hasRestaurantOwnerSession()) setSaving(null);
    }
  }

  async function deleteLocationImage(imageId: number) {
    if (!restaurant || !hasRestaurantOwnerSession()) return;
    setSaving(`location-${imageId}`);
    try {
      const updated = await deletePartnerRestaurantLocationImage(restaurant.id, imageId);
      if (!hasRestaurantOwnerSession()) return;
      applyRestaurant(updated);
      setMessage('Location image deleted.');
    } catch (err) {
      if (hasRestaurantOwnerSession()) setError(err instanceof Error ? err.message : 'Could not delete location image.');
    } finally {
      if (hasRestaurantOwnerSession()) setSaving(null);
    }
  }

  function updateHour(day: number, patch: Partial<PublicOpeningHoursDay>) {
    setHours((current) => current.map((entry) => (entry.day === day ? { ...entry, ...patch } : entry)));
  }

  if (!canView) {
    return (
      <MobileShell>
        <Kicker>Store</Kicker>
        <ScreenTitle>Restaurant login required.</ScreenTitle>
        <BodyText>Store settings are available for approved restaurant owners.</BodyText>
      </MobileShell>
    );
  }

  return (
    <MobileShell>
      <Kicker>Restaurant store</Kicker>
      <ScreenTitle>Store profile</ScreenTitle>
      <BodyText>Edit customer-facing restaurant details, hours, photos, and account settings.</BodyText>

      {error ? <PartnerNotice tone="danger" text={error} /> : null}
      {message ? <PartnerNotice tone="success" text={message} /> : null}

      <View style={styles.toolbar}>
        <Text style={styles.toolbarText}>{loading ? 'Loading store...' : restaurant?.name ?? 'No restaurant linked'}</Text>
        <PartnerActionButton compact tone="outline" icon="refresh" label="Refresh" disabled={loading} onPress={() => void load()} />
      </View>

      {!restaurant ? (
        <PartnerEmpty icon="storefront" title="No store linked" text="This account does not have a restaurant linked yet." />
      ) : (
        <>
          <Card>
            <View style={styles.rowBetween}>
              <Text style={styles.cardTitle}>Store details</Text>
              <StatusChip tone={restaurant.operating_status === 'open' ? 'green' : 'yellow'}>
                {restaurant.operating_status === 'open' ? 'open' : 'closed'}
              </StatusChip>
            </View>
            <Input placeholder="Store name" value={form.name} onChangeText={(name) => setForm({ ...form, name })} />
            <Input placeholder="Description" value={form.description} onChangeText={(description) => setForm({ ...form, description })} multiline />
            <Input placeholder="Phone" value={form.phone} onChangeText={(phone) => setForm({ ...form, phone })} />
            <Input placeholder="Address" value={form.address} onChangeText={(address) => setForm({ ...form, address })} multiline />
            <PartnerActionButton icon="save" label={saving === 'store' ? 'Saving' : 'Save store'} disabled={saving === 'store' || !form.name.trim() || !form.address.trim()} onPress={() => void saveStore()} />
          </Card>

          <SectionHeader title="Opening hours" />
          <Card>
            {hours.map((entry) => (
              <View key={entry.day} style={styles.hourRow}>
                <Pressable style={styles.dayButton} onPress={() => updateHour(entry.day, { closed: !entry.closed })}>
                  <Text style={styles.dayText}>{dayNames[entry.day]}</Text>
                  <Text style={[styles.dayStatus, !entry.closed && styles.dayStatusOpen]}>{entry.closed ? 'Closed' : 'Open'}</Text>
                </Pressable>
                <TextInput editable={!entry.closed} value={entry.open ?? ''} onChangeText={(open) => updateHour(entry.day, { open })} style={styles.timeInput} />
                <TextInput editable={!entry.closed} value={entry.close ?? ''} onChangeText={(close) => updateHour(entry.day, { close })} style={styles.timeInput} />
              </View>
            ))}
          </Card>

          <SectionHeader title="Photos" />
          <Card>
            <Text style={styles.cardTitle}>Profile image</Text>
            {restaurant.profile_image_url ? <Image source={{ uri: restaurant.profile_image_url }} style={styles.profileImage} /> : <Text style={styles.meta}>No profile image yet.</Text>}
            <View style={styles.actions}>
              <PartnerActionButton compact icon="image" label={restaurant.profile_image_url ? 'Replace' : 'Upload'} disabled={saving === 'profile-image'} onPress={() => void uploadProfileImage()} />
              {restaurant.profile_image_url ? <PartnerActionButton compact tone="red" icon="delete" label="Delete" disabled={saving === 'profile-image'} onPress={() => void deleteProfileImage()} /> : null}
            </View>
          </Card>
          <Card>
            <View style={styles.rowBetween}>
              <Text style={styles.cardTitle}>Location images</Text>
              <PartnerActionButton compact icon="add-photo-alternate" label="Add" disabled={saving === 'location-image'} onPress={() => void uploadLocationImage()} />
            </View>
            {(restaurant.location_images ?? []).length === 0 ? <Text style={styles.meta}>No location images yet.</Text> : null}
            {(restaurant.location_images ?? []).map((image) => (
              <View key={image.id} style={styles.locationRow}>
                {image.url ? <Image source={{ uri: image.url }} style={styles.locationImage} /> : null}
                <Text style={styles.meta}>Location photo #{image.id}</Text>
                <PartnerActionButton compact tone="red" icon="delete" label="Delete" disabled={saving === `location-${image.id}`} onPress={() => void deleteLocationImage(image.id)} />
              </View>
            ))}
          </Card>

          <SectionHeader title="Restaurant account" />
          <Card>
            <Input placeholder="Owner name" value={accountName} onChangeText={setAccountName} />
            <Input placeholder="Owner phone" value={accountPhone} onChangeText={setAccountPhone} />
            <View style={styles.actions}>
              <PartnerActionButton icon="save" label={saving === 'account' ? 'Saving' : 'Save account'} disabled={saving === 'account' || !accountName.trim()} onPress={() => void saveAccount()} />
              <PartnerActionButton tone="outline" icon="lock" label="Change password" onPress={() => setPasswordOpen(true)} />
            </View>
          </Card>
        </>
      )}

      <PasswordModal
        visible={passwordOpen}
        currentPassword={currentPassword}
        password={password}
        passwordConfirm={passwordConfirm}
        saving={saving === 'password'}
        onCurrent={setCurrentPassword}
        onPassword={setPassword}
        onConfirm={setPasswordConfirm}
        onClose={() => setPasswordOpen(false)}
        onSave={() => void savePassword()}
      />
    </MobileShell>
  );
}

function Input({ placeholder, value, onChangeText, multiline }: { placeholder: string; value: string; onChangeText: (text: string) => void; multiline?: boolean }) {
  return <TextInput multiline={multiline} placeholder={placeholder} placeholderTextColor={TkimphPalette.muted} value={value} onChangeText={onChangeText} style={[styles.input, multiline && styles.textArea]} />;
}

function PasswordModal({ visible, currentPassword, password, passwordConfirm, saving, onCurrent, onPassword, onConfirm, onClose, onSave }: {
  visible: boolean;
  currentPassword: string;
  password: string;
  passwordConfirm: string;
  saving: boolean;
  onCurrent: (text: string) => void;
  onPassword: (text: string) => void;
  onConfirm: (text: string) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Change password</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <MaterialIcons color={TkimphPalette.ink} name="close" size={21} />
            </Pressable>
          </View>
          <TextInput secureTextEntry placeholder="Current password" placeholderTextColor={TkimphPalette.muted} value={currentPassword} onChangeText={onCurrent} style={styles.input} />
          <TextInput secureTextEntry placeholder="New password" placeholderTextColor={TkimphPalette.muted} value={password} onChangeText={onPassword} style={styles.input} />
          <TextInput secureTextEntry placeholder="Confirm new password" placeholderTextColor={TkimphPalette.muted} value={passwordConfirm} onChangeText={onConfirm} style={styles.input} />
          <PartnerActionButton icon="lock" label={saving ? 'Saving' : 'Save password'} disabled={saving || !currentPassword || !password || !passwordConfirm} onPress={onSave} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  toolbar: { alignItems: 'center', flexDirection: 'row', gap: 8, justifyContent: 'space-between', marginTop: 16 },
  toolbarText: { color: TkimphPalette.muted, flex: 1, fontSize: 13, fontWeight: '800' },
  rowBetween: { alignItems: 'center', flexDirection: 'row', gap: 10, justifyContent: 'space-between' },
  cardTitle: { color: TkimphPalette.ink, flex: 1, fontSize: 17, fontWeight: '900' },
  meta: { color: TkimphPalette.muted, flex: 1, fontSize: 13, fontWeight: '700', lineHeight: 19, marginTop: 6 },
  input: { backgroundColor: '#F8FAFC', borderColor: '#E4E7EC', borderRadius: 12, borderWidth: 1, color: TkimphPalette.ink, fontSize: 14, marginTop: 10, minHeight: 46, paddingHorizontal: 12 },
  textArea: { minHeight: 82, paddingTop: 10, textAlignVertical: 'top' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  hourRow: { alignItems: 'center', borderBottomColor: '#EEF2F6', borderBottomWidth: 1, flexDirection: 'row', gap: 8, paddingVertical: 9 },
  dayButton: { flex: 1 },
  dayText: { color: TkimphPalette.ink, fontSize: 13, fontWeight: '900' },
  dayStatus: { color: '#B42318', fontSize: 12, fontWeight: '900', marginTop: 2 },
  dayStatusOpen: { color: TkimphPalette.green },
  timeInput: { backgroundColor: '#F8FAFC', borderColor: '#E4E7EC', borderRadius: 10, borderWidth: 1, color: TkimphPalette.ink, fontSize: 13, minHeight: 40, paddingHorizontal: 8, width: 72 },
  profileImage: { backgroundColor: '#EEF2F6', borderRadius: 12, height: 150, marginTop: 12, width: '100%' },
  locationRow: { alignItems: 'center', borderTopColor: '#EEF2F6', borderTopWidth: 1, flexDirection: 'row', gap: 10, paddingVertical: 10 },
  locationImage: { backgroundColor: '#EEF2F6', borderRadius: 10, height: 54, width: 68 },
  modalBackdrop: { alignItems: 'center', backgroundColor: 'rgba(15, 23, 42, 0.46)', flex: 1, justifyContent: 'center', padding: 18 },
  modalCard: { backgroundColor: '#FFFFFF', borderRadius: 18, gap: 2, maxWidth: 430, padding: 16, width: '100%' },
  modalHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  modalTitle: { color: TkimphPalette.ink, fontSize: 19, fontWeight: '900' },
  closeButton: { alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 18, height: 38, justifyContent: 'center', width: 38 },
});
