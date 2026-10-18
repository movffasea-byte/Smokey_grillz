import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/colors';

export function ClosedBanner() {
  return (
    <View style={styles.banner}>
      <Text style={styles.text}>We're not taking orders right now. You can still browse the menu.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { marginHorizontal: 16, marginTop: 8, padding: 12, borderRadius: 12, backgroundColor: colors.danger },
  text: { color: colors.text, fontSize: 14, fontWeight: '600', textAlign: 'center' },
});
