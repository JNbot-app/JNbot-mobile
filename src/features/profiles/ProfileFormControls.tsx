import React from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Txt } from '../../components/ui';
import { SettingsField } from '../../components/settings/SettingsFields';
import { colors, radii, spacing } from '../../theme/theme';

export function ProfileLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return <View style={styles.group}><Txt variant="label">{label}</Txt>{children}</View>;
}
export function ProfileRow({ title, summary, onPress }: { title: string; summary?: string | null; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={summary ? `${title}, ${summary}` : title} onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
    <View style={styles.grow}><Txt>{title}</Txt>{summary ? <Txt variant="muted">{summary}</Txt> : null}</View>
    <Ionicons name="chevron-forward" size={20} color={colors.textFaint} />
  </Pressable>;
}
const BRAND_COLORS = ['#E6BF4C', '#FED53E', '#7C5CFF', '#52C41A', '#1677FF', '#FF4D4F', '#FA8C16', '#EB2F96'];
export function ProfileColorField({ label = 'Brand color', value, onChange }: { label?: string; value: string; onChange: (value: string) => void }) {
  return <ProfileLabel label={label}>
    <View style={styles.swatches}>{BRAND_COLORS.map((color) => <Pressable key={color} accessibilityRole="button" accessibilityLabel={`Use color ${color}`} accessibilityState={{ selected: value.toUpperCase() === color }} onPress={() => onChange(color)} style={[styles.swatch, { backgroundColor: color }]}>
      {value.toUpperCase() === color ? <Ionicons name="checkmark" size={23} color="#000000" /> : null}
    </Pressable>)}</View>
    <SettingsField label="Custom hex color" value={value} onChangeText={onChange} autoCapitalize="characters" placeholder="#E6BF4C" maxLength={7} />
  </ProfileLabel>;
}
const styles = StyleSheet.create({
  group: { gap: spacing.sm }, grow: { flex: 1, gap: spacing.xs },
  row: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderSubtle },
  pressed: { backgroundColor: colors.surfaceHover },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  swatch: { width: Platform.OS === 'android' ? 48 : 44, height: Platform.OS === 'android' ? 48 : 44, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
});
