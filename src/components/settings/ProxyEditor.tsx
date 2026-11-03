import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Txt } from '../ui';
import { SettingsField, SettingsToggle } from './SettingsFields';
import { redactProxyUrl, validateProxyUrl, type ProxyConfig } from '../../features/appSettings';
import { colors, spacing } from '../../theme/theme';

export function ProxyEditor({ value, onChange }: { value: ProxyConfig; onChange: (value: ProxyConfig) => void }) {
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const add = () => {
    const error = validateProxyUrl(draft);
    setError(error);
    if (error) return;
    onChange({ enabled: value.enabled, urls: [...new Set([...value.urls, draft.trim()])] });
    setDraft('');
  };
  return <View style={styles.container}>
    <SettingsToggle label="Use rotating proxy pool" value={value.enabled} onChange={(enabled) => onChange({ enabled, urls: value.urls })} />
    <SettingsField label="Proxy address" value={draft} onChangeText={setDraft} editable={value.enabled} autoCapitalize="none" placeholder="socks5://user:pass@host:1080" onSubmitEditing={add} />
    <Button title="Add proxy" variant="secondary" onPress={add} disabled={!value.enabled || !draft.trim()} />
    {error ? <Txt accessibilityRole="alert" style={styles.error}>{error}</Txt> : null}
    {value.urls.map((url) => <View key={url} style={styles.row}><Txt variant="muted" style={styles.grow}>{redactProxyUrl(url)}</Txt><Button title="Remove" accessibilityLabel={`Remove proxy ${redactProxyUrl(url)}`} variant="ghost" onPress={() => onChange({ enabled: value.enabled, urls: value.urls.filter((item) => item !== url) })} /></View>)}
    {value.enabled && !value.urls.length ? <Txt variant="faint">Add at least one proxy address.</Txt> : null}
  </View>;
}
const styles = StyleSheet.create({ container: { gap: spacing.md }, row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, grow: { flex: 1 }, error: { color: colors.danger } });
