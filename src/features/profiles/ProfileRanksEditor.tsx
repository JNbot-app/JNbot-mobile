import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { PickerField } from '../../components/PickerField';
import { Button, Txt } from '../../components/ui';
import { SettingsField } from '../../components/settings/SettingsFields';
import type { ProfileCreationAdvanced } from '../../generated/client-contract/mobileClientContract';
import { ProfileColorField, ProfileLabel, ProfileRow } from './ProfileFormControls';
import { colors, spacing } from '../../theme/theme';

export function ProfileRanksEditor({ value, onChange }: { value: ProfileCreationAdvanced; onChange: (next: ProfileCreationAdvanced) => void }) {
  const modes = value.gamemodes ?? [];
  const [selected, setSelected] = useState(modes[0] ?? '');
  const [kind, setKind] = useState<'ranks' | 'gkits'>('ranks');
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const active = modes.includes(selected) ? selected : modes[0];
  if (!active) return <Txt variant="muted">Add a gamemode in Gamemodes first.</Txt>;
  const modeKey = active.toLowerCase();
  const data = value.ranksGkits?.[modeKey] ?? { ranks: {}, gkits: {} };
  const patch = (next: typeof data) => onChange({ ...value, ranksGkits: { ...value.ranksGkits, [modeKey]: next } });
  const add = () => {
    const next = name.trim().toLowerCase();
    if (!next || ['__proto__', 'constructor', 'prototype'].includes(next)) { setError('Enter a valid name.'); return; }
    if (Object.hasOwn(data[kind], next)) { setError('That name has already been added.'); return; }
    patch(kind === 'ranks' ? { ...data, ranks: { ...data.ranks, [next]: { price: 0, color: '#E6BF4C' } } } : { ...data, gkits: { ...data.gkits, [next]: 60 } });
    setName(''); setError(null); setEditing(next);
  };
  const remove = (name: string) => {
    patch(kind === 'ranks' ? { ...data, ranks: Object.fromEntries(Object.entries(data.ranks).filter(([key]) => key !== name)) } : { ...data, gkits: Object.fromEntries(Object.entries(data.gkits).filter(([key]) => key !== name)) });
    setEditing(null);
  };
  const exists = editing !== null && Object.hasOwn(data[kind], editing);
  return <View style={styles.form}>
    <ProfileLabel label="Gamemode"><PickerField title="Gamemode for ranks and GKits" options={modes.map((mode) => ({ label: mode, value: mode }))} value={active} onChange={(mode) => { setSelected(String(mode)); setEditing(null); }} /></ProfileLabel>
    <ProfileLabel label="Configure"><PickerField title="Ranks or GKits" options={[{ label: 'Ranks', value: 'ranks' }, { label: 'GKits', value: 'gkits' }]} value={kind} onChange={(kind) => { if (kind === 'ranks' || kind === 'gkits') setKind(kind); setEditing(null); }} /></ProfileLabel>
    {exists && editing !== null ? <>
      <Button title="Back to list" variant="ghost" onPress={() => setEditing(null)} />
      <Txt variant="heading">{editing}</Txt>
      <SettingsField label="Price (€)" value={Number.isFinite(kind === 'ranks' ? data.ranks[editing].price : data.gkits[editing]) ? String(kind === 'ranks' ? data.ranks[editing].price : data.gkits[editing]) : ''} keyboardType="decimal-pad" onChangeText={(text) => {
        const price = text.trim() === '' ? NaN : Number(text.replace(',', '.'));
        patch(kind === 'ranks' ? { ...data, ranks: { ...data.ranks, [editing]: { ...data.ranks[editing], price } } } : { ...data, gkits: { ...data.gkits, [editing]: price } });
      }} />
      {kind === 'ranks' ? <ProfileColorField label="Rank color" value={data.ranks[editing].color} onChange={(color) => patch({ ...data, ranks: { ...data.ranks, [editing]: { ...data.ranks[editing], color } } })} /> : null}
      <Button title={kind === 'ranks' ? 'Remove rank' : 'Remove GKit'} variant="danger" onPress={() => remove(editing)} />
    </> : <>
      <SettingsField label={kind === 'ranks' ? 'Rank name' : 'GKit name'} value={name} onChangeText={setName} autoCapitalize="none" onSubmitEditing={add} />
      <Button title={kind === 'ranks' ? 'Add rank' : 'Add GKit'} variant="secondary" onPress={add} />
      {error ? <Txt accessibilityRole="alert" style={styles.error}>{error}</Txt> : null}
      {Object.keys(data[kind]).map((name) => <ProfileRow key={name} title={name} summary={`€${kind === 'ranks' ? data.ranks[name].price : data.gkits[name]}`} onPress={() => setEditing(name)} />)}
      {!Object.keys(data[kind]).length ? <Txt variant="muted">No {kind === 'ranks' ? 'ranks' : 'GKits'} configured.</Txt> : null}
    </>}
  </View>;
}
const styles = StyleSheet.create({ form: { gap: spacing.lg }, error: { color: colors.danger } });
