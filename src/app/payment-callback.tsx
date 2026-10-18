import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { verifyPayment, type PaymentResult } from '@/lib/payments';
import { colors } from '@/theme/colors';

export default function PaymentCallback() {
  const { tx_ref } = useLocalSearchParams<{ tx_ref?: string }>();
  const router = useRouter();
  const [status, setStatus] = useState<PaymentResult | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tx_ref) {
      setError('Missing payment reference.');
      return;
    }
    verifyPayment(tx_ref)
      .then((r) => {
        setStatus(r.status);
        setOrderId(r.order_id);
      })
      .catch((e) => setError(e.message));
  }, [tx_ref]);

  const goToOrder = () =>
    orderId ? router.replace({ pathname: '/order/[id]', params: { id: orderId } }) : router.replace('/');

  if (!status && !error) return <ActivityIndicator style={styles.center} color={colors.primary} />;

  return (
    <Screen style={styles.container}>
      <Text style={styles.title}>
        {error ? 'Something went wrong' : status === 'successful' ? 'Payment received 🎉' : status === 'failed' ? 'Payment failed' : 'Payment not confirmed yet'}
      </Text>
      <Text style={styles.muted}>
        {error ??
          (status === 'successful'
            ? 'Thank you! Your order is being prepared.'
            : 'You can retry from your order page.')}
      </Text>
      <View style={styles.full}>
        <Button title={orderId ? 'View order' : 'Back to menu'} onPress={goToOrder} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  center: { flex: 1 },
  title: { color: colors.text, fontSize: 24, fontWeight: '800', textAlign: 'center' },
  muted: { color: colors.textMuted, fontSize: 15, textAlign: 'center' },
  full: { alignSelf: 'stretch', marginTop: 12 },
});
