import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { fetchAddresses, type Address } from '@/lib/addresses';
import { fetchDeliveryZones, fetchStoreSettings, placeOrder, type DeliveryZone, type StoreSettings } from '@/lib/checkout';
import { formatNaira } from '@/lib/menu';
import { payForOrder } from '@/lib/payments';
import { useCart } from '@/providers/cart';
import { colors } from '@/theme/colors';
import { goBack } from '@/lib/navigation';

type OrderType = 'pickup' | 'delivery';
type PayMethod = 'cash' | 'transfer' | 'card';

export default function Checkout() {
  const router = useRouter();
  const { lines, subtotalKobo, clear } = useCart();
  const [saved, setSaved] = useState<Address[]>([]);
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [store, setStore] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<OrderType>('pickup');
  const [zoneId, setZoneId] = useState<string | null>(null);
  const [addressLine, setAddressLine] = useState('');
  const [payment, setPayment] = useState<PayMethod>('cash');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placedId, setPlacedId] = useState<string | null>(null);
  const [payNote, setPayNote] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchDeliveryZones(), fetchStoreSettings(), fetchAddresses()])
      .then(([z, s, a]) => {
        setZones(z);
        setStore(s);
        setSaved(a);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const zone = zones.find((z) => z.id === zoneId);
  const feeKobo = type === 'delivery' ? (zone?.fee_kobo ?? 0) : 0;
  const canSubmit = lines.length > 0 && (type === 'pickup' || (!!zone && addressLine.trim().length > 3));

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const id = await placeOrder({ type, lines, zoneId, addressLine, paymentMethod: payment, notes });
      clear();
      setPlacedId(id);
      if (payment === 'card') {
        try {
          const result = await payForOrder(id);
          setPayNote(
            result === 'successful'
              ? 'Payment received.'
              : 'Payment not completed. You can pay from your order page.',
          );
        } catch (e) {
          setPayNote(`Payment could not start: ${e instanceof Error ? e.message : 'unknown error'}. You can pay from your order page.`);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not place order');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <ActivityIndicator style={styles.center} color={colors.primary} />;

  if (placedId) {
    return (
      <Screen style={[styles.container, styles.done]}>
        <Text style={styles.title}>Order placed 🎉</Text>
        <Text style={styles.muted}>Reference #{placedId.slice(0, 8).toUpperCase()}</Text>
        {payNote ? <Text style={styles.muted}>{payNote}</Text> : null}
        <Text style={styles.muted}>
          {type === 'pickup' ? `Pick up at ${store?.address}.` : 'We will bring it to your address.'}
        </Text>
        <View style={styles.fullWidth}>
          <Button title="Track my order" onPress={() => router.replace({ pathname: '/order/[id]', params: { id: placedId } })} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Pressable onPress={() => goBack(router)}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title}>Checkout</Text>

        <Text style={styles.section}>How do you want it?</Text>
        <View style={styles.row}>
          <Choice label="Pickup" active={type === 'pickup'} onPress={() => setType('pickup')} />
          <Choice label="Delivery" active={type === 'delivery'} onPress={() => setType('delivery')} />
        </View>

        {type === 'pickup' ? (
          <Text style={styles.muted}>Collect from: {store?.address}</Text>
        ) : (
          <>
            <Text style={styles.section}>Delivery area</Text>
            {zones.map((z) => (
              <Pressable key={z.id} style={[styles.zone, zoneId === z.id && styles.zoneActive]} onPress={() => setZoneId(z.id)}>
                <Text style={styles.zoneName}>{z.name}</Text>
                <Text style={styles.zoneFee}>{formatNaira(z.fee_kobo)}</Text>
              </Pressable>
            ))}
            {saved.length > 0 ? (
              <View style={styles.row}>
                {saved.map((a) => (
                  <Choice
                    key={a.id}
                    label={a.label ?? 'Saved'}
                    active={addressLine === a.line}
                    onPress={() => setAddressLine(a.line)}
                  />
                ))}
              </View>
            ) : null}
            <TextField label="Street address / landmark" value={addressLine} onChangeText={setAddressLine} placeholder="House number, street, landmark" />
          </>
        )}

        <Text style={styles.section}>Payment</Text>
        <View style={styles.row}>
          <Choice label={type === 'pickup' ? 'Pay at pickup' : 'Pay on delivery'} active={payment === 'cash'} onPress={() => setPayment('cash')} />
        </View>
        <View style={styles.row}>
          <Choice label="Bank transfer" active={payment === 'transfer'} onPress={() => setPayment('transfer')} />
          <Choice label="Card (Flutterwave)" active={payment === 'card'} onPress={() => setPayment('card')} />
        </View>

        <TextField label="Notes (optional)" value={notes} onChangeText={setNotes} placeholder="e.g. no onions, extra spicy" />

        <View style={styles.summary}>
          <SummaryRow label="Subtotal" value={formatNaira(subtotalKobo)} />
          {type === 'delivery' ? <SummaryRow label="Delivery" value={zone ? formatNaira(feeKobo) : '—'} /> : null}
          <SummaryRow label="Total" value={formatNaira(subtotalKobo + feeKobo)} bold />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button title="Place order" onPress={submit} loading={submitting} disabled={!canSubmit} />
      </ScrollView>
    </Screen>
  );
}

function Choice({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.choice, active && styles.choiceActive]}>
      <Text style={[styles.choiceText, active && styles.choiceTextActive]}>{label}</Text>
    </Pressable>
  );
}

function SummaryRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.muted, bold && styles.bold]}>{label}</Text>
      <Text style={[styles.muted, bold && styles.bold]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1 },
  done: { alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  fullWidth: { alignSelf: 'stretch', marginTop: 12 },
  scroll: { padding: 16, gap: 12 },
  back: { color: colors.primary, fontSize: 17, fontWeight: '600' },
  title: { color: colors.text, fontSize: 28, fontWeight: '800' },
  section: { color: colors.text, fontSize: 16, fontWeight: '700', marginTop: 8 },
  muted: { color: colors.textMuted, fontSize: 14 },
  bold: { color: colors.text, fontSize: 17, fontWeight: '800' },
  error: { color: colors.danger, fontSize: 14 },
  row: { flexDirection: 'row', gap: 10 },
  choice: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  choiceActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  choiceText: { color: colors.textMuted, fontWeight: '700' },
  choiceTextActive: { color: colors.text },
  zone: { flexDirection: 'row', justifyContent: 'space-between', padding: 14, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  zoneActive: { borderColor: colors.primary },
  zoneName: { color: colors.text, fontSize: 15, flex: 1 },
  zoneFee: { color: colors.primary, fontWeight: '700' },
  summary: { backgroundColor: colors.surface, borderRadius: 14, padding: 14, gap: 6, borderWidth: 1, borderColor: colors.border },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
});
