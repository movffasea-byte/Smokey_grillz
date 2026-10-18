import { useRouter } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { TAB_BAR_SPACE } from '@/components/ui/Glass';
import { ClosedBanner } from '@/components/ui/ClosedBanner';
import { formatNaira } from '@/lib/menu';
import { useStoreOpen } from '@/lib/useStoreStatus';
import { useCart } from '@/providers/cart';
import { colors } from '@/theme/colors';

export default function Cart() {
  const router = useRouter();
  const storeOpen = useStoreOpen();
  const { lines, subtotalKobo, lineUnitPrice, setQty } = useCart();

  return (
    <Screen style={styles.container} edges={['top']}>
      <Text style={styles.title}>Your cart</Text>
      {storeOpen ? null : <ClosedBanner />}
      <FlatList
        data={lines}
        keyExtractor={(l) => l.key}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.muted}>Your cart is empty. Add something from the menu.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.body}>
              <Text style={styles.name}>{item.name}</Text>
              {item.choices.length > 0 ? (
                <Text style={styles.muted}>{item.choices.map((c) => c.name).join(', ')}</Text>
              ) : null}
              <Text style={styles.price}>{formatNaira(lineUnitPrice(item) * item.qty)}</Text>
            </View>
            <View style={styles.stepper}>
              <Pressable onPress={() => setQty(item.key, item.qty - 1)} style={styles.stepBtn}>
                <Text style={styles.stepText}>−</Text>
              </Pressable>
              <Text style={styles.qty}>{item.qty}</Text>
              <Pressable onPress={() => setQty(item.key, item.qty + 1)} style={styles.stepBtn}>
                <Text style={styles.stepText}>+</Text>
              </Pressable>
            </View>
          </View>
        )}
      />
      {lines.length > 0 ? (
        <View style={styles.footer}>
          <View style={styles.row}>
            <Text style={styles.name}>Subtotal</Text>
            <Text style={styles.name}>{formatNaira(subtotalKobo)}</Text>
          </View>
          <Button title="Checkout" onPress={() => router.push('/checkout')} disabled={!storeOpen} />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { color: colors.text, fontSize: 28, fontWeight: '800', paddingHorizontal: 16, paddingTop: 8 },
  list: { padding: 16, gap: 12 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.border },
  body: { flex: 1, gap: 4 },
  name: { color: colors.text, fontSize: 16, fontWeight: '700' },
  muted: { color: colors.textMuted, fontSize: 14 },
  price: { color: colors.primary, fontSize: 15, fontWeight: '700' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  stepText: { color: colors.text, fontSize: 18, fontWeight: '700' },
  qty: { color: colors.text, fontSize: 16, fontWeight: '700', minWidth: 18, textAlign: 'center' },
  footer: { padding: 16, marginBottom: TAB_BAR_SPACE, gap: 10, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
});
