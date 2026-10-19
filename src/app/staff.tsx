import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { formatNaira } from '@/lib/menu';
import { goBack } from '@/lib/navigation';
import {
  ACTIVE_STATUSES,
  fetchStaffOrders,
  markOrderPaid,
  nextStatus,
  setOrderStatus,
  statusLabel,
  subscribeToOrders,
  type StaffOrder,
} from '@/lib/orders';
import { desktopAlertPermission, requestDesktopAlerts } from '@/lib/staffAlerts';
import { colors } from '@/theme/colors';

type Filter = 'active' | 'done';

export default function StaffOrders() {
  const router = useRouter();
  const [orders, setOrders] = useState<StaffOrder[]>([]);
  const [filter, setFilter] = useState<Filter>('active');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [alertPermission, setAlertPermission] = useState(desktopAlertPermission());

  const load = useCallback(() => {
    fetchStaffOrders()
      .then(setOrders)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    return subscribeToOrders(load);
  }, [load]);

  const run = async (id: string, action: () => Promise<void>) => {
    setBusyId(id);
    setError(null);
    try {
      await action();
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setBusyId(null);
    }
  };

  const isActive = (o: StaffOrder) => (ACTIVE_STATUSES as readonly string[]).includes(o.status);
  const shown = orders.filter((o) => (filter === 'active' ? isActive(o) : !isActive(o)));

  return (
    <Screen style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Pressable onPress={() => goBack(router)}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title}>Incoming orders</Text>

        {alertPermission === 'default' ? (
          <Button
            title="Enable desktop alerts for new orders"
            variant="ghost"
            onPress={() => requestDesktopAlerts().then(() => setAlertPermission(desktopAlertPermission()))}
          />
        ) : null}

        <View style={styles.tabs}>
          {(['active', 'done'] as const).map((f) => (
            <Pressable key={f} onPress={() => setFilter(f)} style={[styles.tab, filter === f && styles.tabOn]}>
              <Text style={[styles.tabText, filter === f && styles.tabTextOn]}>{f === 'active' ? 'Active' : 'Done'}</Text>
            </Pressable>
          ))}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {loading ? <ActivityIndicator color={colors.primary} /> : null}
        {!loading && shown.length === 0 ? <Text style={styles.muted}>No orders here.</Text> : null}

        {shown.map((o) => {
          const next = nextStatus(o);
          const busy = busyId === o.id;
          const addressLine = (o.address as { line?: string } | null)?.line;
          return (
            <View key={o.id} style={styles.card}>
              <Pressable onPress={() => router.push(`/order/${o.id}`)} style={styles.head}>
                <Text style={styles.name}>#{o.id.slice(0, 8).toUpperCase()}</Text>
                <Text style={styles.status}>{statusLabel(o.status)}</Text>
              </Pressable>
              <Text style={styles.muted}>
                {o.profiles?.full_name || 'Customer'}
                {o.profiles?.phone ? ` · ${o.profiles.phone}` : ''} ·{' '}
                {new Date(o.created_at).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}
              </Text>
              {o.order_items.map((i) => (
                <Text key={i.id} style={styles.line}>
                  {i.qty} × {i.name}
                </Text>
              ))}
              <Text style={styles.muted}>
                {o.type === 'pickup' ? 'Pickup' : `Delivery${addressLine ? ` · ${addressLine}` : ''}`}
              </Text>
              {o.notes ? <Text style={styles.muted}>Note: {o.notes}</Text> : null}
              <Text style={styles.name}>
                {formatNaira(o.total_kobo)} · {o.payment_method} · {o.payment_status}
              </Text>

              {isActive(o) ? (
                <View style={styles.actions}>
                  {o.payment_status === 'unpaid' && o.payment_method !== 'card' ? (
                    <Button title="Mark paid" variant="ghost" loading={busy} onPress={() => run(o.id, () => markOrderPaid(o.id))} />
                  ) : null}
                  {next ? <Button title={next.label} loading={busy} onPress={() => run(o.id, () => setOrderStatus(o.id, next.status))} /> : null}
                  <Button title="Cancel order" variant="ghost" loading={busy} onPress={() => run(o.id, () => setOrderStatus(o.id, 'cancelled'))} />
                </View>
              ) : null}
            </View>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16, gap: 12 },
  back: { color: colors.primary, fontSize: 16 },
  title: { color: colors.text, fontSize: 28, fontWeight: '800' },
  tabs: { flexDirection: 'row', gap: 8 },
  tab: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
  tabOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { color: colors.textMuted, fontWeight: '700' },
  tabTextOn: { color: colors.text },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, gap: 6, borderWidth: 1, borderColor: colors.border },
  head: { flexDirection: 'row', justifyContent: 'space-between' },
  name: { color: colors.text, fontSize: 16, fontWeight: '700' },
  status: { color: colors.primary, fontWeight: '700' },
  line: { color: colors.text, fontSize: 15 },
  muted: { color: colors.textMuted, fontSize: 14 },
  actions: { gap: 8, marginTop: 8 },
  error: { color: colors.danger, fontSize: 14 },
});
