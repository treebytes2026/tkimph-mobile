import { useState } from 'react';

import { AccountPageShell, ActionButton, FormCard, FormInput, FormMessage } from '@/components/account-form';
import { submitCustomerHelpCenterConcern } from '@/lib/api';

export default function AccountSupportScreen() {
  const [form, setForm] = useState({ subject: '', message: '' });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSubmit() {
    if (!form.subject.trim() || !form.message.trim()) {
      setNotice('Enter a subject and message.');
      return;
    }
    setSaving(true);
    setNotice(null);
    try {
      const response = await submitCustomerHelpCenterConcern({
        subject: form.subject.trim(),
        message: form.message.trim(),
      });
      setForm({ subject: '', message: '' });
      setNotice(response.message);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Could not submit help request.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AccountPageShell title="Help & support" subtitle="Send your concern to T'KIM support" icon="help-outline">
      <FormCard>
        <FormInput label="Subject" value={form.subject} onChangeText={(subject) => setForm((state) => ({ ...state, subject }))} />
        <FormInput label="Message" multiline value={form.message} onChangeText={(message) => setForm((state) => ({ ...state, message }))} />
        <ActionButton disabled={saving} icon="send" label={saving ? 'Sending...' : 'Submit request'} onPress={handleSubmit} />
        <FormMessage>{notice}</FormMessage>
      </FormCard>
    </AccountPageShell>
  );
}
