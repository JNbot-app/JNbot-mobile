import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Txt } from '../../components/ui';
import { PickerField } from '../../components/PickerField';
import { SettingsField, SettingsToggle } from '../../components/settings/SettingsFields';
import { ProxyEditor } from '../../components/settings/ProxyEditor';
import { KickBehaviorEditor } from '../../components/settings/KickBehaviorEditor';
import { defaultKickBehaviorConfig } from '../appSettings';
import type { ProfileCreationDefaults } from '../../generated/client-contract/mobileClientContract';
import { ProfileRow } from './ProfileFormControls';
import { spacing } from '../../theme/theme';

const GROUPS = [
  { id: 'connection', title: 'Connection', keys: ['version', 'ip', 'port', 'serverIpRotation', 'retryOnLoginFail', 'joinServerTimeout'] },
  { id: 'protections', title: 'Protections', keys: ['auto_v4guard', 'autoResourcePackAccept'] },
  { id: 'kick', title: 'Kick behavior', keys: ['kickBehaviour'] },
  { id: 'proxy', title: 'Proxies', keys: ['proxy'] },
  { id: 'timing', title: 'Timing', keys: ['join_delay', 'join_delay_premium', 'delay_between_actions'] },
] satisfies { id: string; title: string; keys: (keyof ProfileCreationDefaults)[] }[];

const LABELS: Record<keyof ProfileCreationDefaults, string> = {
  version: 'Minecraft version', ip: 'Server address override', port: 'Server port override',
  serverIpRotation: 'Rotate server IPs', retryOnLoginFail: 'Retry after login failure', joinServerTimeout: 'Join timeout (ms)',
  auto_v4guard: 'Auto V4guard verification', autoResourcePackAccept: 'Auto resource pack accept',
  kickBehaviour: 'Kick behavior', proxy: 'Proxy pool', join_delay: 'Bot join delay (ms)', join_delay_premium: 'Premium bot join delay (ms)', delay_between_actions: 'Delay between actions (ms)',
};

export function ProfileDefaultsEditor({ value, onChange, versions, host, port }: { value: ProfileCreationDefaults; onChange: (next: ProfileCreationDefaults) => void; versions: string[]; host: string; port: string }) {
  const [group, setGroup] = useState<string | null>(null);
  const active = GROUPS.find((item) => item.id === group);
  const initial: Required<ProfileCreationDefaults> = {
    version: '1.8.9', ip: host, port: Number(port), serverIpRotation: false, retryOnLoginFail: true, joinServerTimeout: 10000,
    auto_v4guard: true, autoResourcePackAccept: true, kickBehaviour: defaultKickBehaviorConfig,
    proxy: { enabled: false, urls: [] }, join_delay: 3000, join_delay_premium: 3000, delay_between_actions: 250,
  };
  const set = <K extends keyof ProfileCreationDefaults>(key: K, next: ProfileCreationDefaults[K]) => onChange({ ...value, [key]: next });
  const reset = (key: keyof ProfileCreationDefaults) => {
    const next = { ...value }; delete next[key]; onChange(next);
  };
  if (!active) return <View style={styles.form}>
    <Txt variant="muted">Only customized values are saved. Other settings use app defaults.</Txt>
    {GROUPS.map((item) => { const count = item.keys.filter((key) => value[key] !== undefined).length; return <ProfileRow key={item.id} title={item.title} summary={count ? `${count} overrides` : 'App defaults'} onPress={() => setGroup(item.id)} />; })}
  </View>;
  return <View style={styles.form}>
    <Button title="Back to default settings" variant="ghost" onPress={() => setGroup(null)} />
    <Txt variant="heading">{active.title}</Txt>
    {active.keys.map((key) => <View key={key} style={styles.option}>
      <View style={styles.row}><Txt variant="label" style={styles.grow}>{LABELS[key]}</Txt><Button title={value[key] === undefined ? 'Customize' : 'Reset'} accessibilityLabel={`${value[key] === undefined ? 'Customize' : 'Reset'} ${LABELS[key]}`} variant="ghost" onPress={() => value[key] === undefined ? set(key, initial[key]) : reset(key)} /></View>
      {value[key] === undefined ? <Txt variant="faint">App default</Txt> : <DefaultInput setting={key} value={value} onChange={set} versions={versions} />}
    </View>)}
  </View>;
}
function DefaultInput({ setting, value, onChange, versions }: { setting: keyof ProfileCreationDefaults; value: ProfileCreationDefaults; onChange: <K extends keyof ProfileCreationDefaults>(key: K, next: ProfileCreationDefaults[K]) => void; versions: string[] }) {
  switch (setting) {
    case 'version': return <PickerField title="Minecraft version" options={versions.map((version) => ({ label: version, value: version }))} value={value.version} freeSolo onChange={(version) => onChange('version', String(version))} />;
    case 'ip': return <SettingsField label="Server address" value={value.ip} autoCapitalize="none" onChangeText={(ip) => onChange('ip', ip)} />;
    case 'serverIpRotation': case 'retryOnLoginFail': case 'auto_v4guard': case 'autoResourcePackAccept': return <SettingsToggle label={LABELS[setting]} value={value[setting] === true} onChange={(next) => onChange(setting, next)} />;
    case 'kickBehaviour': return <KickBehaviorEditor value={value.kickBehaviour ?? defaultKickBehaviorConfig} onChange={(next) => onChange('kickBehaviour', next)} />;
    case 'proxy': return <ProxyEditor value={value.proxy ?? { enabled: false, urls: [] }} onChange={(next) => onChange('proxy', next)} />;
    case 'port': case 'joinServerTimeout': case 'join_delay': case 'join_delay_premium': case 'delay_between_actions': return <SettingsField label={LABELS[setting]} keyboardType="number-pad" value={Number.isFinite(value[setting]) ? String(value[setting]) : ''} onChangeText={(text) => onChange(setting, text.trim() === '' ? NaN : Number(text))} />;
  }
}
const styles = StyleSheet.create({ form: { gap: spacing.lg }, option: { gap: spacing.sm }, row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, grow: { flex: 1 } });
