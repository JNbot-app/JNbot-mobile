import React from 'react';
import { Platform, StyleSheet, Switch, TextInput, View } from 'react-native';
import { Txt } from '../ui';
import { colors, font, radii, spacing } from '../../theme/theme';

export function SettingsField({ label, ...props }: { label: string } & React.ComponentProps<typeof TextInput>) {
  return <View style={styles.field}><Txt variant="label">{label}</Txt><TextInput {...props} accessibilityLabel={props.accessibilityLabel ?? label} autoCorrect={props.autoCorrect ?? false} placeholderTextColor={colors.textFaint} style={[styles.input, props.style]} /></View>;
}

export function SettingsToggle({ label, description, value, onChange }: { label: string; description?: string; value: boolean; onChange: (value: boolean) => void }) {
  return <View style={styles.field}>
    <View style={styles.row}><Txt style={styles.grow}>{label}</Txt><Switch accessibilityLabel={label} value={value} onValueChange={onChange} ios_backgroundColor={colors.surfaceAlt} trackColor={{ false: colors.surfaceAlt, true: colors.primary }} thumbColor={Platform.OS === 'android' ? (value ? colors.primary : colors.textMuted) : undefined} /></View>
    {description ? <Txt variant="faint">{description}</Txt> : null}
  </View>;
}

const styles = StyleSheet.create({
  field: { gap: spacing.sm },
  row: { minHeight: Platform.OS === 'android' ? 48 : 44, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  grow: { flex: 1 },
  input: { minHeight: Platform.OS === 'android' ? 48 : 44, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, backgroundColor: colors.bgElevated, color: colors.text, fontSize: font.size.md },
});
