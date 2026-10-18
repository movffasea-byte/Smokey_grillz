import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { ItemImage } from '@/components/ui/ItemImage';
import { fetchCategories, fetchMenuItem, formatNaira, type MenuItemDetail } from '@/lib/menu';
import { useCart } from '@/providers/cart';
import { colors } from '@/theme/colors';
import { goBack } from '@/lib/navigation';

export default function ItemDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { addLine } = useCart();
  const [item, setItem] = useState<MenuItemDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<Record<string, string[]>>({});
  const [qty, setQty] = useState(1);
  const [slug, setSlug] = useState<string | undefined>();

  useEffect(() => {
    fetchMenuItem(id)
      .then((data) => {
        setItem(data);
        if (!data) return;
        fetchCategories()
          .then((cs) => setSlug(cs.find((c) => c.id === data.category_id)?.slug))
          .catch(() => {});
        const defaults: Record<string, string[]> = {};
        for (const o of data.item_options) {
          const first = o.option_choices.find((c) => c.available);
          if (o.required && first) defaults[o.id] = [first.id];
        }
        setPicked(defaults);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const unitKobo = useMemo(() => {
    if (!item) return 0;
    const delta = item.item_options
      .flatMap((o) => o.option_choices)
      .filter((c) => Object.values(picked).some((ids) => ids.includes(c.id)))
      .reduce((s, c) => s + c.price_delta_kobo, 0);
    return item.price_kobo + delta;
  }, [item, picked]);

  if (loading) return <ActivityIndicator style={styles.center} color={colors.primary} />;
  if (error || !item) return <Text style={[styles.center, styles.error]}>{error ?? 'Item not found.'}</Text>;

  const toggle = (optionId: string, choiceId: string, max: number) =>
    setPicked((prev) => {
      const cur = prev[optionId] ?? [];
      if (max === 1) return { ...prev, [optionId]: [choiceId] };
      if (cur.includes(choiceId)) return { ...prev, [optionId]: cur.filter((c) => c !== choiceId) };
      if (cur.length >= max) return prev;
      return { ...prev, [optionId]: [...cur, choiceId] };
    });

  const missingRequired = item.item_options.some((o) => o.required && !(picked[o.id]?.length));

  const add = () => {
    addLine({
      itemId: item.id,
      name: item.name,
      basePriceKobo: item.price_kobo,
      qty,
      choices: item.item_options.flatMap((o) =>
        o.option_choices
          .filter((c) => picked[o.id]?.includes(c.id))
          .map((c) => ({ optionName: o.name, choiceId: c.id, name: c.name, priceDeltaKobo: c.price_delta_kobo })),
      ),
    });
    goBack(router);
  };

  return (
    <Screen style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Pressable onPress={() => goBack(router)}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <ItemImage uri={item.image_url} categorySlug={slug} height={180} />
        <Text style={styles.name}>{item.name}</Text>
        {item.description ? <Text style={styles.muted}>{item.description}</Text> : null}
        <Text style={styles.price}>{formatNaira(item.price_kobo)}</Text>

        {item.item_options.map((o) => (
          <View key={o.id} style={styles.group}>
            <Text style={styles.groupTitle}>
              {o.name}
              <Text style={styles.muted}>
                {o.required ? '  Required' : o.max_choices > 1 ? `  Up to ${o.max_choices}` : '  Optional'}
              </Text>
            </Text>
            {o.option_choices
              .filter((c) => c.available)
              .map((c) => {
                const on = picked[o.id]?.includes(c.id);
                return (
                  <Pressable key={c.id} style={styles.choice} onPress={() => toggle(o.id, c.id, o.max_choices)}>
                    <View style={[styles.mark, o.max_choices > 1 && styles.markSquare, on && styles.markOn]} />
                    <Text style={styles.choiceName}>{c.name}</Text>
                    {c.price_delta_kobo > 0 ? <Text style={styles.muted}>+{formatNaira(c.price_delta_kobo)}</Text> : null}
                  </Pressable>
                );
              })}
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.stepper}>
          <Pressable onPress={() => setQty((q) => Math.max(1, q - 1))} style={styles.stepBtn}>
            <Text style={styles.stepText}>−</Text>
          </Pressable>
          <Text style={styles.qty}>{qty}</Text>
          <Pressable onPress={() => setQty((q) => q + 1)} style={styles.stepBtn}>
            <Text style={styles.stepText}>+</Text>
          </Pressable>
        </View>
        <View style={styles.addBtn}>
          <Button title={`Add · ${formatNaira(unitKobo * qty)}`} onPress={add} disabled={missingRequired} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, textAlignVertical: 'center', textAlign: 'center' },
  error: { color: colors.danger },
  scroll: { padding: 16, gap: 8 },
  back: { color: colors.primary, fontSize: 17, fontWeight: '600', marginBottom: 8 },
  name: { color: colors.text, fontSize: 26, fontWeight: '800' },
  muted: { color: colors.textMuted, fontSize: 14, fontWeight: '400' },
  price: { color: colors.primary, fontSize: 18, fontWeight: '700', marginBottom: 8 },
  group: { backgroundColor: colors.surface, borderRadius: 14, padding: 14, gap: 4, marginTop: 8, borderWidth: 1, borderColor: colors.border },
  groupTitle: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 6 },
  choice: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  choiceName: { color: colors.text, fontSize: 15, flex: 1 },
  mark: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.border },
  markSquare: { borderRadius: 5 },
  markOn: { borderColor: colors.primary, backgroundColor: colors.primary },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  stepText: { color: colors.text, fontSize: 20, fontWeight: '700' },
  qty: { color: colors.text, fontSize: 17, fontWeight: '700', minWidth: 20, textAlign: 'center' },
  addBtn: { flex: 1 },
});
