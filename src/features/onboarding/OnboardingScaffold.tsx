import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenSafeArea } from '../../components/ScreenSafeArea';
import { Txt } from '../../components/ui';
import { colors, radii, spacing } from '../../theme/theme';

const STEP_COUNT = 3;

type Props = {
  title: string;
  subtitle?: string;
  /** 1-based step of the new-user setup; omitted on screens outside the steps. */
  step?: number;
  hero?: React.ReactNode;
  footer?: React.ReactNode;
  onBack?: () => void;
  children?: React.ReactNode;
};

/** Shared layout for every onboarding screen: navigation row, step progress, title, content and pinned footer. */
export function OnboardingScaffold({ title, subtitle, step, hero, footer, onBack, children }: Props) {
  return (
    <ScreenSafeArea style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
      {onBack || step ? (
        <View style={styles.navigation}>
          {onBack ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back"
              onPress={onBack}
              style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
            >
              <Ionicons name="chevron-back" size={25} color={colors.text} />
            </Pressable>
          ) : null}
          {step ? <StepProgress step={step} /> : null}
        </View>
      ) : null}

      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.scroll}>
        <View style={[styles.header, hero ? styles.heroHeader : null]}>
          {hero}
          <Txt variant="title" style={hero ? styles.centered : undefined}>{title}</Txt>
          {subtitle ? <Txt variant="body" style={[styles.subtitle, hero ? styles.centered : null]}>{subtitle}</Txt> : null}
        </View>
        {children}
      </ScrollView>

      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </ScreenSafeArea>
  );
}

function StepProgress({ step }: { step: number }) {
  return (
    <View style={styles.progress} accessible accessibilityLabel={`Step ${step} of ${STEP_COUNT}`}>
      <Txt variant="faint">Step {step} of {STEP_COUNT}</Txt>
      <View style={styles.bars}>
        {Array.from({ length: STEP_COUNT }, (_, index) => (
          <View key={index} style={[styles.bar, index < step && styles.barDone]} />
        ))}
      </View>
    </View>
  );
}

type ChoiceProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  badge?: string;
  onPress: () => void;
};

/** Large tappable option used for the questions in onboarding. */
export function ChoiceCard({ icon, title, subtitle, badge, onPress }: ChoiceProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={subtitle}
      onPress={onPress}
      style={({ pressed }) => [styles.choice, pressed && styles.pressed]}
    >
      <View style={styles.choiceIcon}>
        <Ionicons name={icon} size={24} color={colors.primary} />
      </View>
      <View style={styles.choiceCopy}>
        <View style={styles.choiceTitleRow}>
          <Txt variant="heading" style={styles.choiceTitle}>{title}</Txt>
          {badge ? <Txt variant="faint" style={styles.badge}>{badge}</Txt> : null}
        </View>
        <Txt variant="muted">{subtitle}</Txt>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textFaint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  navigation: {
    width: '100%',
    maxWidth: 580,
    alignSelf: 'center',
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  backButton: {
    width: process.env.EXPO_OS === 'android' ? 48 : 44,
    height: process.env.EXPO_OS === 'android' ? 48 : 44,
    marginLeft: -spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
  },
  progress: {
    flex: 1,
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  bars: {
    flexDirection: 'row',
    gap: 4,
  },
  bar: {
    width: 28,
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceAlt,
  },
  barDone: {
    backgroundColor: colors.primary,
  },
  scroll: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 580,
    alignSelf: 'center',
    gap: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  header: {
    gap: spacing.sm,
  },
  heroHeader: {
    alignItems: 'center',
    paddingTop: spacing.xl,
  },
  subtitle: {
    color: colors.textMuted,
  },
  centered: {
    textAlign: 'center',
  },
  footer: {
    width: '100%',
    maxWidth: 580,
    alignSelf: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  choice: {
    minHeight: 84,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderCurve: 'continuous',
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
  },
  choiceIcon: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    borderCurve: 'continuous',
    backgroundColor: colors.primarySoft,
  },
  choiceCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  choiceTitleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
  choiceTitle: {
    flexShrink: 1,
  },
  badge: {
    overflow: 'hidden',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radii.pill,
    color: colors.primary,
    backgroundColor: colors.primarySoft,
    fontWeight: '600',
  },
  pressed: {
    backgroundColor: colors.surfaceHover,
  },
});
