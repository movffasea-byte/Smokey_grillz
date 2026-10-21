import * as ImagePicker from 'expo-image-picker';

import type { ItemOption, MenuItemDetail } from '@/lib/menu';
import { supabase } from '@/lib/supabase';
import type { Tables, TablesInsert } from '@/types/database';

export type Category = Tables<'categories'>;
export type MenuItem = Tables<'menu_items'>;

// "1500" or "1,500.50" naira -> kobo. Returns null when it is not a valid non-negative amount.
export function nairaToKobo(text: string): number | null {
  const n = Number(text.replace(/,/g, '').trim());
  if (!text.trim() || !Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

export function koboToNairaText(kobo: number): string {
  return String(kobo / 100);
}

// ---------- Categories ----------
export async function fetchAllCategories(): Promise<Category[]> {
  const { data, error } = await supabase.from('categories').select('*').order('sort').order('name');
  if (error) throw error;
  return data;
}

function slugify(name: string) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'category';
}

export async function addCategory(name: string, sort: number): Promise<void> {
  const base = slugify(name);
  let { error } = await supabase.from('categories').insert({ name: name.trim(), slug: base, sort });
  // 23505 = slug already taken
  if (error?.code === '23505') {
    ({ error } = await supabase
      .from('categories')
      .insert({ name: name.trim(), slug: `${base}-${Date.now().toString(36).slice(-4)}`, sort }));
  }
  if (error) throw error;
}

export async function updateCategory(id: string, fields: { name?: string; active?: boolean }): Promise<void> {
  const { error } = await supabase.from('categories').update(fields).eq('id', id);
  if (error) throw error;
}

// Persists the given order by rewriting `sort` as the list index.
export async function saveCategoryOrder(ordered: Category[]): Promise<void> {
  const results = await Promise.all(
    ordered.map((c, i) => supabase.from('categories').update({ sort: i + 1 }).eq('id', c.id)),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;
}

// ---------- Items ----------
export async function fetchAllItems(): Promise<MenuItem[]> {
  const { data, error } = await supabase.from('menu_items').select('*').order('name');
  if (error) throw error;
  return data;
}

export async function fetchItemForEdit(id: string): Promise<MenuItemDetail | null> {
  const { data, error } = await supabase
    .from('menu_items')
    .select('*, item_options(*, option_choices(*))')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export type ItemFields = Pick<
  TablesInsert<'menu_items'>,
  'name' | 'description' | 'price_kobo' | 'category_id' | 'featured' | 'available' | 'image_url'
>;

export async function createItem(fields: ItemFields): Promise<string> {
  const { data, error } = await supabase.from('menu_items').insert(fields).select('id').single();
  if (error) throw error;
  return data.id;
}

export async function updateItem(id: string, fields: Partial<ItemFields>): Promise<void> {
  const { error } = await supabase.from('menu_items').update(fields).eq('id', id);
  if (error) throw error;
}

export async function deleteItem(id: string): Promise<void> {
  const { error } = await supabase.from('menu_items').delete().eq('id', id);
  if (error) throw error;
}

// ---------- Options and choices ----------
export async function addOption(itemId: string): Promise<void> {
  const { error } = await supabase.from('item_options').insert({ item_id: itemId, name: 'New option' });
  if (error) throw error;
}

export async function updateOption(
  id: string,
  fields: Partial<Pick<ItemOption, 'name' | 'required' | 'max_choices'>>,
): Promise<void> {
  const { error } = await supabase.from('item_options').update(fields).eq('id', id);
  if (error) throw error;
}

export async function deleteOption(id: string): Promise<void> {
  const { error } = await supabase.from('item_options').delete().eq('id', id);
  if (error) throw error;
}

export async function addChoice(optionId: string): Promise<void> {
  const { error } = await supabase.from('option_choices').insert({ option_id: optionId, name: 'New choice' });
  if (error) throw error;
}

export async function updateChoice(
  id: string,
  fields: { name?: string; price_delta_kobo?: number; available?: boolean },
): Promise<void> {
  const { error } = await supabase.from('option_choices').update(fields).eq('id', id);
  if (error) throw error;
}

export async function deleteChoice(id: string): Promise<void> {
  const { error } = await supabase.from('option_choices').delete().eq('id', id);
  if (error) throw error;
}

// ---------- Photos ----------
// Lets the admin pick a photo, uploads it to the public menu-images bucket and returns its URL.
// Returns null when the picker is cancelled.
export async function pickAndUploadPhoto(): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.6, // JPEG compression keeps phone photos small
  });
  if (result.canceled) return null;

  const body = await (await fetch(result.assets[0].uri)).arrayBuffer();
  const path = `items/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const { error } = await supabase.storage.from('menu-images').upload(path, body, { contentType: 'image/jpeg' });
  if (error) throw error;
  return supabase.storage.from('menu-images').getPublicUrl(path).data.publicUrl;
}
