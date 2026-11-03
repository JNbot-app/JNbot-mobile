import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Txt } from '../../components/ui';
import { colors, font, radii, spacing } from '../../theme/theme';

type Props = {
  importing?: boolean;
  directStage?: string | null;
};

interface StepItem {
  step: number;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const STEPS: StepItem[] = [
  {
    step: 1,
    title: 'Start Remote Access',
    description: 'On JNbot Desktop, open the Remote page and click "Start remote access".',
    icon: 'desktop-outline',
  },
  {
    step: 2,
    title: 'Select "JNbot Mobile app"',
    description: 'Click on JNbot Mobile app to display your connection QR code.',
    icon: 'qr-code-outline',
  },
  {
    step: 3,
    title: 'Scan QR Code',
    description: 'Tap "Scan Desktop QR" below to scan the code. Approve the transfer prompt on desktop.',
    icon: 'scan-outline',
  },
];

export function DirectTransferGuide({ importing, directStage }: Props) {
  return (
    <View style={styles.container}>
      {importing ? (
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Txt variant="heading" style={styles.progressTitle}>
              {directStage || 'Connecting to desktop…'}
            </Txt>
          </View>
          <Txt variant="faint" style={styles.progressSubtext}>
            Keep both JNbot Desktop and this phone open. If prompted on desktop, click Approve.
          </Txt>
        </View>
      ) : null}

      <View style={styles.stepsCard}>
        <View style={styles.cardHeader}>
          <Ionicons name="git-network-outline" size={17} color={colors.primary} />
          <Txt variant="label" style={styles.cardTitle}>
            How to import configuration
          </Txt>
        </View>

        <View style={styles.stepper}>
          {STEPS.map((item, index) => {
            const isLast = index === STEPS.length - 1;
            return (
              <View key={item.step} style={styles.stepRow}>
                <View style={styles.stepIndicatorCol}>
                  <View style={styles.stepCircle}>
                    <Txt variant="none" style={styles.stepNumber}>
                      {item.step}
                    </Txt>
                  </View>
                  {!isLast ? <View style={styles.stepLine} /> : null}
                </View>

                <View style={[styles.stepContent, !isLast && styles.stepContentSpaced]}>
                  <View style={styles.stepHeader}>
                    <Txt variant="heading" style={styles.stepTitle}>
                      {item.title}
                    </Txt>
                    <Ionicons name={item.icon} size={18} color={colors.textMuted} />
                  </View>
                  <Txt variant="muted" style={styles.stepDescription}>
                    {item.description}
                  </Txt>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  progressCard: {
    padding: spacing.md,
    borderRadius: radii.md,
    borderCurve: 'continuous',
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryDim,
    gap: spacing.xs,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  progressTitle: {
    color: colors.text,
    fontSize: font.size.base,
  },
  progressSubtext: {
    color: colors.textMuted,
    lineHeight: 18,
    marginLeft: 28,
  },
  stepsCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  cardTitle: {
    color: colors.textMuted,
  },
  stepper: {
    gap: 0,
  },
  stepRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  stepIndicatorCol: {
    alignItems: 'center',
    width: 28,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: radii.lg,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: 'rgba(255,122,69,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumber: {
    color: colors.primary,
    fontSize: font.size.caption,
    fontWeight: '700',
  },
  stepLine: {
    flex: 1,
    width: 2,
    backgroundColor: colors.borderSubtle,
    marginVertical: 4,
  },
  stepContent: {
    flex: 1,
    gap: spacing.xs,
  },
  stepContentSpaced: {
    paddingBottom: spacing.lg,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepTitle: {
    fontSize: font.size.base,
    color: colors.text,
  },
  stepDescription: {
    lineHeight: 19,
  },
});
