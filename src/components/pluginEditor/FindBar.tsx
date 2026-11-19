import React from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { NativeIcon } from '../NativeIcon';
import { Button, Txt } from '../ui';
import { colors, font, radii, spacing } from '../../theme/theme';

/** Find-in-code row under the header: query, "3 of 12", previous / next. */
export function FindBar({
  query,
  onChangeQuery,
  index,
  total,
  onStep,
  onClose,
}: {
  query: string;
  onChangeQuery: (query: string) => void;
  index: number;
  total: number;
  onStep: (direction: 1 | -1) => void;
  onClose: () => void;
}) {
  const arrow = (direction: 1 | -1) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={direction > 0 ? 'Next match' : 'Previous match'}
      accessibilityState={{ disabled: !total }}
      disabled={!total}
      hitSlop={6}
      onPress={() => onStep(direction)}
      style={({ pressed }) => [styles.arrow, (pressed || !total) && styles.dim]}
    >
      <NativeIcon
        sf={direction > 0 ? 'chevron.down' : 'chevron.up'}
        material={direction > 0 ? 'keyboard-arrow-down' : 'keyboard-arrow-up'}
        size={20}
        color={colors.text}
      />
    </Pressable>
  );
  return (
    <View style={styles.bar}>
      <View style={styles.field}>
        <NativeIcon sf="magnifyingglass" material="search" size={16} color={colors.textFaint} />
        <TextInput
          autoFocus
          accessibilityLabel="Find in code"
          placeholder="Find"
          placeholderTextColor={colors.textFaint}
          value={query}
          onChangeText={onChangeQuery}
          onSubmitEditing={() => onStep(1)}
          submitBehavior="submit"
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
        />
        {query ? <Txt variant="faint" style={styles.count}>{total ? `${index + 1} of ${total}` : 'None'}</Txt> : null}
      </View>
      {arrow(-1)}
      {arrow(1)}
      <Button title="Done" variant="ghost" small onPress={onClose} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  field: {
    flex: 1,
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderCurve: 'continuous',
    backgroundColor: colors.surface,
  },
  input: { flex: 1, paddingVertical: spacing.sm, color: colors.text, fontSize: font.size.md },
  count: { fontVariant: ['tabular-nums'] },
  arrow: { width: 36, height: 44, alignItems: 'center', justifyContent: 'center' },
  dim: { opacity: 0.4 },
});
