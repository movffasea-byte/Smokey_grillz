import { supabase } from '@/lib/supabase';
import type { CartLine } from '@/providers/cart';
import type { Tables } from '@/types/database';

export type DeliveryZone = Tables<'delivery_zones'>;
export type StoreSettings = Tables<'store_settings'>;

export async function fetchDeliveryZones(): Promise<DeliveryZone[]> {
  const { data, error } = await supabase.from('delivery_zones').select('*').eq('active', true).order('fee_kobo');
  if (error) throw error;
  return data;
}

export async function fetchStoreSettings(): Promise<StoreSettings> {
  const { data, error } = await supabase.from('store_settings').select('*').eq('id', 1).single();
  if (error) throw error;
  return data;
}

type PlaceOrderArgs = {
  type: 'pickup' | 'delivery';
  lines: CartLine[];
  zoneId: string | null;
  addressLine: string;
  paymentMethod: 'cash' | 'transfer' | 'card';
  notes: string;
};

export async function placeOrder(a: PlaceOrderArgs): Promise<string> {
  const { data, error } = await supabase.rpc('place_order', {
    p_type: a.type,
    p_items: a.lines.map((l) => ({
      menu_item_id: l.itemId,
      qty: l.qty,
      choice_ids: l.choices.map((c) => c.choiceId),
    })),
    p_delivery_zone_id: a.type === 'delivery' ? (a.zoneId ?? undefined) : undefined,
    p_address: a.type === 'delivery' ? { line: a.addressLine.trim() } : undefined,
    p_payment_method: a.paymentMethod,
    p_notes: a.notes.trim() || undefined,
  });
  if (error) throw error;
  return data;
}
