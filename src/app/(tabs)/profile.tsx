import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { useAuth } from '@/providers/auth';
import { colors } from '@/theme/colors';

export default function Profile() {
  const { session, profile, isStaff, signOut } = useAuth();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.name}>{profile?.full_name ?? 'Smokey Grillz customer'}</Text>
        <Text style={styles.line}>{session?.user.email}</Text>
        {profile?.phone ? <Text style={styles.line}>{profile.phone}</Text> : null}
        {isStaff ? <Text style={styles.badge}>{profile?.role}</Text> : null}
      </View>
      <Button title="Sign out" variant="ghost" onPress={signOut} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 24 },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 20, gap: 6 },
  name: { color: colors.text, fontSize: 22, fontWeight: '800' },
  line: { color: colors.textMuted, fontSize: 15 },
  badge: { color: colors.primary, fontSize: 13, fontWeight: '700', textTransform: 'uppercase' },
});
