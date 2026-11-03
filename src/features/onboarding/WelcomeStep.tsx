import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { JNbotLogo } from '../../components/JNbotLogo';
import { Txt } from '../../components/ui';
import { colors, radii, spacing } from '../../theme/theme';
import { ChoiceCard, OnboardingScaffold } from './OnboardingScaffold';

const FEATURES: { icon: keyof typeof Ionicons.glyphMap; text: string }[] = [
  { icon: 'people-outline', text: 'Bots join Minecraft servers with your accounts.' },
  { icon: 'git-network-outline', text: 'Scripts handle AFK, farming and other routines.' },
  { icon: 'chatbubbles-outline', text: 'Watch, chat and control them from anywhere.' },
];

type Props = { onDesktop: () => void; onNew: () => void };

export function WelcomeStep({ onDesktop, onNew }: Props) {
  return (
    <OnboardingScaffold
      hero={<JNbotLogo size={76} />}
      title="Welcome to JNbot"
      subtitle="Run Minecraft bots right from your phone."
    >
      <View style={styles.features}>
        {FEATURES.map((feature) => (
          <View key={feature.icon} style={styles.feature}>
            <View style={styles.featureIcon}>
              <Ionicons name={feature.icon} size={18} color={colors.primary} />
            </View>
            <Txt variant="muted" style={styles.featureText}>{feature.text}</Txt>
          </View>
        ))}
      </View>

      <View style={styles.question}>
        <Txt variant="heading">Have you used JNbot on your computer?</Txt>
        <ChoiceCard
          icon="desktop-outline"
          title="Yes, I use JNbot Desktop"
          subtitle="Copy your setup or control it from here."
          onPress={onDesktop}
        />
        <ChoiceCard
          icon="sparkles-outline"
          title="I'm new to JNbot"
          subtitle="Set up your first bot in three steps."
          onPress={onNew}
        />
      </View>
    </OnboardingScaffold>
  );
}

const styles = StyleSheet.create({
  features: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderCurve: 'continuous',
    backgroundColor: colors.surface,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  featureIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
    borderCurve: 'continuous',
    backgroundColor: colors.primarySoft,
  },
  featureText: {
    flex: 1,
    color: colors.text,
  },
  question: {
    gap: spacing.md,
  },
});
