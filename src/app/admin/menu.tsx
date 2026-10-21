import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { fetchAllCategories, fetchAllItems, updateItem, type Category, type MenuItem } from '@/lib/adminMenu';
import { formatNaira } from '@/lib/menu';
import { goBack } from '@/lib/navigation';
import { colors } from '@/theme/colors';

export default function AdminMenu() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      Promise.all([fetchAllCategories(), fetchAllItems()])
        .then(([c, i]) => {
          setCategories(c);
          setItems(i);
        })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    }, []),
  );

  const byCategory = useMemo(() => {
    const map: Record<string, MenuItem[]> = {};
    for (const i of items) (map[i.category_id] ??= []).push(i);
    return map;
  }, [items]);

  const setAvailable = async (item: MenuItem, available: boolean) => {
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, available } : i)));
    setError(null);
    try {
      await updateItem(item.id, { available });
    } catch (e) {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, available: item.available } : i)));
      setError(e instanceof Error ? e.message : 'Could not update item');
    }
  };

  return (
    <Screen style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Pressable onPress={() => goBack(router)}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title}>Menu</Text>
        <Button title="Add item" onPress={() => router.push('/admin/item')} />
        <Button title="Manage categories" variant="ghost" onPress={() => router.push('/admin/categories')} />

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {loading ? <ActivityIndicator color={colors.primary} /> : null}

        {categories.map((c) => (
          <View key={c.id} style={styles.group}>
            <Text style={styles.groupTitle}>
              {c.name}
              {c.active ? '' : '  (hidden)'}
            </Text>
            {(byCategory[c.id] ?? []).length === 0 ? <Text style={styles.muted}>No items.</Text> : null}
            {(byCategory[c.id] ?? []).map((i) => (
              <View key={i.id} style={styles.row}>
                <Pressable
                  style={styles.flex}
                  onPress={() => router.push({ pathname: '/admin/item', params: { id: i.id } })}>
                  <Text style={styles.name}>{i.name}</Text>
                  <Text style={styles.muted}>
                    {formatNaira(i.price_kobo)}
                    {i.featured ? ' · Featured' : ''}
                  </Text>
                </Pressable>
                <View style={styles.toggle}>
                  <Text style={[styles.toggleLabel, !i.available && styles.soldOut]}>
                    {i.available ? 'Available' : 'Sold out'}
                  </Text>
                  <Switch
                    value={i.available}
                    onValueChange={(v) => setAvailable(i, v)}
                    trackColor={{ true: colors.primary }}
                  />
                </View>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  scroll: { padding: 16, gap: 12 },
  back: { color: colors.primary, fontSize: 16 },
  title: { color: colors.text, fontSize: 28, fontWeight: '800' },
  error: { color: colors.danger, fontSize: 14 },
  group: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, gap: 10, borderWidth: 1, borderColor: colors.border },
  groupTitle: { color: colors.primary, fontSize: 16, fontWeight: '800' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  name: { color: colors.text, fontSize: 16, fontWeight: '700' },
  muted: { color: colors.textMuted, fontSize: 14 },
  toggle: { alignItems: 'center', gap: 2 },
  toggleLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  soldOut: { color: colors.danger },
});
