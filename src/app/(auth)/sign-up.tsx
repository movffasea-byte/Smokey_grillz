import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme/colors';

export default function SignUp() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    const cleanEmail = email.trim().toLowerCase();
    if (!fullName.trim() || !cleanEmail || !phone.trim()) {
      setError('Please fill in your name, phone and email.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: { data: { full_name: fullName.trim(), phone: phone.trim() } },
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    // With email confirmation on there is no session yet: the code goes to the inbox.
    if (!data.session) {
      router.push({ pathname: '/verify-otp', params: { email: cleanEmail } });
    }
  }

  return (
    <Screen style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Create your account</Text>
          <TextField label="Full name" value={fullName} onChangeText={setFullName} autoComplete="name" />
          <TextField
            label="Phone"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoComplete="tel"
          />
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          <TextField
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
          />
          {error && <Text style={styles.error}>{error}</Text>}
          <Button title="Sign up" onPress={onSubmit} loading={loading} />
          <Button title="I already have an account" variant="ghost" onPress={() => router.replace('/sign-in')} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  form: { padding: 24, gap: 16 },
  title: { color: colors.text, fontSize: 26, fontWeight: '800', marginBottom: 8 },
  error: { color: colors.danger, fontSize: 14 },
});
