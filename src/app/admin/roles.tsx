import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { fetchProfiles, setUserRole, type Profile } from '@/lib/adminSettings';
import { goBack } from '@/lib/navigation';
import { useAuth } from '@/providers/auth';
import { colors } from '@/theme/colors';

const ROLES = ['customer', 'staff', 'admin'] as const;

export default function AdminRoles() {
  const router = useRouter();
  const { session } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetchProfiles()
      .then(setProfiles)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter((p) => `${p.full_name ?? ''} ${p.phone ?? ''}`.toLowerCase().includes(q));
  }, [profiles, query]);

  const change = async (p: Profile, role: (typeof ROLES)[number]) => {
    if (p.role === role) return;
    setBusyId(p.id);
    setError(null);
    try {
      await setUserRole(p.id, role);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not change role');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Screen style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => goBack(router)}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title}>Staff roles</Text>
        <Text style={styles.muted}>Staff can manage orders and the menu. Admins can also change store settings and roles.</Text>
        <TextField label="Search by name or phone" value={query} onChangeText={setQuery} autoCapitalize="none" />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {loading ? <ActivityIndicator color={colors.primary} /> : null}

        {shown.map((p) => {
          const isMe = p.id === session?.user.id;
          return (
            <View key={p.id} style={styles.card}>
              <Text style={styles.name}>
                {p.full_name || 'No name'}
                {isMe ? ' (you)' : ''}
              </Text>
              {p.phone ? <Text style={styles.muted}>{p.phone}</Text> : null}
              <View style={styles.chips}>
                {ROLES.map((r) => (
                  <Pressable
                    key={r}
                    disabled={isMe || busyId === p.id}
                    onPress={() => change(p, r)}
                    style={[styles.chip, p.role === r && styles.chipOn, isMe && styles.dim]}>
                    <Text style={[styles.chipText, p.role === r && styles.chipTextOn]}>{r}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16, gap: 12 },
  back: { color: colors.primary, fontSize: 16 },
  title: { color: colors.text, fontSize: 28, fontWeight: '800' },
  muted: { color: colors.textMuted, fontSize: 14 },
  error: { color: colors.danger, fontSize: 14 },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, gap: 8, borderWidth: 1, borderColor: colors.border },
  name: { color: colors.text, fontSize: 16, fontWeight: '700' },
  chips: { flexDirection: 'row', gap: 8, marginTop: 4 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textMuted, fontWeight: '600', textTransform: 'capitalize' },
  chipTextOn: { color: colors.text },
  dim: { opacity: 0.6 },
});
