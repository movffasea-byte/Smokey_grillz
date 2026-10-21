import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/database';

export type Category = Tables<'categories'>;
export type MenuItem = Tables<'menu_items'>;
export type OptionChoice = Tables<'option_choices'>;
export type ItemOption = Tables<'item_options'> & { option_choices: OptionChoice[] };
export type MenuItemDetail = MenuItem & { item_options: ItemOption[] };

export function formatNaira(kobo: number): string {
  return `₦${(kobo / 100).toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;
}

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase.from('categories').select('*').eq('active', true).order('sort');
  if (error) throw error;
  return data;
}

export async function fetchMenuItems(): Promise<MenuItem[]> {
  const { data, error } = await supabase.from('menu_items').select('*').order('name');
  if (error) throw error;
  return data;
}

export async function fetchMenuItem(id: string): Promise<MenuItemDetail | null> {
  const { data, error } = await supabase
    .from('menu_items')
    .select('*, item_options(*, option_choices(*))')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}
