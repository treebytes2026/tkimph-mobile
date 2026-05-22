import { useEffect, useState } from 'react';

import { AccountPageShell, ActionButton, FormCard, FormInput, FormMessage } from '@/components/account-form';
import { AuthUser, fetchCurrentUser, getStoredUser, updateCustomerProfile } from '@/lib/api';

export default function AccountProfileScreen() {
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser());
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchCurrentUser().then(setUser).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!user) return;
    setForm({
      name: user.name,
      email: user.email,
      phone: user.phone ?? '',
      address: user.address ?? '',
    });
  }, [user]);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const response = await updateCustomerProfile({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        address: form.address.trim() || null,
      });
      setUser(response.user);
      setMessage(response.message);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not update profile.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AccountPageShell title="Customer profile" subtitle="Keep your account details updated" icon="person-outline">
      <FormCard>
        <FormInput label="Name" value={form.name} onChangeText={(name) => setForm((current) => ({ ...current, name }))} />
        <FormInput label="Email" value={form.email} onChangeText={(email) => setForm((current) => ({ ...current, email }))} />
        <FormInput label="Phone" value={form.phone} onChangeText={(phone) => setForm((current) => ({ ...current, phone }))} />
        <FormInput label="Address" multiline value={form.address} onChangeText={(address) => setForm((current) => ({ ...current, address }))} />
        <ActionButton disabled={saving || !form.name || !form.email || !form.phone} icon="save" label={saving ? 'Saving...' : 'Save profile'} onPress={handleSave} />
        <FormMessage>{message}</FormMessage>
      </FormCard>
    </AccountPageShell>
  );
}
