import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { colors } from '@/theme/colors';

export default function Welcome() {
  const router = useRouter();

  return (
    <Screen style={styles.container}>
      <View style={styles.hero}>
        <Image source={require('@/assets/logo.png')} style={styles.logo} contentFit="contain" />
        <Text style={styles.title}>Smokey Grillz</Text>
        <Text style={styles.subtitle}>Shawarma, loaded fries, gas meat, noodles and masa. Fresh off the grill.</Text>
      </View>
      <View style={styles.actions}>
        <Button title="Create account" onPress={() => router.push('/sign-up')} />
        <Button title="Sign in" variant="ghost" onPress={() => router.push('/sign-in')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'space-between' },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  logo: { width: 220, height: 220 },
  title: { color: colors.primary, fontSize: 32, fontWeight: '800' },
  subtitle: { color: colors.textMuted, fontSize: 16, textAlign: 'center', paddingHorizontal: 16 },
  actions: { gap: 12 },
});
