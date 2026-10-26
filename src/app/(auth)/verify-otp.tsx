import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme/colors';

const RESEND_SECONDS = 60;

export default function VerifyOtp() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  // Count down to a fixed time instead of decrementing, so the wait keeps running while the app is minimized.
  const [resendAt, setResendAt] = useState(() => Date.now() + RESEND_SECONDS * 1000);
  const [now, setNow] = useState(() => Date.now());
  const cooldown = Math.max(0, Math.ceil((resendAt - now) / 1000));

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [cooldown > 0]);

  async function onVerify() {
    const token = code.trim();
    if (!/^\d{6,8}$/.test(token)) {
      setError('Enter the numeric code from your email.');
      return;
    }
    setLoading(true);
    setError(null);
    const { error: err } = await supabase.auth.verifyOtp({ email, token, type: 'signup' });
    setLoading(false);
    // On success the session is set and the root layout moves us into the app.
    if (err) setError(err.message);
  }

  async function onResend() {
    setError(null);
    setInfo(null);
    const { error: err } = await supabase.auth.resend({ type: 'signup', email });
    if (err) {
      setError(err.message);
      return;
    }
    setInfo('A new code is on its way.');
    setNow(Date.now());
    setResendAt(Date.now() + RESEND_SECONDS * 1000);
  }

  return (
    <Screen style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.title}>Check your email</Text>
        <Text style={styles.body}>
          We sent a verification code to <Text style={styles.email}>{email}</Text>.
        </Text>
        <TextField
          label="Verification code"
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          maxLength={8}
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          style={styles.code}
        />
        {error && <Text style={styles.error}>{error}</Text>}
        {info && <Text style={styles.info}>{info}</Text>}
        <Button title="Verify" onPress={onVerify} loading={loading} />
        <Button
          title={cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
          variant="ghost"
          onPress={onResend}
          disabled={cooldown > 0}
        />
        <Button title="Back" variant="ghost" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  form: { padding: 24, gap: 16 },
  title: { color: colors.text, fontSize: 26, fontWeight: '800' },
  body: { color: colors.textMuted, fontSize: 15 },
  email: { color: colors.cream, fontWeight: '700' },
  code: { fontSize: 24, letterSpacing: 8, textAlign: 'center' },
  error: { color: colors.danger, fontSize: 14 },
  info: { color: colors.success, fontSize: 14 },
});
