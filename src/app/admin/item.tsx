import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { OptionEditor } from '@/components/admin/OptionEditor';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import {
  addOption,
  createItem,
  deleteItem,
  fetchAllCategories,
  fetchItemForEdit,
  koboToNairaText,
  nairaToKobo,
  pickAndUploadPhoto,
  updateItem,
  type Category,
} from '@/lib/adminMenu';
import { confirmAction } from '@/lib/confirm';
import type { MenuItemDetail } from '@/lib/menu';
import { goBack } from '@/lib/navigation';
import { colors } from '@/theme/colors';

export default function AdminItem() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [item, setItem] = useState<MenuItemDetail | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [featured, setFeatured] = useState(false);
  const [available, setAvailable] = useState(true);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const cats = await fetchAllCategories();
      setCategories(cats);
      if (!id) {
        setCategoryId((cur) => cur ?? cats[0]?.id ?? null);
        return;
      }
      const data = await fetchItemForEdit(id);
      if (!data) throw new Error('Item not found');
      setItem(data);
      setName(data.name);
      setDescription(data.description ?? '');
      setPrice(koboToNairaText(data.price_kobo));
      setCategoryId(data.category_id);
      setFeatured(data.featured);
      setAvailable(data.available);
      setImageUrl(data.image_url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load item');
    } finally {
      setLoading(false);
    }
  }, [id]);
  useEffect(() => {
    load();
  }, [load]);

  // Only the option/choice lists need refreshing after an option edit, not the form fields.
  const reloadOptions = useCallback(() => {
    if (!id) return;
    fetchItemForEdit(id)
      .then((data) => data && setItem(data))
      .catch((e) => setError(e.message));
  }, [id]);

  const priceKobo = nairaToKobo(price);
  const canSave = name.trim().length > 0 && priceKobo !== null && categoryId !== null;

  const save = async () => {
    if (!canSave || priceKobo === null || categoryId === null) return;
    setSaving(true);
    setError(null);
    const fields = {
      name: name.trim(),
      description: description.trim() || null,
      price_kobo: priceKobo,
      category_id: categoryId,
      featured,
      available,
      image_url: imageUrl,
    };
    try {
      if (id) {
        await updateItem(id, fields);
        goBack(router);
      } else {
        // Stay on the item after creating it so options can be added right away.
        const newId = await createItem(fields);
        router.replace({ pathname: '/admin/item', params: { id: newId } });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  const changePhoto = async () => {
    setUploading(true);
    setError(null);
    try {
      const url = await pickAndUploadPhoto();
      if (url) setImageUrl(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not upload photo');
    } finally {
      setUploading(false);
    }
  };

  const remove = () =>
    confirmAction('Delete item', `Delete "${name}"? Past orders keep their line items.`, async () => {
      try {
        if (id) await deleteItem(id);
        goBack(router);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not delete');
      }
    });

  if (loading) return <ActivityIndicator style={styles.center} color={colors.primary} />;

  return (
    <Screen style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => goBack(router)}>
            <Text style={styles.back}>‹ Back</Text>
          </Pressable>
          <Text style={styles.title}>{id ? 'Edit item' : 'New item'}</Text>

          {imageUrl ? <Image source={{ uri: imageUrl }} style={styles.photo} contentFit="cover" /> : null}
          <Button title={imageUrl ? 'Change photo' : 'Add photo'} variant="ghost" loading={uploading} onPress={changePhoto} />

          <TextField label="Name" value={name} onChangeText={setName} />
          <TextField label="Description" value={description} onChangeText={setDescription} multiline style={styles.multiline} />
          <TextField label="Price (₦)" value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="2500" />

          <Text style={styles.label}>Category</Text>
          <View style={styles.chips}>
            {categories.map((c) => (
              <Pressable key={c.id} onPress={() => setCategoryId(c.id)} style={[styles.chip, categoryId === c.id && styles.chipOn]}>
                <Text style={[styles.chipText, categoryId === c.id && styles.chipTextOn]}>{c.name}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.row}>
            <Text style={styles.rowText}>Featured on home</Text>
            <Switch value={featured} onValueChange={setFeatured} trackColor={{ true: colors.primary }} />
          </View>
          <View style={styles.row}>
            <Text style={styles.rowText}>Available</Text>
            <Switch value={available} onValueChange={setAvailable} trackColor={{ true: colors.primary }} />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button title={id ? 'Save changes' : 'Create item'} onPress={save} loading={saving} disabled={!canSave} />
          {id ? (
            <Pressable onPress={remove}>
              <Text style={styles.remove}>Delete item</Text>
            </Pressable>
          ) : null}

          {item ? (
            <>
              <Text style={styles.section}>Options</Text>
              <Text style={styles.muted}>e.g. Protein: Chicken / Beef +₦500. Changes here save on their own.</Text>
              {item.item_options.map((o) => (
                <OptionEditor key={o.id} option={o} onChanged={reloadOptions} onError={setError} />
              ))}
              <Button
                title="Add option"
                variant="ghost"
                onPress={() => addOption(item.id).then(reloadOptions).catch((e) => setError(e.message))}
              />
            </>
          ) : (
            <Text style={styles.muted}>Create the item first, then you can add options.</Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1 },
  scroll: { padding: 16, gap: 12 },
  back: { color: colors.primary, fontSize: 16 },
  title: { color: colors.text, fontSize: 28, fontWeight: '800' },
  photo: { width: '100%', height: 180, borderRadius: 12 },
  multiline: { height: 96, paddingTop: 14, textAlignVertical: 'top' },
  label: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textMuted, fontWeight: '600' },
  chipTextOn: { color: colors.text },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowText: { color: colors.text, fontSize: 16 },
  section: { color: colors.text, fontSize: 20, fontWeight: '800', marginTop: 12 },
  muted: { color: colors.textMuted, fontSize: 14 },
  error: { color: colors.danger, fontSize: 14 },
  remove: { color: colors.danger, fontWeight: '700', textAlign: 'center' },
});
