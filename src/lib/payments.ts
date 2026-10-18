import { createURL } from 'expo-linking';
import { openAuthSessionAsync } from 'expo-web-browser';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

export type PaymentResult = 'successful' | 'failed' | 'pending' | 'redirecting';

async function invoke<T>(fn: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(fn, { body });
  if (error) {
    const res = (error as { context?: Response }).context;
    const detail = res ? await res.json().catch(() => null) : null;
    throw new Error(detail?.error ?? error.message);
  }
  return data as T;
}

export async function verifyPayment(txRef: string): Promise<{ status: PaymentResult; order_id: string }> {
  return invoke('flutterwave-verify', { tx_ref: txRef });
}

// Starts a Flutterwave payment for a card order. On web the page navigates to Flutterwave and comes
// back to /payment-callback; on native an in-app browser opens and we verify when it closes.
export async function payForOrder(orderId: string): Promise<PaymentResult> {
  const redirectUrl = createURL('payment-callback');
  const { link, tx_ref } = await invoke<{ link: string; tx_ref: string }>('flutterwave-init', {
    order_id: orderId,
    redirect_url: redirectUrl,
  });

  if (Platform.OS === 'web') {
    window.location.assign(link);
    return 'redirecting';
  }
  await openAuthSessionAsync(link, redirectUrl);
  return (await verifyPayment(tx_ref)).status;
}
