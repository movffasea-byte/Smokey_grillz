import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const text = (body: string, status = 200) => new Response(body, { status });

// Constant-time string compare so the secret can't be probed byte by byte.
function safeEqual(a: string, b: string) {
  const ea = new TextEncoder().encode(a);
  const eb = new TextEncoder().encode(b);
  if (ea.length !== eb.length) return false;
  let diff = 0;
  for (let i = 0; i < ea.length; i++) diff |= ea[i] ^ eb[i];
  return diff === 0;
}

const CUSTOMER_MESSAGE: Record<string, string> = {
  confirmed: 'Your order is confirmed.',
  preparing: 'Your order is being prepared.',
  ready: 'Your order is ready.',
  out_for_delivery: 'Your order is on its way.',
  completed: 'Your order is complete. Enjoy!',
  cancelled: 'Your order was cancelled.',
};

type Push = { to: string; title: string; body: string; sound: 'default'; data: Record<string, string>; channelId: string };

Deno.serve(async (req) => {
  if (req.method !== 'POST') return text('method not allowed', 405);

  const secret = Deno.env.get('NOTIFY_SECRET');
  if (!secret) return text('not configured', 500);
  if (!safeEqual(req.headers.get('x-notify-secret') ?? '', secret)) return text('invalid secret', 401);

  const { kind, order_id } = await req.json().catch(() => ({}));
  if (!order_id || !['new_order', 'status'].includes(kind)) return text('ignored');

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: order } = await admin
    .from('orders')
    .select('id, user_id, status, type, total_kobo, payment_method, payment_status')
    .eq('id', order_id)
    .maybeSingle();
  if (!order) return text('unknown order');

  const ref = order.id.slice(0, 8).toUpperCase();
  const messages: Push[] = [];

  if (kind === 'new_order') {
    const { data: staff } = await admin
      .from('profiles')
      .select('push_token')
      .in('role', ['staff', 'admin'])
      .not('push_token', 'is', null);
    const total = `₦${(order.total_kobo / 100).toLocaleString('en-NG')}`;
    const paid = order.payment_method === 'card' ? ' · Paid by card' : '';
    // One message per device even if two staff accounts share a token.
    for (const token of new Set((staff ?? []).map((s) => s.push_token!))) {
      messages.push({
        to: token,
        title: 'New order',
        body: `#${ref} · ${total} · ${order.type === 'pickup' ? 'Pickup' : 'Delivery'}${paid}`,
        sound: 'default',
        data: { screen: 'staff', orderId: order.id },
        channelId: 'default',
      });
    }
  } else if (CUSTOMER_MESSAGE[order.status]) {
    const { data: customer } = await admin.from('profiles').select('push_token').eq('id', order.user_id).maybeSingle();
    if (customer?.push_token) {
      messages.push({
        to: customer.push_token,
        title: `Order #${ref}`,
        body: CUSTOMER_MESSAGE[order.status],
        sound: 'default',
        data: { orderId: order.id },
        channelId: 'default',
      });
    }
  }

  if (messages.length === 0) return text('no recipients');

  // Expo accepts at most 100 messages per request.
  const dead: string[] = [];
  for (let i = 0; i < messages.length; i += 100) {
    const batch = messages.slice(i, i + 100);
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(batch),
    });
    const tickets = (await res.json().catch(() => null))?.data;
    if (!Array.isArray(tickets)) {
      console.log('expo push failed', res.status);
      continue;
    }
    batch.forEach((m, j) => {
      if (tickets[j]?.details?.error === 'DeviceNotRegistered') dead.push(m.to);
    });
  }

  // Forget tokens Expo says are dead so we stop sending to them.
  if (dead.length) await admin.from('profiles').update({ push_token: null }).in('push_token', dead);
  return text('sent');
});
