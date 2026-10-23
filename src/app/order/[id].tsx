import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { BankDetails } from '@/components/ui/BankDetails';
import { Button } from '@/components/ui/Button';
import { fetchStoreSettings, type StoreSettings } from '@/lib/checkout';
import { payForOrder } from '@/lib/payments';
import { formatNaira } from '@/lib/menu';
import { canWorkOrder, claimOrder, fetchOrder, markOrderPaid, nextStatus, releaseOrder, setOrderStatus, statusLabel, subscribeToOrders, type OrderDetail } from '@/lib/orders';
import { useAuth } from '@/providers/auth';
import { colors } from '@/theme/colors';
import { goBack } from '@/lib/navigation';

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isStaff, isAdmin, session } = useAuth();
  const userId = session?.user.id;
  const [staffBusy, setStaffBusy] = useState(false);
  const [staffError, setStaffError] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [store, setStore] = useState<StoreSettings | null>(null);

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

  useEffect(() => {
    fetchStoreSettings().then(setStore).catch(() => {});
  }, []);

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
  const staffAction = async (action: () => Promise<void>) => {
    setStaffBusy(true);
    setStaffError(null);
    try {
      await action();
      load();
    } catch (e) {
      setStaffError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setStaffBusy(false);
    }
  };
  const next = nextStatus(order);
  const open = order.status !== 'completed' && order.status !== 'cancelled';
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

        {order.payment_method === 'transfer' && order.payment_status === 'unpaid' && order.status !== 'cancelled' ? (
          <>
            <Text style={styles.section}>Pay {formatNaira(order.total_kobo)} by transfer</Text>
            <BankDetails store={store} reference={order.id.slice(0, 8).toUpperCase()} />
          </>
        ) : null}

        {isStaff && open ? (
          <>
            <Text style={styles.section}>Manage order</Text>
            {staffError ? <Text style={styles.error}>{staffError}</Text> : null}
            {!order.claimed_by ? (
              <Button title="Claim order" loading={staffBusy} onPress={() => staffAction(() => claimOrder(order.id))} />
            ) : null}
            {order.claimed_by && !canWorkOrder(order, userId, isAdmin) ? (
              <Text style={styles.muted}>This order is being handled by another staff member.</Text>
            ) : null}
            {order.claimed_by && canWorkOrder(order, userId, isAdmin) ? (
              <>
            {order.payment_status === 'unpaid' && order.payment_method !== 'card' ? (
              <Button title="Mark paid" variant="ghost" loading={staffBusy} onPress={() => staffAction(() => markOrderPaid(order.id))} />
            ) : null}
            {next ? <Button title={next.label} loading={staffBusy} onPress={() => staffAction(() => setOrderStatus(order.id, next.status))} /> : null}
            <Button title="Cancel order" variant="ghost" loading={staffBusy} onPress={() => staffAction(() => setOrderStatus(order.id, 'cancelled'))} />
            <Button title="Release order" variant="ghost" loading={staffBusy} onPress={() => staffAction(() => releaseOrder(order.id))} />
              </>
            ) : null}
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
