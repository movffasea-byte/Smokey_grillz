import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { ZoneEditor } from '@/components/admin/ZoneEditor';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { nairaToKobo } from '@/lib/adminMenu';
import {
  DAY_LABEL,
  DAYS,
  addZone,
  fetchAllZones,
  isValidTime,
  parseHours,
  updateStoreSettings,
  type DeliveryZone,
  type Hours,
  type StoreSettings,
} from '@/lib/adminSettings';
import { fetchStoreSettings } from '@/lib/checkout';
import { goBack } from '@/lib/navigation';
import { colors } from '@/theme/colors';

export default function AdminSettings() {
  const router = useRouter();
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [form, setForm] = useState({
    phone: '',
    whatsapp: '',
    instagram: '',
    address: '',
    bank_name: '',
    account_number: '',
    account_name: '',
  });
  const [hours, setHours] = useState<Hours | null>(null);
  const [zoneName, setZoneName] = useState('');
  const [zoneFee, setZoneFee] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadZones = useCallback(() => {
    fetchAllZones()
      .then(setZones)
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    fetchStoreSettings()
      .then((s) => {
        setSettings(s);
        setForm({
          phone: s.phone ?? '',
          whatsapp: s.whatsapp ?? '',
          instagram: s.instagram,
          address: s.address,
          bank_name: s.bank_name ?? '',
          account_number: s.account_number ?? '',
          account_name: s.account_name ?? '',
        });
        setHours(parseHours(s.hours));
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    loadZones();
  }, [loadZones]);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  const toggleOpen = (value: boolean) => {
    if (!settings) return;
    setSettings({ ...settings, accepting_orders: value });
    run(async () => {
      try {
        await updateStoreSettings({ accepting_orders: value });
      } catch (e) {
        setSettings((s) => (s ? { ...s, accepting_orders: !value } : s));
        throw e;
      }
    });
  };

  const setField = (key: keyof typeof form) => (text: string) => {
    setSaved(false);
    setForm((f) => ({ ...f, [key]: text }));
  };

  const setDay = (day: (typeof DAYS)[number], patch: Partial<Hours[typeof day]>) => {
    setSaved(false);
    setHours((h) => (h ? { ...h, [day]: { ...h[day], ...patch } } : h));
  };

  const hoursValid = hours ? DAYS.every((d) => hours[d].closed || (isValidTime(hours[d].open) && isValidTime(hours[d].close))) : false;
  const canSave = form.address.trim().length > 0 && hoursValid;

  const save = () =>
    run(async () => {
      if (!hours) return;
      const clean = Object.fromEntries(
        DAYS.map((d) => [d, { open: hours[d].open.trim(), close: hours[d].close.trim(), closed: hours[d].closed }]),
      );
      await updateStoreSettings({
        phone: form.phone.trim() || null,
        whatsapp: form.whatsapp.trim() || null,
        instagram: form.instagram.trim(),
        address: form.address.trim(),
        bank_name: form.bank_name.trim() || null,
        account_number: form.account_number.trim() || null,
        account_name: form.account_name.trim() || null,
        hours: clean,
      });
      setSaved(true);
    });

  const zoneFeeKobo = nairaToKobo(zoneFee);

  if (loading) return <ActivityIndicator style={styles.center} color={colors.primary} />;

  return (
    <Screen style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => goBack(router)}>
            <Text style={styles.back}>‹ Back</Text>
          </Pressable>
          <Text style={styles.title}>Store settings</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={[styles.card, styles.row]}>
            <View style={styles.flex}>
              <Text style={styles.cardTitle}>{settings?.accepting_orders ? 'Open for orders' : 'Closed'}</Text>
              <Text style={styles.muted}>Closing stops all new orders immediately.</Text>
            </View>
            <Switch
              value={settings?.accepting_orders ?? false}
              disabled={busy}
              onValueChange={toggleOpen}
              trackColor={{ true: colors.success }}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Contact</Text>
            <TextField label="Phone" value={form.phone} onChangeText={setField('phone')} keyboardType="phone-pad" />
            <TextField label="WhatsApp" value={form.whatsapp} onChangeText={setField('whatsapp')} keyboardType="phone-pad" />
            <TextField label="Instagram" value={form.instagram} onChangeText={setField('instagram')} autoCapitalize="none" />
            <TextField label="Address" value={form.address} onChangeText={setField('address')} multiline style={styles.multiline} />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Bank transfer details</Text>
            <TextField label="Bank name" value={form.bank_name} onChangeText={setField('bank_name')} />
            <TextField label="Account number" value={form.account_number} onChangeText={setField('account_number')} keyboardType="number-pad" />
            <TextField label="Account name" value={form.account_name} onChangeText={setField('account_name')} />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Opening hours</Text>
            <Text style={styles.muted}>24-hour times, e.g. 10:00 and 22:00 (Lagos time). Orders are refused outside these hours.</Text>
            {hours
              ? DAYS.map((d) => (
                  <View key={d} style={styles.day}>
                    <View style={styles.row}>
                      <Text style={styles.dayName}>{DAY_LABEL[d]}</Text>
                      <View style={styles.row}>
                        <Text style={styles.muted}>{hours[d].closed ? 'Closed' : 'Open'}</Text>
                        <Switch
                          value={!hours[d].closed}
                          onValueChange={(v) => setDay(d, { closed: !v })}
                          trackColor={{ true: colors.primary }}
                        />
                      </View>
                    </View>
                    {hours[d].closed ? null : (
                      <View style={styles.row}>
                        <View style={styles.flex}>
                          <TextField label="Opens" value={hours[d].open} onChangeText={(t) => setDay(d, { open: t })} placeholder="10:00" />
                        </View>
                        <View style={styles.flex}>
                          <TextField label="Closes" value={hours[d].close} onChangeText={(t) => setDay(d, { close: t })} placeholder="22:00" />
                        </View>
                      </View>
                    )}
                  </View>
                ))
              : null}
            {hoursValid ? null : <Text style={styles.error}>Use HH:MM for every open day.</Text>}
          </View>

          <Button title={saved ? 'Saved ✓' : 'Save settings'} onPress={save} loading={busy} disabled={!canSave || saved} />

          <Text style={styles.section}>Delivery zones</Text>
          <Text style={styles.muted}>Zones marked "Demo" are placeholders. Rename them and set real fees.</Text>
          {zones.map((z) => (
            <ZoneEditor
              key={`${z.id}-${z.name}-${z.fee_kobo}`}
              zone={z}
              busy={busy}
              run={async (action) => {
                await run(action);
                loadZones();
              }}
            />
          ))}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Add a zone</Text>
            <TextField label="Zone name" value={zoneName} onChangeText={setZoneName} />
            <TextField label="Delivery fee (₦)" value={zoneFee} onChangeText={setZoneFee} keyboardType="decimal-pad" />
            <Button
              title="Add zone"
              loading={busy}
              disabled={zoneName.trim().length === 0 || zoneFeeKobo === null}
              onPress={async () => {
                await run(() => addZone(zoneName, zoneFeeKobo ?? 0));
                setZoneName('');
                setZoneFee('');
                loadZones();
              }}
            />
          </View>

          <Text style={styles.section}>Staff</Text>
          <Button title="Manage staff roles" variant="ghost" onPress={() => router.push('/admin/roles')} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  center: { flex: 1 },
  scroll: { padding: 16, gap: 12 },
  back: { color: colors.primary, fontSize: 16 },
  title: { color: colors.text, fontSize: 28, fontWeight: '800' },
  section: { color: colors.text, fontSize: 20, fontWeight: '800', marginTop: 12 },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, gap: 12, borderWidth: 1, borderColor: colors.border },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'space-between' },
  day: { gap: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border },
  dayName: { color: colors.text, fontSize: 15, fontWeight: '700' },
  multiline: { height: 80, paddingTop: 14, textAlignVertical: 'top' },
  muted: { color: colors.textMuted, fontSize: 14 },
  error: { color: colors.danger, fontSize: 14 },
});
