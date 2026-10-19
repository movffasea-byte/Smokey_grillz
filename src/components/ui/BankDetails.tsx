import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/colors';
import type { StoreSettings } from '@/lib/checkout';

export function BankDetails({ store, reference }: { store: StoreSettings | null; reference?: string }) {
  if (!store?.account_number) {
    return <Text style={styles.muted}>Bank details are not available yet. Please contact us to pay by transfer.</Text>;
  }
  return (
    <View style={styles.box}>
      <Text style={styles.label}>Bank</Text>
      <Text style={styles.value}>{store.bank_name}</Text>
      <Text style={styles.label}>Account number</Text>
      <Text style={styles.value} selectable>
        {store.account_number}
      </Text>
      <Text style={styles.label}>Account name</Text>
      <Text style={styles.value}>{store.account_name}</Text>
      <Text style={styles.muted}>
        {reference ? `Use #${reference} as the payment reference. ` : 'Use your order number as the payment reference after placing the order. '}
        We confirm your order once the transfer is received.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: colors.surface, borderRadius: 14, padding: 14, gap: 4, borderWidth: 1, borderColor: colors.border },
  label: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
  value: { color: colors.text, fontSize: 16, fontWeight: '700' },
  muted: { color: colors.textMuted, fontSize: 14, marginTop: 8 },
});
