import { supabase } from '@/lib/supabase';
import type { Json, Tables, TablesUpdate } from '@/types/database';

export type StoreSettings = Tables<'store_settings'>;
export type DeliveryZone = Tables<'delivery_zones'>;
export type Profile = Tables<'profiles'>;

// ---------- Store settings ----------
export type StoreFields = Pick<
  TablesUpdate<'store_settings'>,
  'accepting_orders' | 'phone' | 'whatsapp' | 'instagram' | 'address' | 'bank_name' | 'account_number' | 'account_name' | 'hours'
>;

export async function updateStoreSettings(fields: StoreFields): Promise<void> {
  const { error } = await supabase.from('store_settings').update(fields).eq('id', 1);
  if (error) throw error;
}

// ---------- Opening hours (shape is read by the store_open_now() SQL function) ----------
export const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type DayKey = (typeof DAYS)[number];
export type DayHours = { open: string; close: string; closed: boolean };
export type Hours = Record<DayKey, DayHours>;

export const DAY_LABEL: Record<DayKey, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};

const DEFAULT_DAY: DayHours = { open: '10:00', close: '22:00', closed: false };

export function parseHours(json: Json): Hours {
  const src = (json && typeof json === 'object' && !Array.isArray(json) ? json : {}) as Record<string, Partial<DayHours>>;
  return Object.fromEntries(
    DAYS.map((d) => [d, { ...DEFAULT_DAY, ...(src[d] ?? {}) }]),
  ) as Hours;
}

export const isValidTime = (t: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t.trim());

// ---------- Delivery zones ----------
export async function fetchAllZones(): Promise<DeliveryZone[]> {
  const { data, error } = await supabase.from('delivery_zones').select('*').order('fee_kobo');
  if (error) throw error;
  return data;
}

export async function addZone(name: string, feeKobo: number): Promise<void> {
  const { error } = await supabase.from('delivery_zones').insert({ name: name.trim(), fee_kobo: feeKobo });
  if (error) throw error;
}

export async function updateZone(
  id: string,
  fields: { name?: string; fee_kobo?: number; active?: boolean },
): Promise<void> {
  const { error } = await supabase.from('delivery_zones').update(fields).eq('id', id);
  if (error) throw error;
}

// Orders keep a reference to the zone, so zones that were used can only be switched off.
export async function deleteZone(id: string): Promise<void> {
  const { error } = await supabase.from('delivery_zones').delete().eq('id', id);
  if (error) throw error;
}

// ---------- Roles ----------
export async function fetchProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('role')
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw error;
  return data;
}

export async function setUserRole(userId: string, role: 'customer' | 'staff' | 'admin'): Promise<void> {
  const { error } = await supabase.rpc('set_user_role', { p_user_id: userId, p_role: role });
  if (error) throw error;
}
