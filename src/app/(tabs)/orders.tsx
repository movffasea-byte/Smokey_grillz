import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { TAB_BAR_SPACE } from '@/components/ui/Glass';
import { Screen } from '@/components/ui/Screen';
import { formatNaira } from '@/lib/menu';
import { fetchOrders, statusLabel, subscribeToOrders, type Order } from '@/lib/orders';
import { colors } from '@/theme/colors';

export default function Orders() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetchOrders()
      .then(setOrders)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    return subscribeToOrders(load);
  }, [load]);

  if (loading) return <ActivityIndicator style={styles.center} color={colors.primary} />;

  return (
    <Screen style={styles.container} edges={['top']}>
      <Text style={styles.title}>Your orders</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={orders}
        keyExtractor={(o) => o.id}
        contentContainerStyle={styles.list}
        onRefresh={load}
        refreshing={false}
        ListEmptyComponent={<Text style={styles.muted}>No orders yet. Your orders will show up here.</Text>}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => router.push({ pathname: '/order/[id]', params: { id: item.id } })}>
            <View style={styles.row}>
              <Text style={styles.name}>#{item.id.slice(0, 8).toUpperCase()}</Text>
              <Text style={styles.status}>{statusLabel(item.status)}</Text>
            </View>
            <Text style={styles.muted}>
              {new Date(item.created_at).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })} ·{' '}
              {item.type === 'pickup' ? 'Pickup' : 'Delivery'}
            </Text>
            <Text style={styles.price}>{formatNaira(item.total_kobo)}</Text>
          </Pressable>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1 },
  title: { color: colors.text, fontSize: 28, fontWeight: '800', paddingHorizontal: 16, paddingTop: 8 },
  error: { color: colors.danger, paddingHorizontal: 16 },
  list: { padding: 16, paddingBottom: TAB_BAR_SPACE, gap: 12 },
  card: { backgroundColor: colors.surface, borderRadius: 14, padding: 14, gap: 4, borderWidth: 1, borderColor: colors.border },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  name: { color: colors.text, fontSize: 16, fontWeight: '700' },
  status: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  muted: { color: colors.textMuted, fontSize: 14 },
  price: { color: colors.text, fontSize: 16, fontWeight: '700', marginTop: 4 },
});
