import { useState } from 'react';

import { AccountPageShell, ActionButton, FormCard, FormInput, FormMessage } from '@/components/account-form';
import { changeCustomerPassword } from '@/lib/api';

export default function AccountPasswordScreen() {
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSave() {
    if (!form.current || !form.next || form.next !== form.confirm) {
      setMessage('Enter your current password and matching new passwords.');
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const response = await changeCustomerPassword({
        current_password: form.current,
        password: form.next,
        password_confirmation: form.confirm,
      });
      setForm({ current: '', next: '', confirm: '' });
      setMessage(response.message);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not change password.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AccountPageShell title="Password" subtitle="Update your sign-in credentials" icon="lock-outline">
      <FormCard>
        <FormInput label="Current password" secureTextEntry value={form.current} onChangeText={(current) => setForm((state) => ({ ...state, current }))} />
        <FormInput label="New password" secureTextEntry value={form.next} onChangeText={(next) => setForm((state) => ({ ...state, next }))} />
        <FormInput label="Confirm password" secureTextEntry value={form.confirm} onChangeText={(confirm) => setForm((state) => ({ ...state, confirm }))} />
        <ActionButton disabled={saving} icon="lock" label={saving ? 'Saving...' : 'Change password'} onPress={handleSave} />
        <FormMessage>{message}</FormMessage>
      </FormCard>
    </AccountPageShell>
  );
}
