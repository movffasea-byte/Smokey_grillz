import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import {
  addCategory,
  fetchAllCategories,
  saveCategoryOrder,
  updateCategory,
  type Category,
} from '@/lib/adminMenu';
import { goBack } from '@/lib/navigation';
import { colors } from '@/theme/colors';

export default function AdminCategories() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetchAllCategories()
      .then((c) => {
        setCategories(c);
        setNames(Object.fromEntries(c.map((x) => [x.id, x.name])));
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  const move = (index: number, dir: -1 | 1) => {
    const next = [...categories];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setCategories(next);
    run(() => saveCategoryOrder(next));
  };

  return (
    <Screen style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => goBack(router)}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title}>Categories</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {loading ? <ActivityIndicator color={colors.primary} /> : null}

        {categories.map((c, i) => {
          const name = names[c.id] ?? c.name;
          const renamed = name.trim() !== c.name && name.trim().length > 0;
          return (
            <View key={c.id} style={styles.card}>
              <TextField label="Name" value={name} onChangeText={(t) => setNames((p) => ({ ...p, [c.id]: t }))} />
              <View style={styles.row}>
                <View style={styles.row}>
                  <Switch
                    value={c.active}
                    disabled={busy}
                    onValueChange={(v) => run(() => updateCategory(c.id, { active: v }))}
                    trackColor={{ true: colors.primary }}
                  />
                  <Text style={styles.muted}>{c.active ? 'Visible' : 'Hidden'}</Text>
                </View>
                <View style={styles.row}>
                  <Pressable disabled={busy || i === 0} onPress={() => move(i, -1)} style={[styles.arrow, i === 0 && styles.dim]}>
                    <Text style={styles.arrowText}>▲</Text>
                  </Pressable>
                  <Pressable
                    disabled={busy || i === categories.length - 1}
                    onPress={() => move(i, 1)}
                    style={[styles.arrow, i === categories.length - 1 && styles.dim]}>
                    <Text style={styles.arrowText}>▼</Text>
                  </Pressable>
                </View>
              </View>
              {renamed ? (
                <Button title="Save name" loading={busy} onPress={() => run(() => updateCategory(c.id, { name: name.trim() }))} />
              ) : null}
            </View>
          );
        })}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Add a category</Text>
          <TextField label="Name" value={newName} onChangeText={setNewName} />
          <Button
            title="Add category"
            loading={busy}
            disabled={newName.trim().length < 2}
            onPress={() =>
              run(async () => {
                await addCategory(newName, categories.length + 1);
                setNewName('');
              })
            }
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16, gap: 12 },
  back: { color: colors.primary, fontSize: 16 },
  title: { color: colors.text, fontSize: 28, fontWeight: '800' },
  error: { color: colors.danger, fontSize: 14 },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, gap: 12, borderWidth: 1, borderColor: colors.border },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'space-between' },
  muted: { color: colors.textMuted, fontSize: 14 },
  arrow: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  arrowText: { color: colors.text, fontSize: 14 },
  dim: { opacity: 0.35 },
});
