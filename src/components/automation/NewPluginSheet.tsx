import React, { useEffect, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { BottomSheet } from '../BottomSheet';
import { PickerField } from '../PickerField';
import { Button, Txt } from '../ui';
import { validateNewPlugin } from '../../features/plugins/newPlugin';
import type { NewPluginInput } from '../../runtime/JNbotRuntime';
import { colors, font, radii, spacing } from '../../theme/theme';

const TYPES = [
  { label: 'Plugin', value: 'script', description: 'A full script that runs on its own.' },
  { label: 'Action', value: 'action', description: 'A short script you run while a bot is online.' },
];
const LANGUAGES = [{ label: 'JavaScript', value: 'js' }, { label: 'TypeScript', value: 'ts' }];

export function NewPluginSheet({
  visible,
  onCreate,
  onClose,
}: {
  visible: boolean;
  /** Throws to show an error and keep the sheet open. */
  onCreate: (input: NewPluginInput) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [scriptType, setScriptType] = useState<NewPluginInput['scriptType']>('script');
  const [language, setLanguage] = useState<NewPluginInput['language']>('js');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!visible) return;
    setName('');
    setDescription('');
    setError(null);
  }, [visible]);

  const submit = async () => {
    const trimmed = name.trim();
    const invalid = validateNewPlugin(trimmed, description.trim());
    if (invalid) return setError(invalid.name ?? invalid.description ?? null);
    setSaving(true);
    try {
      await onCreate({ name: trimmed, description: description.trim(), scriptType, language });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not create the plugin.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} accessibilityLabel="New plugin">
      <View style={styles.sheet}>
        <Txt variant="heading">New plugin</Txt>
        <TextInput
          autoFocus
          accessibilityLabel="Plugin name"
          value={name}
          onChangeText={setName}
          maxLength={32}
          placeholder="Plugin name"
          placeholderTextColor={colors.textFaint}
          style={styles.input}
        />
        <TextInput
          accessibilityLabel="Plugin description"
          value={description}
          onChangeText={setDescription}
          maxLength={100}
          placeholder="What does this plugin do?"
          placeholderTextColor={colors.textFaint}
          style={styles.input}
        />
        <PickerField title="Type" options={TYPES} value={scriptType} onChange={(value) => setScriptType(value as NewPluginInput['scriptType'])} />
        <PickerField title="Language" options={LANGUAGES} value={language} onChange={(value) => setLanguage(value as NewPluginInput['language'])} />
        {error ? <Txt variant="faint" style={styles.error} accessibilityRole="alert">{error}</Txt> : null}
        <Button title="Create plugin" full loading={saving} disabled={!name.trim()} onPress={() => void submit()} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheet: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.md },
  input: { minHeight: process.env.EXPO_OS === 'android' ? 52 : 48, paddingHorizontal: spacing.md, borderRadius: radii.md, borderCurve: 'continuous', backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, color: colors.text, fontSize: font.size.md },
  error: { color: colors.danger },
});
