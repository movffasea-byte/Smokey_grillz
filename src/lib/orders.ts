import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/database';

export type Order = Tables<'orders'>;
export type OrderItem = Tables<'order_items'>;
export type OrderEvent = Tables<'order_events'>;
export type OrderDetail = Order & { order_items: OrderItem[]; order_events: OrderEvent[] };

export const STATUS_LABEL: Record<string, string> = {
  pending: 'Order received',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  ready: 'Ready',
  out_for_delivery: 'Out for delivery',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const statusLabel = (s: string) => STATUS_LABEL[s] ?? s;

export async function fetchOrders(): Promise<Order[]> {
  const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchOrder(id: string): Promise<OrderDetail | null> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*), order_events(*)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// Calls onChange whenever any of the signed-in user's orders change. Returns an unsubscribe fn.
export function subscribeToOrders(onChange: () => void): () => void {
  const channel = supabase
    .channel(`orders-${Math.random().toString(36).slice(2)}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, onChange)
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
