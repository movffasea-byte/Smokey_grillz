import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { payForOrder } from '@/lib/payments';
import { formatNaira } from '@/lib/menu';
import { fetchOrder, statusLabel, subscribeToOrders, type OrderDetail } from '@/lib/orders';
import { colors } from '@/theme/colors';
import { goBack } from '@/lib/navigation';

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetchOrder(id)
      .then(setOrder)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
    return subscribeToOrders(load);
  }, [load]);

  if (loading) return <ActivityIndicator style={styles.center} color={colors.primary} />;
  if (error || !order) return <Text style={[styles.center, styles.error]}>{error ?? 'Order not found.'}</Text>;

  const events = [...order.order_events].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const pay = async () => {
    setPaying(true);
    setPayError(null);
    try {
      await payForOrder(order.id);
      load();
    } catch (e) {
      setPayError(e instanceof Error ? e.message : 'Could not start payment');
    } finally {
      setPaying(false);
    }
  };
  const addressLine = (order.address as { line?: string } | null)?.line;

  return (
    <Screen style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Pressable onPress={() => goBack(router, '/orders')}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title}>Order #{order.id.slice(0, 8).toUpperCase()}</Text>
        <Text style={styles.status}>{statusLabel(order.status)}</Text>

        <View style={styles.box}>
          {order.order_items.map((i) => {
            const opts = (i.options as { name: string }[] | null) ?? [];
            return (
              <View key={i.id} style={styles.line}>
                <View style={styles.flex}>
                  <Text style={styles.name}>
                    {i.qty} × {i.name}
                  </Text>
                  {opts.length > 0 ? <Text style={styles.muted}>{opts.map((o) => o.name).join(', ')}</Text> : null}
                </View>
                <Text style={styles.name}>{formatNaira(i.unit_price_kobo * i.qty)}</Text>
              </View>
            );
          })}
          <View style={styles.divider} />
          <Row label="Subtotal" value={formatNaira(order.subtotal_kobo)} />
          {order.type === 'delivery' ? <Row label="Delivery" value={formatNaira(order.delivery_fee_kobo)} /> : null}
          <Row label="Total" value={formatNaira(order.total_kobo)} bold />
        </View>

        <View style={styles.box}>
          <Row label="Type" value={order.type === 'pickup' ? 'Pickup' : 'Delivery'} />
          {addressLine ? <Row label="Address" value={addressLine} /> : null}
          <Row label="Payment" value={`${order.payment_method} · ${order.payment_status}`} />
          {order.notes ? <Row label="Notes" value={order.notes} /> : null}
        </View>

        {order.payment_method === 'card' && order.payment_status === 'unpaid' && order.status !== 'cancelled' ? (
          <>
            {payError ? <Text style={styles.error}>{payError}</Text> : null}
            <Button title={`Pay ${formatNaira(order.total_kobo)} now`} onPress={pay} loading={paying} />
          </>
        ) : null}

        <Text style={styles.section}>Progress</Text>
        <View style={styles.box}>
          {events.map((e) => (
            <View key={e.id} style={styles.line}>
              <Text style={styles.name}>{statusLabel(e.status)}</Text>
              <Text style={styles.muted}>
                {new Date(e.created_at).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.line}>
      <Text style={[styles.muted, bold && styles.name]}>{label}</Text>
      <Text style={[styles.muted, styles.right, bold && styles.name]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, textAlignVertical: 'center', textAlign: 'center' },
  error: { color: colors.danger },
  scroll: { padding: 16, gap: 12 },
  flex: { flex: 1 },
  back: { color: colors.primary, fontSize: 17, fontWeight: '600' },
  title: { color: colors.text, fontSize: 26, fontWeight: '800' },
  status: { color: colors.primary, fontSize: 17, fontWeight: '700' },
  section: { color: colors.text, fontSize: 16, fontWeight: '700', marginTop: 4 },
  box: { backgroundColor: colors.surface, borderRadius: 14, padding: 14, gap: 8, borderWidth: 1, borderColor: colors.border },
  line: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  divider: { height: 1, backgroundColor: colors.border },
  name: { color: colors.text, fontSize: 15, fontWeight: '700' },
  muted: { color: colors.textMuted, fontSize: 14 },
  right: { flexShrink: 1, textAlign: 'right' },
});
