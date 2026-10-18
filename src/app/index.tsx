import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/colors';

export default function Index() {
  return (
    <View style={styles.container}>
      <Image source={require('@/assets/logo.png')} style={styles.logo} contentFit="contain" />
      <Text style={styles.title}>Smokey Grillz</Text>
      <Text style={styles.subtitle}>App scaffold is running.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    gap: 12,
  },
  logo: { width: 200, height: 200 },
  title: { color: colors.primary, fontSize: 28, fontWeight: '800' },
  subtitle: { color: colors.textMuted, fontSize: 16 },
});
