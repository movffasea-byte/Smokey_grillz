import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme/colors';

export default function SignIn() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setError('Enter your email and password.');
      return;
    }
    setLoading(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
    if (err) {
      // Account exists but the email was never verified: send a fresh code.
      if (err.code === 'email_not_confirmed') {
        await supabase.auth.resend({ type: 'signup', email: cleanEmail });
        setLoading(false);
        router.push({ pathname: '/verify-otp', params: { email: cleanEmail } });
        return;
      }
      setError(err.message);
    }
    setLoading(false);
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Welcome back</Text>
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
            autoComplete="current-password"
          />
          {error && <Text style={styles.error}>{error}</Text>}
          <Button title="Sign in" onPress={onSubmit} loading={loading} />
          <Button title="Create an account" variant="ghost" onPress={() => router.replace('/sign-up')} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  form: { padding: 24, gap: 16 },
  title: { color: colors.text, fontSize: 26, fontWeight: '800', marginBottom: 8 },
  error: { color: colors.danger, fontSize: 14 },
});
