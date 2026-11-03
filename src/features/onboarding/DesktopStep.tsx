import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '../../components/ui';
import { spacing } from '../../theme/theme';
import { ChoiceCard, OnboardingScaffold } from './OnboardingScaffold';

type Props = {
  onBack: () => void;
  onImport: () => void;
  onRemote: () => void;
  onStartFresh: () => void;
};

export function DesktopStep({ onBack, onImport, onRemote, onStartFresh }: Props) {
  return (
    <OnboardingScaffold
      onBack={onBack}
      title="Bring your desktop setup"
      subtitle="Choose how this phone works with JNbot Desktop."
      footer={<Button title="Start fresh instead" variant="ghost" full onPress={onStartFresh} />}
    >
      <View style={styles.choices}>
        <ChoiceCard
          icon="phone-portrait-outline"
          title="Copy my setup to this phone"
          badge="Recommended"
          subtitle="Your profiles, accounts and plugins move over. Bots run on this phone."
          onPress={onImport}
        />
        <ChoiceCard
          icon="qr-code-outline"
          title="Control my desktop"
          subtitle="Bots keep running on your computer. Use this phone as a remote."
          onPress={onRemote}
        />
      </View>
    </OnboardingScaffold>
  );
}

const styles = StyleSheet.create({
  choices: {
    gap: spacing.md,
  },
});
