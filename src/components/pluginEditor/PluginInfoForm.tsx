import React from 'react';
import { StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { SettingsGroup, NavRow } from '../settings/SettingsGroup';
import { SettingsField as Field } from '../settings/SettingsFields';
import { InlineError, PickerRow } from '../settings/SettingsPages';
import type { OptionSection } from '../../features/plugins/optionSchema';
import type { MacroScriptType } from '../../store/types';
import { colors, radii } from '../../theme/theme';

export type PluginInfoDraft = {
  name: string;
  description: string;
  scriptType: MacroScriptType;
  banner: string;
  config: OptionSection[];
};

const TYPES = [
  { label: 'Plugin', value: 'script', description: 'A full script that runs on its own.' },
  { label: 'Action', value: 'action', description: 'A short script you run while a bot is online.' },
  { label: 'Profile UI', value: 'profileUi', description: 'A custom page for a profile.' },
];

export const isImageUrl = (url: string) => /^https?:\/\/\S+$/i.test(url);

function optionSummary(config: OptionSection[]) {
  const count = config.reduce((total, section) => total + section.options.length, 0);
  if (!count) return 'None yet';
  const options = `${count} ${count === 1 ? 'option' : 'options'}`;
  return config.length > 1 ? `${options} in ${config.length} sections` : options;
}

/** General plugin details, like the desktop's Plugin settings dialog. */
export function PluginInfoForm({
  draft,
  error,
  onChange,
  onOpenOptions,
  onOpenCode,
}: {
  draft: PluginInfoDraft;
  error: string | null;
  onChange: (patch: Partial<PluginInfoDraft>) => void;
  onOpenOptions: () => void;
  /** Absent when the code editor is already open underneath. */
  onOpenCode?: () => void;
}) {
  const types = draft.scriptType === 'botExtension'
    ? [...TYPES, { label: 'Bot extension (deprecated)', value: 'botExtension', description: undefined }]
    : TYPES;
  return (
    <>
      {isImageUrl(draft.banner) ? (
        <Image source={{ uri: draft.banner }} style={styles.banner} contentFit="cover" transition={150} accessibilityLabel="Banner preview" />
      ) : null}
      <InlineError message={error} />
      <SettingsGroup title="General">
        <Field label="Name" value={draft.name} maxLength={32} placeholder="Plugin name" onChangeText={(name) => onChange({ name })} />
        <Field label="Description" multiline value={draft.description} maxLength={100} placeholder="What does this plugin do?" onChangeText={(description) => onChange({ description })} />
        <PickerRow label="Type" title="Plugin type" options={types} value={draft.scriptType} onChange={(value) => onChange({ scriptType: value as MacroScriptType })} />
      </SettingsGroup>
      <SettingsGroup title="Contents">
        {onOpenCode ? <NavRow icon="code-slash-outline" title="Code" summary="Edit the source" onPress={onOpenCode} /> : null}
        <NavRow icon="options-outline" title="Options" summary={optionSummary(draft.config)} onPress={onOpenOptions} />
      </SettingsGroup>
      <SettingsGroup title="Banner" footer="A wide image, about 800 × 200, shown at the top of the plugin.">
        <Field
          label="Image URL"
          value={draft.banner}
          placeholder="https://example.com/banner.jpg"
          autoCapitalize="none"
          keyboardType="url"
          onChangeText={(banner) => onChange({ banner: banner.trim() })}
        />
      </SettingsGroup>
    </>
  );
}

const styles = StyleSheet.create({
  banner: {
    width: '100%',
    aspectRatio: 4,
    borderRadius: radii.lg,
    borderCurve: 'continuous',
    backgroundColor: colors.surface,
  },
});
