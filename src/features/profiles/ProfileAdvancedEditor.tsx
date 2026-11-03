import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SettingsField } from '../../components/settings/SettingsFields';
import { PickerField } from '../../components/PickerField';
import type { MacroInfo } from '../../store/types';
import type { ProfileCreationAdvanced, ProfileCreationSection } from '../../generated/client-contract/mobileClientContract';
import { ProfileColorField, ProfileLabel } from './ProfileFormControls';
import { ProfileGamemodesEditor } from './ProfileGamemodesEditor';
import { ProfileRanksEditor } from './ProfileRanksEditor';
import { ProfilePluginsEditor } from './ProfilePluginsEditor';
import { ProfileDefaultsEditor } from './ProfileDefaultsEditor';
import { spacing } from '../../theme/theme';

type Props = { section: ProfileCreationSection; value: ProfileCreationAdvanced; onChange: (next: ProfileCreationAdvanced) => void; plugins: MacroInfo[]; versions: string[]; host: string; port: string };
export function ProfileAdvancedEditor({ section, value, onChange, plugins, versions, host, port }: Props) {
  switch (section) {
    case 'identity': return <View style={styles.form}>
      <SettingsField label="Short name" value={value.shortName ?? ''} onChangeText={(shortName) => onChange({ ...value, shortName })} maxLength={12} placeholder="Optional compact label" />
      <SettingsField label="Icon URL" value={value.icon?.startsWith('data:') ? '' : value.icon ?? ''} onChangeText={(icon) => onChange({ ...value, icon: icon || null })} autoCapitalize="none" keyboardType="url" placeholder={value.icon?.startsWith('data:') ? "Using the server's icon" : 'https://example.com/logo.png'} />
      <ProfileColorField value={value.color ?? '#E6BF4C'} onChange={(color) => onChange({ ...value, color })} />
    </View>;
    case 'connection': return <ProfileLabel label="Additional server addresses"><PickerField title="Additional server addresses" options={(value.ips ?? []).map((ip) => ({ label: ip, value: ip }))} value={value.ips ?? []} multiple freeSolo clearable placeholder="Add server addresses" onChange={(ips) => onChange({ ...value, ips: Array.isArray(ips) ? ips.map(String) : [] })} /></ProfileLabel>;
    case 'gamemodes': return <ProfileGamemodesEditor value={value} onChange={onChange} />;
    case 'ranks': return <ProfileRanksEditor value={value} onChange={onChange} />;
    case 'scripts': case 'botExtension': return <ProfilePluginsEditor section={section} value={value} onChange={onChange} plugins={plugins} />;
    case 'defaults': return <ProfileDefaultsEditor value={value.appSettingsDefaults ?? {}} onChange={(appSettingsDefaults) => onChange({ ...value, appSettingsDefaults })} versions={versions} host={host} port={port} />;
  }
}
const styles = StyleSheet.create({ form: { gap: spacing.lg } });
