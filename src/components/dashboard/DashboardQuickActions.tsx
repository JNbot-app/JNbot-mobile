import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { NativeIcon } from '../NativeIcon';
import { Txt } from '../ui';
import { colors, font, radii, spacing } from '../../theme/theme';

export function DashboardQuickActions({ canJoinBot, canUsePlugins }: { canJoinBot: boolean; canUsePlugins: boolean }) {
  const router = useRouter();

  return (
    <View style={styles.bar}>
      {canJoinBot && (
        <QuickAction
          sf="plus"
          material="add"
          label="Join bot"
          onPress={() => router.push({ pathname: '/(app)/bots', params: { join: '1' } })}
        />
      )}
      {canUsePlugins && (
        <QuickAction
          sf="storefront"
          material="storefront"
          label="Market"
          onPress={() => router.push('/(app)/plugin-marketplace')}
        />
      )}
      <QuickAction
        sf="terminal"
        material="terminal"
        label="Console"
        onPress={() => router.push('/(app)/logs')}
      />
      <QuickAction
        sf="slider.horizontal.3"
        material="tune"
        label="Settings"
        onPress={() => router.push('/(app)/settings')}
      />
    </View>
  );
}

type QuickActionProps = Pick<React.ComponentProps<typeof NativeIcon>, 'sf' | 'material'> & {
  label: string;
  onPress: () => void;
};

function QuickAction({ sf, material, label, onPress }: QuickActionProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
    >
      <View style={styles.icon}>
        <NativeIcon sf={sf} material={material} size={20} color={colors.textMuted} />
      </View>
      <Txt variant="none" numberOfLines={1} style={styles.label}>{label}</Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.xs,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
    borderRadius: radii.xl,
    borderCurve: 'continuous',
  },
  action: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    borderCurve: 'continuous',
  },
  actionPressed: { backgroundColor: colors.surfaceHover },
  icon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
    borderCurve: 'continuous',
    backgroundColor: colors.surfaceAlt,
  },
  label: { color: colors.text, fontSize: font.size.caption, fontWeight: '600' },
});
