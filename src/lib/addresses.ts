import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/database';

export type Address = Tables<'addresses'>;

export async function fetchAddresses(): Promise<Address[]> {
  const { data, error } = await supabase.from('addresses').select('*').order('label');
  if (error) throw error;
  return data;
}

export async function addAddress(userId: string, label: string, line: string, area: string): Promise<void> {
  const { error } = await supabase
    .from('addresses')
    .insert({ user_id: userId, label: label.trim() || null, line: line.trim(), area: area.trim() || null });
  if (error) throw error;
}

export async function deleteAddress(id: string): Promise<void> {
  const { error } = await supabase.from('addresses').delete().eq('id', id);
  if (error) throw error;
}
