import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useCallback, useEffect, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Card, MobileShell } from '@/components/mobile-shell';
import { formatPartnerMoney, PartnerActionButton, PartnerEmpty, PartnerMetricCard, PartnerNotice, StatusChip } from '@/components/restaurant-workflow';
import { BodyText, Kicker, ScreenTitle, SectionHeader } from '@/components/ui-kit';
import { TkimphPalette } from '@/constants/theme';
import { hasRestaurantOwnerSession, useAuthSession } from '@/hooks/use-auth-session';
import {
  fetchPartnerCommissionCollections,
  fetchPartnerEarnings,
  PartnerCommissionCollection,
  PartnerEarnings,
  PartnerSettlement,
  submitPartnerCommissionCollectionProof,
  submitPartnerSettlementProof,
  UploadFile,
} from '@/lib/api';
import { pickProofUpload } from '@/lib/uploads';

type ProofTarget =
  | { type: 'commission'; row: PartnerCommissionCollection }
  | { type: 'settlement'; row: PartnerSettlement };

function blurActiveElement() {
  if (Platform.OS !== 'web') return;
  const active = document.activeElement;
  if (active instanceof HTMLElement) active.blur();
}

export default function RestaurantMoneyScreen() {
  const auth = useAuthSession();
  const canView = auth.isRestaurantOwner;
  const [earnings, setEarnings] = useState<PartnerEarnings | null>(null);
  const [collections, setCollections] = useState<PartnerCommissionCollection[]>([]);
  const [settlements, setSettlements] = useState<PartnerSettlement[]>([]);
  const [paymentDetails, setPaymentDetails] = useState<{ gcash_name?: string | null; gcash_number?: string | null }>({});
  const [proofTarget, setProofTarget] = useState<ProofTarget | null>(null);
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [proof, setProof] = useState<UploadFile | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const reset = useCallback(() => {
    setEarnings(null);
    setCollections([]);
    setSettlements([]);
    setPaymentDetails({});
    setProofTarget(null);
    setProof(null);
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
      const [nextEarnings, nextCollections] = await Promise.all([
        fetchPartnerEarnings(),
        fetchPartnerCommissionCollections(),
      ]);
      if (!hasRestaurantOwnerSession()) return;
      setEarnings(nextEarnings);
      setCollections(nextCollections.data);
      setPaymentDetails(nextCollections.payment_details ?? nextEarnings.payment_details ?? {});
      setSettlements([]);
      setError(null);
    } catch (err) {
      if (hasRestaurantOwnerSession()) setError(err instanceof Error ? err.message : 'Could not load money tools.');
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

  function openProof(target: ProofTarget) {
    setProofTarget(target);
    setReference(target.row.partner_reference_number ?? '');
    setNote(target.row.partner_payment_note ?? '');
    setProof(null);
  }

  async function chooseProof() {
    try {
      const file = await pickProofUpload();
      if (file) setProof(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not choose proof file.');
    }
  }

  async function submitProof() {
    if (!proofTarget || !proof || !hasRestaurantOwnerSession()) return;
    blurActiveElement();
    setSubmitting(true);
    try {
      if (proofTarget.type === 'commission') {
        const response = await submitPartnerCommissionCollectionProof(proofTarget.row.id, {
          proof,
          partner_payment_method: 'gcash',
          partner_reference_number: reference.trim() || null,
          partner_payment_note: note.trim() || null,
        });
        if (!hasRestaurantOwnerSession()) return;
        setCollections((current) => current.map((row) => (row.id === response.collection.id ? response.collection : row)));
      } else {
        const response = await submitPartnerSettlementProof(proofTarget.row.id, {
          proof,
          partner_reference_number: reference.trim(),
          partner_payment_note: note.trim() || null,
        });
        if (!hasRestaurantOwnerSession()) return;
        setSettlements((current) => current.map((row) => (row.id === response.settlement.id ? response.settlement : row)));
      }
      setProofTarget(null);
      setMessage('Payment proof submitted.');
    } catch (err) {
      if (hasRestaurantOwnerSession()) setError(err instanceof Error ? err.message : 'Could not submit proof.');
    } finally {
      if (hasRestaurantOwnerSession()) setSubmitting(false);
    }
  }

  if (!canView) {
    return (
      <MobileShell>
        <Kicker>Money</Kicker>
        <ScreenTitle>Restaurant login required.</ScreenTitle>
        <BodyText>Money tools are available for approved restaurant owners.</BodyText>
      </MobileShell>
    );
  }

  return (
    <MobileShell>
      <Kicker>Restaurant money</Kicker>
      <ScreenTitle>Earnings and collections</ScreenTitle>
      <BodyText>Review revenue, commission dues, settlements, and upload payment proofs.</BodyText>

      {error ? <PartnerNotice tone="danger" text={error} /> : null}
      {message ? <PartnerNotice tone="success" text={message} /> : null}

      <View style={styles.toolbar}>
        <Text style={styles.toolbarText}>{loading ? 'Loading money tools...' : earnings?.restaurant_name ?? 'Restaurant account'}</Text>
        <PartnerActionButton compact tone="outline" icon="refresh" label="Refresh" disabled={loading} onPress={() => void load()} />
      </View>

      {earnings ? (
        <View style={styles.metrics}>
          <PartnerMetricCard label="Gross sales" value={formatPartnerMoney(earnings.gross_sales)} icon="payments" />
          <PartnerMetricCard label="Commission" value={formatPartnerMoney(earnings.platform_commission)} icon="receipt-long" />
          <PartnerMetricCard label="Delivery fees" value={formatPartnerMoney(earnings.delivery_fees)} icon="local-shipping" />
          <PartnerMetricCard label="Restaurant net" value={formatPartnerMoney(earnings.restaurant_net)} icon="account-balance-wallet" />
        </View>
      ) : null}

      <SectionHeader title="GCash payment details" />
      <Card>
        <Text style={styles.title}>{paymentDetails.gcash_name || 'GCash name not set'}</Text>
        <Text style={styles.meta}>{paymentDetails.gcash_number || 'GCash number not set by admin'}</Text>
      </Card>

      <SectionHeader title="Commission collections" action={`${collections.length} records`} />
      {collections.length === 0 ? (
        <PartnerEmpty icon="receipt-long" title="No commission records" text="Admin-generated commission collections will appear here." />
      ) : (
        collections.map((row) => (
          <Card key={row.id}>
            <View style={styles.rowBetween}>
              <Text style={styles.title}>{row.collection_reference || `Collection #${row.id}`}</Text>
              <StatusChip tone={row.status === 'received' ? 'green' : row.is_overdue ? 'red' : 'yellow'}>{row.is_overdue ? 'overdue' : row.status}</StatusChip>
            </View>
            <Text style={styles.meta}>{row.period_from} to {row.period_to} | Due {row.due_date ?? 'not set'}</Text>
            <Text style={styles.amount}>{formatPartnerMoney(row.commission_amount)}</Text>
            {row.payment_submitted_at ? <Text style={styles.successText}>Proof submitted {new Date(row.payment_submitted_at).toLocaleDateString()}</Text> : null}
            <View style={styles.actions}>
              <PartnerActionButton compact icon="upload-file" label="Submit proof" onPress={() => openProof({ type: 'commission', row })} />
            </View>
          </Card>
        ))
      )}

      <SectionHeader title="Settlements" action={`${settlements.length} records`} />
      {settlements.length === 0 ? (
        <PartnerEmpty icon="account-balance" title="Settlements not enabled" text="The mobile app will show settlement records here when the API enables that feature." />
      ) : (
        settlements.map((row) => (
          <Card key={row.id}>
            <View style={styles.rowBetween}>
              <Text style={styles.title}>Settlement #{row.id}</Text>
              <StatusChip tone={row.status === 'paid' ? 'green' : 'yellow'}>{row.status}</StatusChip>
            </View>
            <Text style={styles.meta}>{row.period_from} to {row.period_to}</Text>
            <Text style={styles.amount}>{formatPartnerMoney(row.platform_revenue)}</Text>
            {row.payment_submitted_at ? <Text style={styles.successText}>Proof submitted {new Date(row.payment_submitted_at).toLocaleDateString()}</Text> : null}
            <View style={styles.actions}>
              <PartnerActionButton compact icon="upload-file" label="Submit proof" onPress={() => openProof({ type: 'settlement', row })} />
            </View>
          </Card>
        ))
      )}

      <ProofModal
        visible={Boolean(proofTarget)}
        title={proofTarget?.type === 'settlement' ? 'Settlement proof' : 'Commission proof'}
        proofName={proof?.name}
        reference={reference}
        note={note}
        saving={submitting}
        referenceRequired={proofTarget?.type === 'settlement'}
        onReference={setReference}
        onNote={setNote}
        onPick={() => void chooseProof()}
        onClose={() => setProofTarget(null)}
        onSubmit={() => void submitProof()}
      />
    </MobileShell>
  );
}

function ProofModal({ visible, title, proofName, reference, note, saving, referenceRequired, onReference, onNote, onPick, onClose, onSubmit }: {
  visible: boolean;
  title: string;
  proofName?: string;
  reference: string;
  note: string;
  saving: boolean;
  referenceRequired?: boolean;
  onReference: (text: string) => void;
  onNote: (text: string) => void;
  onPick: () => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <MaterialIcons color={TkimphPalette.ink} name="close" size={21} />
            </Pressable>
          </View>
          <TextInput placeholder="Reference number" placeholderTextColor={TkimphPalette.muted} value={reference} onChangeText={onReference} style={styles.input} />
          <TextInput multiline placeholder="Payment note" placeholderTextColor={TkimphPalette.muted} value={note} onChangeText={onNote} style={[styles.input, styles.textArea]} />
          <PartnerActionButton tone="outline" icon="attach-file" label={proofName || 'Choose image or PDF'} onPress={onPick} />
          <PartnerActionButton icon="upload-file" label={saving ? 'Submitting' : 'Submit proof'} disabled={saving || !proofName || (referenceRequired && !reference.trim())} onPress={onSubmit} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  toolbar: { alignItems: 'center', flexDirection: 'row', gap: 8, justifyContent: 'space-between', marginTop: 16 },
  toolbarText: { color: TkimphPalette.muted, flex: 1, fontSize: 13, fontWeight: '800' },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 },
  rowBetween: { alignItems: 'center', flexDirection: 'row', gap: 10, justifyContent: 'space-between' },
  title: { color: TkimphPalette.ink, flex: 1, fontSize: 16, fontWeight: '900' },
  meta: { color: TkimphPalette.muted, fontSize: 13, fontWeight: '700', lineHeight: 19, marginTop: 6 },
  amount: { color: TkimphPalette.ink, fontSize: 21, fontWeight: '900', marginTop: 8 },
  successText: { color: TkimphPalette.green, fontSize: 12, fontWeight: '900', marginTop: 6 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  modalBackdrop: { alignItems: 'center', backgroundColor: 'rgba(15, 23, 42, 0.46)', flex: 1, justifyContent: 'center', padding: 18 },
  modalCard: { backgroundColor: '#FFFFFF', borderRadius: 18, gap: 12, maxWidth: 430, padding: 16, width: '100%' },
  modalHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  modalTitle: { color: TkimphPalette.ink, fontSize: 19, fontWeight: '900' },
  closeButton: { alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 18, height: 38, justifyContent: 'center', width: 38 },
  input: { backgroundColor: '#F8FAFC', borderColor: '#E4E7EC', borderRadius: 12, borderWidth: 1, color: TkimphPalette.ink, fontSize: 14, minHeight: 46, paddingHorizontal: 12 },
  textArea: { minHeight: 82, paddingTop: 10, textAlignVertical: 'top' },
});
