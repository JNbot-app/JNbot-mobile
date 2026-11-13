import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { PickerField } from '../../components/PickerField';
import { Txt } from '../../components/ui';
import { SettingsField, SettingsToggle } from '../../components/settings/SettingsFields';
import type { ProfileCreationAdvanced, ProfileJoinBehaviour } from '../../generated/client-contract/mobileClientContract';
import type { MacroInfo } from '../../store/types';
import { ProfileLabel } from './ProfileFormControls';
import { setGamemodes } from './profileDraft';
import { spacing } from '../../theme/theme';

export function ProfileGamemodesEditor({ value, plugins, onChange }: { value: ProfileCreationAdvanced; plugins: MacroInfo[]; onChange: (next: ProfileCreationAdvanced) => void }) {
  const modes = value.gamemodes ?? [];
  const [selected, setSelected] = useState(modes[0] ?? '');
  const active = modes.includes(selected) ? selected : modes[0];
  const options = modes.map((mode) => ({ label: mode, value: mode }));
  const updateJoin = (next: ProfileJoinBehaviour) => {
    if (active) onChange({ ...value, joinBehaviours: { ...value.joinBehaviours, [active.toLowerCase()]: next } });
  };
  return <View style={styles.form}>
    <ProfileLabel label="Gamemodes"><PickerField title="Gamemodes" options={options} value={modes} multiple freeSolo clearable placeholder="Add gamemodes" onChange={(next) => onChange(setGamemodes(value, Array.isArray(next) ? next.map(String) : []))} /></ProfileLabel>
    {!modes.length ? <Txt variant="muted">Optional. Add a gamemode to configure joining and kits.</Txt> : <>
      <ProfileLabel label="Default gamemode"><PickerField title="Default gamemode" options={options} value={value.defaultGamemode ?? active} onChange={(next) => onChange({ ...value, defaultGamemode: String(next) })} /></ProfileLabel>
      <ProfileLabel label="Configure gamemode"><PickerField title="Configure gamemode" options={options} value={active} onChange={(next) => setSelected(String(next))} /></ProfileLabel>
      <SettingsToggle label="Has kits / GKits" value={(value.kitGamemodes ?? []).includes(active)} onChange={(enabled) => onChange({ ...value, kitGamemodes: enabled ? [...(value.kitGamemodes ?? []), active] : (value.kitGamemodes ?? []).filter((mode) => mode !== active) })} />
      <JoinEditor gamemode={active} plugins={plugins} value={value.joinBehaviours?.[active.toLowerCase()] ?? { kind: 'auto' }} onChange={updateJoin} />
    </>}
  </View>;
}
const kinds = [{ label: 'Auto', value: 'auto' }, { label: 'Already connected', value: 'direct' }, { label: 'Run a command', value: 'command' }, { label: 'Open a server selector', value: 'selector' }, { label: 'Run an action', value: 'action' }];
function JoinEditor({ gamemode, plugins, value, onChange }: { gamemode: string; plugins: MacroInfo[]; value: ProfileJoinBehaviour; onChange: (next: ProfileJoinBehaviour) => void }) {
  const actions = plugins.filter((plugin) => plugin.scriptType === 'action').map((plugin) => ({ label: plugin.name, value: plugin.pluginId }));
  return <View style={styles.form}>
    <ProfileLabel label="Join method"><PickerField title="Join method" options={kinds} value={value.kind} onChange={(kind) => {
      if (kind === value.kind) return;
      switch (kind) {
        case 'auto': case 'direct': onChange({ kind }); break;
        case 'command': onChange({ kind, command: '/server <gamemode>' }); break;
        case 'selector': onChange({ kind, hotbarSlot: 9, pick: 'name' }); break;
        case 'action': onChange({ kind }); break;
      }
    }} /></ProfileLabel>
    {value.kind === 'auto' ? <Txt variant="faint">Try the server command, then find the gamemode in the selector.</Txt> : null}
    {value.kind === 'command' ? <><SettingsField label="Join command" value={value.command} onChangeText={(command) => onChange({ kind: 'command', command })} autoCapitalize="none" /><Txt variant="faint">Use {'<gamemode>'} for the gamemode name.</Txt></> : null}
    {value.kind === 'action' ? <>
      <ProfileLabel label="Join action"><PickerField title="Join action" options={actions} value={value.action?.pluginId} clearable placeholder="Select an action" onChange={(id) => onChange(typeof id === 'string' && id ? { kind: 'action', action: { id: `join_${gamemode.toLowerCase()}`, pluginId: id, source: { kind: 'plugin', pluginId: id } } } : { kind: 'action' })} /></ProfileLabel>
      <Txt variant="faint">{actions.length ? 'Runs main(bot, settings, [gamemode]) instead of the built-in join steps. Return false if joining failed.' : 'No actions are installed on this phone.'}</Txt>
    </> : null}
    {value.kind === 'selector' ? <>
      <ProfileLabel label="Selector hotbar slot"><PickerField title="Selector hotbar slot" options={Array.from({ length: 9 }, (_, i) => ({ label: `Slot ${i + 1}`, value: i + 1 }))} value={value.hotbarSlot} onChange={(slot) => onChange({ ...value, hotbarSlot: Number(slot) })} /></ProfileLabel>
      <ProfileLabel label="Find gamemode"><PickerField title="Find gamemode" options={[{ label: 'Find by gamemode name', value: 'name' }, { label: 'Click a fixed menu slot', value: 'slot' }]} value={value.pick} onChange={(pick) => onChange(pick === 'slot' ? { ...value, pick: 'slot', staticSlot: value.staticSlot ?? 0 } : { kind: 'selector', hotbarSlot: value.hotbarSlot, pick: 'name' })} /></ProfileLabel>
      {value.pick === 'slot' ? <ProfileLabel label="Menu slot"><PickerField title="Menu slot" options={Array.from({ length: 54 }, (_, i) => ({ label: `Slot ${i} · Row ${Math.floor(i / 9) + 1}, column ${i % 9 + 1}`, value: i }))} value={value.staticSlot} onChange={(slot) => onChange({ ...value, staticSlot: Number(slot) })} /></ProfileLabel> : null}
    </> : null}
  </View>;
}
const styles = StyleSheet.create({ form: { gap: spacing.lg } });
