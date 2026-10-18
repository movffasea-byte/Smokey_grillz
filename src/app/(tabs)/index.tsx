import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ClosedBanner } from '@/components/ui/ClosedBanner';
import { Glass, TAB_BAR_SPACE } from '@/components/ui/Glass';
import { ItemImage } from '@/components/ui/ItemImage';
import { Screen } from '@/components/ui/Screen';
import { fetchCategories, fetchMenuItems, formatNaira, type Category, type MenuItem } from '@/lib/menu';
import { useStoreOpen } from '@/lib/useStoreStatus';
import { useCart } from '@/providers/cart';
import { colors } from '@/theme/colors';

export default function Menu() {
  const router = useRouter();
  const storeOpen = useStoreOpen();
  const { count, subtotalKobo } = useCart();
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchCategories(), fetchMenuItems()])
      .then(([c, i]) => {
        setCategories(c);
        setItems(i);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const slugById = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c.slug])), [categories]);
  const visible = useMemo(
    () => (selected ? items.filter((i) => i.category_id === selected) : items),
    [items, selected],
  );
  const featured = items.find((i) => i.featured) ?? items[0];

  const openItem = (id: string) => router.push({ pathname: '/item/[id]', params: { id } });

  if (loading) return <ActivityIndicator style={styles.center} color={colors.primary} />;
  if (error) return <Text style={[styles.center, styles.error]}>{error}</Text>;

  const header = (
    <View style={styles.header}>
      <View style={styles.brand}>
        <Image source={require('@/assets/logo.png')} style={styles.logo} contentFit="contain" />
        <View>
          <Text style={styles.eyebrow}>Kaduna's grill spot</Text>
          <Text style={styles.title}>Smokey Grillz</Text>
        </View>
      </View>
      {storeOpen ? null : <ClosedBanner />}

      <View style={styles.bento}>
        {featured ? (
          <Pressable style={styles.featuredWrap} onPress={() => openItem(featured.id)}>
            <Glass style={styles.featured}>
              <Text style={styles.tag}>FEATURED</Text>
              <View style={styles.featuredImage}>
                <ItemImage uri={featured.image_url} categorySlug={slugById[featured.category_id]} height={90} />
              </View>
              <Text style={styles.name} numberOfLines={2}>
                {featured.name}
              </Text>
              <Text style={styles.price}>{formatNaira(featured.price_kobo)}</Text>
            </Glass>
          </Pressable>
        ) : null}

        <View style={styles.side}>
          <Glass style={styles.sideTile}>
            <Text style={styles.tag}>STORE</Text>
            <Text style={[styles.sideValue, { color: storeOpen ? colors.success : colors.danger }]}>
              {storeOpen ? 'Open' : 'Closed'}
            </Text>
            <Text style={styles.muted}>{storeOpen ? 'Taking orders' : 'Back soon'}</Text>
          </Glass>
          <Pressable style={styles.sideWrap} onPress={() => router.push('/cart')}>
            <Glass style={styles.sideTile}>
              <Text style={styles.tag}>CART</Text>
              <Text style={styles.sideValue}>{count}</Text>
              <Text style={styles.muted}>{count > 0 ? formatNaira(subtotalKobo) : 'Empty'}</Text>
            </Glass>
          </Pressable>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <Chip label="All" active={selected === null} onPress={() => setSelected(null)} />
        {categories.map((c) => (
          <Chip key={c.id} label={c.name} active={selected === c.id} onPress={() => setSelected(c.id)} />
        ))}
      </ScrollView>
    </View>
  );

  return (
    <Screen edges={['top']}>
      <FlatList
        data={visible}
        numColumns={2}
        keyExtractor={(i) => i.id}
        ListHeaderComponent={header}
        contentContainerStyle={styles.list}
        columnWrapperStyle={styles.columns}
        ListEmptyComponent={<Text style={styles.muted}>Nothing here yet.</Text>}
        renderItem={({ item }) => (
          <Pressable style={styles.cardWrap} onPress={() => openItem(item.id)}>
            <Glass style={styles.card}>
              <ItemImage uri={item.image_url} categorySlug={slugById[item.category_id]} height={96} />
              <Text style={styles.name} numberOfLines={2}>
                {item.name}
              </Text>
              <Text style={styles.price}>{formatNaira(item.price_kobo)}</Text>
            </Glass>
          </Pressable>
        )}
      />
    </Screen>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, textAlignVertical: 'center', textAlign: 'center' },
  error: { color: colors.danger },
  header: { gap: 12, paddingBottom: 4 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logo: { width: 56, height: 56 },
  eyebrow: { color: colors.textMuted, fontSize: 13, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' },
  title: { color: colors.text, fontSize: 30, fontWeight: '800' },
  bento: { flexDirection: 'row', gap: 12 },
  featuredWrap: { flex: 3 },
  featured: { flex: 1, padding: 12, gap: 6, borderColor: 'rgba(232,112,10,0.55)' },
  featuredImage: { marginVertical: 4 },
  side: { flex: 2, gap: 12 },
  sideWrap: { flex: 1 },
  sideTile: { flex: 1, padding: 12, gap: 2, justifyContent: 'center' },
  sideValue: { color: colors.text, fontSize: 24, fontWeight: '800' },
  tag: { color: colors.primary, fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  chips: { gap: 8, paddingVertical: 4 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textMuted, fontWeight: '600' },
  chipTextActive: { color: colors.text },
  list: { padding: 16, paddingBottom: TAB_BAR_SPACE, gap: 12 },
  columns: { justifyContent: 'space-between', gap: 12 },
  cardWrap: { flexBasis: '48%', flexGrow: 0, maxWidth: '48%' },
  card: { padding: 10, gap: 6 },
  name: { color: colors.text, fontSize: 15, fontWeight: '700' },
  muted: { color: colors.textMuted, fontSize: 13 },
  price: { color: colors.primary, fontSize: 15, fontWeight: '700' },
});
