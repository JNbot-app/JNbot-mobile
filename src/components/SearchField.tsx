import React from 'react';
import { StyleSheet, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, font, radii, spacing } from '../theme/theme';
import { NativeIcon } from './NativeIcon';

export function SearchField({
  value,
  onChangeText,
  placeholder,
  accessibilityLabel,
  style,
  children,
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  /** Trailing actions, e.g. a sort or refresh button. */
  children?: React.ReactNode;
}) {
  return (
    <View style={[styles.field, style]}>
      <NativeIcon sf="magnifyingglass" material="search" size={18} color={colors.textFaint} />
      <TextInput
        accessibilityLabel={accessibilityLabel ?? placeholder}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textFaint}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        clearButtonMode="while-editing"
        style={styles.input}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    minHeight: process.env.EXPO_OS === 'android' ? 48 : 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderCurve: 'continuous',
  },
  input: { flex: 1, alignSelf: 'stretch', color: colors.text, fontSize: font.size.md },
});
