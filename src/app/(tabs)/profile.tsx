import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { TAB_BAR_SPACE } from '@/components/ui/Glass';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { addAddress, deleteAddress, fetchAddresses, type Address } from '@/lib/addresses';
import { useAuth } from '@/providers/auth';
import { colors } from '@/theme/colors';

export default function Profile() {
  const { session, profile, isStaff, signOut, updateProfile } = useAuth();
  const router = useRouter();
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [label, setLabel] = useState('');
  const [line, setLine] = useState('');
  const [area, setArea] = useState('');
  const [addingAddress, setAddingAddress] = useState(false);

  useEffect(() => {
    setFullName(profile?.full_name ?? '');
    setPhone(profile?.phone ?? '');
  }, [profile]);

  const loadAddresses = useCallback(() => {
    fetchAddresses()
      .then(setAddresses)
      .catch((e) => setError(e.message));
  }, []);
  useEffect(loadAddresses, [loadAddresses]);

  const dirty = fullName.trim() !== (profile?.full_name ?? '') || phone.trim() !== (profile?.phone ?? '');

  const save = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await updateProfile({ full_name: fullName.trim(), phone: phone.trim() });
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  const add = async () => {
    if (!session || line.trim().length < 4) return;
    setAddingAddress(true);
    setError(null);
    try {
      await addAddress(session.user.id, label, line, area);
      setLabel('');
      setLine('');
      setArea('');
      loadAddresses();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add address');
    } finally {
      setAddingAddress(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteAddress(id);
      loadAddresses();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete address');
    }
  };

  return (
    <Screen style={styles.container} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Profile</Text>
          <View style={styles.card}>
            <Text style={styles.line}>{session?.user.email}</Text>
            {isStaff ? <Text style={styles.badge}>{profile?.role}</Text> : null}
            {isStaff ? <Button title="Manage orders" onPress={() => router.push('/staff')} /> : null}
            {isStaff ? <Button title="Manage menu" onPress={() => router.push('/admin/menu')} /> : null}
            <TextField label="Full name" value={fullName} onChangeText={setFullName} />
            <TextField label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            <Button title={saved && !dirty ? 'Saved ✓' : 'Save changes'} onPress={save} loading={saving} disabled={!dirty} />
          </View>

          <Text style={styles.section}>Saved addresses</Text>
          {addresses.length === 0 ? <Text style={styles.line}>No saved addresses yet.</Text> : null}
          {addresses.map((a) => (
            <View key={a.id} style={styles.addressRow}>
              <View style={styles.flex}>
                <Text style={styles.name}>{a.label ?? 'Address'}</Text>
                <Text style={styles.line}>{[a.line, a.area].filter(Boolean).join(', ')}</Text>
              </View>
              <Pressable onPress={() => remove(a.id)}>
                <Text style={styles.remove}>Delete</Text>
              </Pressable>
            </View>
          ))}

          <View style={styles.card}>
            <Text style={styles.name}>Add an address</Text>
            <TextField label="Label" value={label} onChangeText={setLabel} placeholder="Home, Work…" />
            <TextField label="Street address / landmark" value={line} onChangeText={setLine} placeholder="House number, street, landmark" />
            <TextField label="Area" value={area} onChangeText={setArea} placeholder="e.g. Barnawa" />
            <Button title="Save address" onPress={add} loading={addingAddress} disabled={line.trim().length < 4} />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button title="Sign out" variant="ghost" onPress={signOut} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1 },
  scroll: { padding: 16, paddingBottom: TAB_BAR_SPACE, gap: 14 },
  title: { color: colors.text, fontSize: 28, fontWeight: '800' },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, gap: 12, borderWidth: 1, borderColor: colors.border },
  section: { color: colors.text, fontSize: 18, fontWeight: '700', marginTop: 6 },
  name: { color: colors.text, fontSize: 16, fontWeight: '700' },
  line: { color: colors.textMuted, fontSize: 15 },
  error: { color: colors.danger, fontSize: 14 },
  badge: { color: colors.primary, fontSize: 13, fontWeight: '700', textTransform: 'uppercase' },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.border },
  remove: { color: colors.danger, fontWeight: '700' },
});
