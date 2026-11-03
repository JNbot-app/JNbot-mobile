import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Txt } from '../../components/ui';
import { PickerField } from '../../components/PickerField';
import { SettingsToggle } from '../../components/settings/SettingsFields';
import type { MacroInfo } from '../../store/types';
import type { ProfileCreationAdvanced, ProfileCreationSection, ProfilePluginReference } from '../../generated/client-contract/mobileClientContract';
import { ProfileLabel } from './ProfileFormControls';
import { selectProfilePlugins } from './profileDraft';
import { spacing } from '../../theme/theme';

type Section = Extract<ProfileCreationSection, 'scripts' | 'botExtension'>;
export function ProfilePluginsEditor({ section, value, plugins, onChange }: { section: Section; value: ProfileCreationAdvanced; plugins: MacroInfo[]; onChange: (next: ProfileCreationAdvanced) => void }) {
  const compatible = plugins.filter((plugin) => section === 'botExtension' ? plugin.scriptType === 'botExtension' || plugin.scriptType === 'action' : plugin.scriptType === 'script' || plugin.scriptType === 'action');
  const options = compatible.map((plugin) => ({ label: plugin.name, value: plugin.pluginId }));
  if (section === 'botExtension') return <ProfileLabel label="Bot action"><PickerField title="Bot action" options={options} value={value.botExtensionAction?.pluginId} clearable placeholder="No bot action" onChange={(id) => {
    const ref = typeof id === 'string' ? selectProfilePlugins([], [id])[0] : undefined;
    onChange({ ...value, botExtensionAction: ref });
  }} />{!options.length ? <Txt variant="muted">No compatible actions are installed on this phone.</Txt> : <Txt variant="faint">Runs for each bot while this profile is active.</Txt>}</ProfileLabel>;
  const refs = value[section] ?? [];
  const replace = (next: ProfilePluginReference[]) => onChange({ ...value, [section]: next.map((ref, index) => ({ ...ref, order: (index + 1) * 10 })) });
  const move = (index: number, delta: number) => {
    const next = refs.slice();
    const [ref] = next.splice(index, 1);
    next.splice(index + delta, 0, ref);
    replace(next);
  };
  return <View style={styles.form}>
    <ProfileLabel label="Select scripts"><PickerField title="Dashboard scripts" options={options} value={refs.map((ref) => ref.pluginId)} multiple clearable onChange={(ids) => onChange({ ...value, [section]: selectProfilePlugins(refs, Array.isArray(ids) ? ids.map(String) : []) })} /></ProfileLabel>
    {!options.length ? <Txt variant="muted">No compatible plugins are installed on this phone.</Txt> : null}
    {refs.map((ref, index) => {
      const name = plugins.find((p) => p.pluginId === ref.pluginId)?.name ?? ref.pluginId;
      return <View key={ref.id} style={styles.entry}>
        <Txt variant="heading">{name}</Txt>
        {section === 'scripts' ? <>
          <SettingsToggle label="Show on dashboard" value={!ref.hidden} onChange={(visible) => replace(refs.map((item) => item.id === ref.id ? { ...item, hidden: !visible } : item))} />
          <View style={styles.actions}><Button title="Move up" accessibilityLabel={`Move ${name} up`} variant="secondary" disabled={index === 0} onPress={() => move(index, -1)} /><Button title="Move down" accessibilityLabel={`Move ${name} down`} variant="secondary" disabled={index === refs.length - 1} onPress={() => move(index, 1)} /></View>
        </> : null}
        <Button title="Remove" accessibilityLabel={`Remove ${name}`} variant="ghost" onPress={() => replace(refs.filter((item) => item.id !== ref.id))} />
      </View>;
    })}
    {section === 'scripts' ? <ProfileLabel label="Blocked plugins"><PickerField title="Blocked plugins" options={plugins.map((plugin) => ({ label: plugin.name, value: plugin.pluginId }))} value={value.disallowedPlugins ?? []} multiple clearable placeholder="None blocked" onChange={(ids) => onChange({ ...value, disallowedPlugins: Array.isArray(ids) ? ids.map(String) : [] })} /></ProfileLabel> : null}
  </View>;
}
const styles = StyleSheet.create({ form: { gap: spacing.lg }, entry: { gap: spacing.md }, actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm } });
