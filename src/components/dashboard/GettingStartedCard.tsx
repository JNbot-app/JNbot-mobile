import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { NativeIcon } from '../NativeIcon';
import { IconButton, Txt } from '../ui';
import { colors, font, radii, spacing } from '../../theme/theme';
import type { GettingStartedStep, GettingStartedStepId } from '../../features/onboarding/gettingStarted';

const ROUTES: Partial<Record<GettingStartedStepId, Href>> = {
  account: '/(app)/alt/editor',
  bot: { pathname: '/(app)/bots', params: { join: '1' } },
  script: '/(app)/automation',
};

export function GettingStartedCard({ steps, onDismiss }: { steps: GettingStartedStep[]; onDismiss: () => void }) {
  const router = useRouter();
  const doneCount = steps.filter((step) => step.done).length;
  const nextId = steps.find((step) => !step.done)?.id;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Txt variant="heading">Get started</Txt>
          <Txt variant="muted">{doneCount} of {steps.length} done</Txt>
        </View>
        <IconButton accessibilityLabel="Hide getting started" bg="transparent" onPress={onDismiss}>
          <NativeIcon sf="xmark" material="close" size={18} color={colors.textMuted} />
        </IconButton>
      </View>

      {steps.map((step) => {
        const route = ROUTES[step.id];
        const next = step.id === nextId;
        return (
          <Pressable
            key={step.id}
            accessibilityRole="button"
            accessibilityState={{ disabled: step.done || !route, checked: step.done }}
            disabled={step.done || !route}
            onPress={() => route && router.push(route)}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          >
            <View style={[styles.check, step.done && styles.checkDone, next && styles.checkNext]}>
              {step.done ? <NativeIcon sf="checkmark" material="check" size={13} color={colors.primaryOn} /> : null}
            </View>
            <Txt
              variant="none"
              style={[styles.title, step.done && styles.titleDone, next && styles.titleNext]}
              numberOfLines={1}
            >
              {step.title}
            </Txt>
            {!step.done && route ? (
              <NativeIcon sf="chevron.right" material="chevron-right" size={17} color={next ? colors.primary : colors.textFaint} />
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.sm,
    paddingBottom: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: spacing.lg,
    paddingRight: spacing.xs,
    paddingTop: spacing.sm,
  },
  headerCopy: {
    flex: 1,
    gap: 2,
  },
  row: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  rowPressed: {
    backgroundColor: colors.surfaceHover,
  },
  check: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  checkDone: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  checkNext: {
    borderColor: colors.primary,
  },
  title: {
    flex: 1,
    color: colors.textMuted,
    fontSize: font.size.base,
  },
  titleDone: {
    color: colors.textFaint,
    textDecorationLine: 'line-through',
  },
  titleNext: {
    color: colors.text,
    fontWeight: '600',
  },
});
