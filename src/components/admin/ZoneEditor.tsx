import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { koboToNairaText, nairaToKobo } from '@/lib/adminMenu';
import { deleteZone, updateZone, type DeliveryZone } from '@/lib/adminSettings';
import { confirmAction } from '@/lib/confirm';
import { colors } from '@/theme/colors';

type Props = {
  zone: DeliveryZone;
  run: (action: () => Promise<void>) => Promise<void>;
  busy: boolean;
};

export function ZoneEditor({ zone, run, busy }: Props) {
  const [name, setName] = useState(zone.name);
  const [fee, setFee] = useState(koboToNairaText(zone.fee_kobo));
  const feeKobo = nairaToKobo(fee);
  const dirty = name.trim() !== zone.name || (feeKobo !== null && feeKobo !== zone.fee_kobo);

  return (
    <View style={styles.card}>
      <TextField label="Zone name" value={name} onChangeText={setName} />
      <TextField label="Delivery fee (₦)" value={fee} onChangeText={setFee} keyboardType="decimal-pad" />
      <View style={styles.row}>
        <View style={styles.row}>
          <Switch
            value={zone.active}
            disabled={busy}
            onValueChange={(v) => run(() => updateZone(zone.id, { active: v }))}
            trackColor={{ true: colors.primary }}
          />
          <Text style={styles.muted}>{zone.active ? 'Active' : 'Off'}</Text>
        </View>
        <Pressable
          onPress={() => confirmAction('Delete zone', `Delete "${zone.name}"?`, () => run(() => deleteZone(zone.id)))}>
          <Text style={styles.remove}>Delete</Text>
        </Pressable>
      </View>
      {dirty ? (
        <Button
          title="Save zone"
          loading={busy}
          disabled={name.trim().length === 0 || feeKobo === null}
          onPress={() => run(() => updateZone(zone.id, { name: name.trim(), fee_kobo: feeKobo ?? 0 }))}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, gap: 12, borderWidth: 1, borderColor: colors.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'space-between' },
  muted: { color: colors.textMuted, fontSize: 14 },
  remove: { color: colors.danger, fontWeight: '700' },
});
