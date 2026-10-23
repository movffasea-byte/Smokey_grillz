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

export type StaffOrder = Order & {
  order_items: OrderItem[];
  profiles: { full_name: string | null; phone: string | null } | null;
  claimer: { full_name: string | null } | null;
};

export const ACTIVE_STATUSES = ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery'] as const;

// Next status in the kitchen flow; pickup orders skip out_for_delivery.
export function nextStatus(order: Pick<Order, 'status' | 'type'>): { status: string; label: string } | null {
  switch (order.status) {
    case 'pending':
      return { status: 'confirmed', label: 'Confirm' };
    case 'confirmed':
      return { status: 'preparing', label: 'Start preparing' };
    case 'preparing':
      return { status: 'ready', label: 'Mark ready' };
    case 'ready':
      return order.type === 'delivery'
        ? { status: 'out_for_delivery', label: 'Out for delivery' }
        : { status: 'completed', label: 'Complete' };
    case 'out_for_delivery':
      return { status: 'completed', label: 'Complete' };
    default:
      return null;
  }
}

export async function fetchStaffOrders(): Promise<StaffOrder[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*), profiles!orders_user_id_fkey(full_name, phone), claimer:profiles!orders_claimed_by_fkey(full_name)')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return data as unknown as StaffOrder[];
}

export async function setOrderStatus(id: string, status: string) {
  const { error } = await supabase.from('orders').update({ status }).eq('id', id);
  if (error) throw error;
}

export async function claimOrder(id: string) {
  const { error } = await supabase.rpc('claim_order', { p_order_id: id });
  if (error) throw error;
}

export async function releaseOrder(id: string) {
  const { error } = await supabase.rpc('release_order', { p_order_id: id });
  if (error) throw error;
}

// Staff may only work claimed orders they hold themselves; admins can act on any order.
export function canWorkOrder(order: Pick<Order, 'claimed_by'>, userId: string | undefined, isAdmin: boolean) {
  return isAdmin || (!!userId && order.claimed_by === userId);
}

export async function markOrderPaid(id: string) {
  const { error } = await supabase.from('orders').update({ payment_status: 'paid' }).eq('id', id);
  if (error) throw error;
}

// Calls onInsert with each newly placed order (staff only: RLS limits non-staff to their own orders).
export function subscribeToNewOrders(onInsert: (order: Order) => void): () => void {
  const channel = supabase
    .channel(`new-orders-${Math.random().toString(36).slice(2)}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (p) => onInsert(p.new as Order))
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
