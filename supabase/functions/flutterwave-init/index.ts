import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const secret = Deno.env.get('FLW_SECRET_KEY');
  if (!secret) return json({ error: 'Payments are not configured' }, 500);

  const authed = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const { data: userData } = await authed.auth.getUser();
  const user = userData.user;
  if (!user) return json({ error: 'Not signed in' }, 401);

  const { order_id, redirect_url } = await req.json().catch(() => ({}));
  if (!order_id || !redirect_url) return json({ error: 'order_id and redirect_url are required' }, 400);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: order } = await admin
    .from('orders')
    .select('id, user_id, total_kobo, payment_method, payment_status')
    .eq('id', order_id)
    .maybeSingle();
  if (!order || order.user_id !== user.id) return json({ error: 'Order not found' }, 404);
  if (order.payment_method !== 'card') return json({ error: 'Order is not a card order' }, 400);
  if (order.payment_status === 'paid') return json({ error: 'Order is already paid' }, 400);

  const tx_ref = `sg-${order.id}-${Date.now()}`;
  const { error: insErr } = await admin.from('payments').insert({
    order_id: order.id,
    provider: 'flutterwave',
    reference: tx_ref,
    status: 'pending',
    amount_kobo: order.total_kobo,
  });
  if (insErr) return json({ error: 'Could not start payment' }, 500);

  const res = await fetch('https://api.flutterwave.com/v3/payments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tx_ref,
      amount: order.total_kobo / 100,
      currency: 'NGN',
      redirect_url,
      customer: { email: user.email },
      payment_options: 'card',
      customizations: { title: 'Smokey Grillz' },
      meta: { order_id: order.id },
    }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || body?.status !== 'success' || !body?.data?.link) {
    await admin.from('payments').update({ status: 'failed' }).eq('reference', tx_ref);
    return json({ error: body?.message ?? 'Payment provider error' }, 502);
  }
  return json({ link: body.data.link, tx_ref });
});
