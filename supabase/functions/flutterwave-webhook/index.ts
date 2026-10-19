import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const text = (body: string, status = 200) => new Response(body, { status });

// Constant-time string compare so the hash can't be probed byte by byte.
function safeEqual(a: string, b: string) {
  const ea = new TextEncoder().encode(a);
  const eb = new TextEncoder().encode(b);
  if (ea.length !== eb.length) return false;
  let diff = 0;
  for (let i = 0; i < ea.length; i++) diff |= ea[i] ^ eb[i];
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return text('method not allowed', 405);

  const secret = Deno.env.get('FLW_SECRET_KEY');
  const hash = Deno.env.get('FLW_WEBHOOK_HASH');
  if (!secret || !hash) return text('not configured', 500);

  const sent = req.headers.get('verif-hash') ?? '';
  if (!safeEqual(sent, hash)) return text('invalid signature', 401);

  const event = await req.json().catch(() => null);
  const data = event?.data;
  // Acknowledge events we don't act on so Flutterwave doesn't keep retrying them.
  if (event?.event !== 'charge.completed' || !data?.id || !data?.tx_ref) return text('ignored');

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: payment } = await admin
    .from('payments')
    .select('id, order_id, status, amount_kobo')
    .eq('reference', data.tx_ref)
    .maybeSingle();
  if (!payment) return text('unknown reference');
  if (payment.status === 'successful') return text('already processed');

  // Never trust the webhook body: re-check the transaction with Flutterwave.
  const res = await fetch(`https://api.flutterwave.com/v3/transactions/${encodeURIComponent(data.id)}/verify`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  const tx = (await res.json().catch(() => null))?.data;
  if (!res.ok || !tx) return text('verification failed', 502);

  const ok =
    tx.status === 'successful' &&
    tx.tx_ref === data.tx_ref &&
    tx.currency === 'NGN' &&
    Number(tx.amount) * 100 >= payment.amount_kobo;

  if (ok) {
    await admin.from('payments').update({ status: 'successful' }).eq('id', payment.id);
    await admin.from('orders').update({ payment_status: 'paid' }).eq('id', payment.order_id);
  } else if (tx.status === 'failed' || tx.status === 'cancelled') {
    await admin.from('payments').update({ status: 'failed' }).eq('id', payment.id);
  }
  return text('ok');
});
