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

  const { tx_ref } = await req.json().catch(() => ({}));
  if (!tx_ref) return json({ error: 'tx_ref is required' }, 400);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: payment } = await admin
    .from('payments')
    .select('id, order_id, status, amount_kobo')
    .eq('reference', tx_ref)
    .maybeSingle();
  if (!payment) return json({ error: 'Payment not found' }, 404);

  const { data: order } = await admin.from('orders').select('id, user_id').eq('id', payment.order_id).single();
  if (!order || order.user_id !== user.id) return json({ error: 'Payment not found' }, 404);

  if (payment.status === 'successful') return json({ status: 'successful', order_id: order.id });

  const res = await fetch(
    `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(tx_ref)}`,
    { headers: { Authorization: `Bearer ${secret}` } },
  );
  const body = await res.json().catch(() => null);
  const tx = body?.data;

  // No transaction yet (customer hasn't finished paying) -> still pending.
  if (!res.ok || !tx) return json({ status: 'pending', order_id: order.id });

  const ok =
    tx.status === 'successful' &&
    tx.tx_ref === tx_ref &&
    tx.currency === 'NGN' &&
    Number(tx.amount) * 100 >= payment.amount_kobo;

  if (ok) {
    await admin.from('payments').update({ status: 'successful' }).eq('id', payment.id);
    await admin.from('orders').update({ payment_status: 'paid' }).eq('id', order.id);
    return json({ status: 'successful', order_id: order.id });
  }
  if (tx.status === 'failed' || tx.status === 'cancelled') {
    await admin.from('payments').update({ status: 'failed' }).eq('id', payment.id);
    return json({ status: 'failed', order_id: order.id });
  }
  return json({ status: 'pending', order_id: order.id });
});
