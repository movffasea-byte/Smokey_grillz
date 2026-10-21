import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import {
  addChoice,
  deleteChoice,
  deleteOption,
  koboToNairaText,
  nairaToKobo,
  updateChoice,
  updateOption,
} from '@/lib/adminMenu';
import { confirmAction } from '@/lib/confirm';
import type { ItemOption, OptionChoice } from '@/lib/menu';
import { colors } from '@/theme/colors';

type Props = { option: ItemOption; onChanged: () => void; onError: (message: string) => void };

// Edits one option group (e.g. "Protein") and its choices (e.g. "Chicken", "Beef +₦500").
export function OptionEditor({ option, onChanged, onError }: Props) {
  const [name, setName] = useState(option.name);
  const [max, setMax] = useState(String(option.max_choices));
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
      onChanged();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  const maxNum = Math.max(1, parseInt(max, 10) || 1);
  const dirty = name.trim() !== option.name || maxNum !== option.max_choices;

  return (
    <View style={styles.card}>
      <TextField label="Option name" value={name} onChangeText={setName} placeholder="Protein" />
      <TextField label="Max choices" value={max} onChangeText={setMax} keyboardType="number-pad" />
      <View style={styles.row}>
        <Text style={styles.label}>Customer must choose</Text>
        <Switch
          value={option.required}
          disabled={busy}
          onValueChange={(v) => run(() => updateOption(option.id, { required: v }))}
          trackColor={{ true: colors.primary }}
        />
      </View>
      {dirty ? (
        <Button
          title="Save option"
          loading={busy}
          disabled={name.trim().length === 0}
          onPress={() => run(() => updateOption(option.id, { name: name.trim(), max_choices: maxNum }))}
        />
      ) : null}

      {option.option_choices.map((c) => (
        <ChoiceRow key={c.id} choice={c} disabled={busy} run={run} />
      ))}
      <Button title="Add choice" variant="ghost" loading={busy} onPress={() => run(() => addChoice(option.id))} />
      <Pressable
        onPress={() =>
          confirmAction('Delete option', `Delete "${option.name}" and all its choices?`, () =>
            run(() => deleteOption(option.id)),
          )
        }>
        <Text style={styles.remove}>Delete option</Text>
      </Pressable>
    </View>
  );
}

function ChoiceRow({
  choice,
  disabled,
  run,
}: {
  choice: OptionChoice;
  disabled: boolean;
  run: (action: () => Promise<void>) => Promise<void>;
}) {
  const [name, setName] = useState(choice.name);
  const [extra, setExtra] = useState(koboToNairaText(choice.price_delta_kobo));
  const extraKobo = nairaToKobo(extra);
  const dirty = name.trim() !== choice.name || (extraKobo !== null && extraKobo !== choice.price_delta_kobo);

  return (
    <View style={styles.choice}>
      <TextField label="Choice" value={name} onChangeText={setName} placeholder="Chicken" />
      <TextField label="Extra price (₦)" value={extra} onChangeText={setExtra} keyboardType="decimal-pad" />
      <View style={styles.row}>
        <View style={styles.row}>
          <Switch
            value={choice.available}
            disabled={disabled}
            onValueChange={(v) => run(() => updateChoice(choice.id, { available: v }))}
            trackColor={{ true: colors.primary }}
          />
          <Text style={styles.label}>{choice.available ? 'Available' : 'Sold out'}</Text>
        </View>
        <Pressable
          onPress={() =>
            confirmAction('Delete choice', `Delete "${choice.name}"?`, () => run(() => deleteChoice(choice.id)))
          }>
          <Text style={styles.remove}>Delete</Text>
        </Pressable>
      </View>
      {dirty ? (
        <Button
          title="Save choice"
          loading={disabled}
          disabled={name.trim().length === 0 || extraKobo === null}
          onPress={() => run(() => updateChoice(choice.id, { name: name.trim(), price_delta_kobo: extraKobo ?? 0 }))}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, gap: 12, borderWidth: 1, borderColor: colors.border },
  choice: { gap: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'space-between' },
  label: { color: colors.textMuted, fontSize: 14 },
  remove: { color: colors.danger, fontWeight: '700' },
});
