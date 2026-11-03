import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { MCAvatar } from '../../components/MCAvatar';
import { Button, Txt } from '../../components/ui';
import { useStore } from '../../store/store';
import { colors, radii, spacing } from '../../theme/theme';
import { OnboardingScaffold } from './OnboardingScaffold';

type Props = { onContinue: () => void; onSkip: () => void };

/** Step 2: add the Minecraft account bots log in with. Uses the regular alt editor. */
export function AccountStep({ onContinue, onSkip }: Props) {
  const router = useRouter();
  const alts = useStore((state) => state.alts);
  const addAccount = () => router.push('/(app)/alt/editor');

  return (
    <OnboardingScaffold
      step={2}
      title="Add your Minecraft account"
      subtitle="Bots join the server as one of your accounts. Sign in with Microsoft, or use any name on offline servers."
      footer={alts.length ? (
        <>
          <Button title="Continue" full onPress={onContinue} />
          <Button title="Add another account" variant="ghost" full onPress={addAccount} />
        </>
      ) : (
        <>
          <Button
            title="Add account"
            full
            icon={<Ionicons name="person-add-outline" size={18} color={colors.primaryOn} />}
            onPress={addAccount}
          />
          <Button title="Skip for now" variant="ghost" full onPress={onSkip} />
        </>
      )}
    >
      {alts.length ? (
        <View style={styles.group}>
          {alts.map((alt, index) => (
            <View key={alt.username} style={[styles.row, index > 0 && styles.separator]}>
              <MCAvatar username={alt.username} size={40} />
              <Txt variant="heading" numberOfLines={1} style={styles.name}>{alt.username}</Txt>
              <Ionicons name="checkmark-circle" size={22} color={colors.success} />
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.note}>
          <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />
          <Txt variant="muted" style={styles.noteText}>Accounts are stored securely on this phone.</Txt>
        </View>
      )}
    </OnboardingScaffold>
  );
}

const styles = StyleSheet.create({
  group: {
    overflow: 'hidden',
    borderRadius: radii.lg,
    borderCurve: 'continuous',
    backgroundColor: colors.surface,
  },
  row: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
  },
  separator: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSubtle,
  },
  name: {
    flex: 1,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  noteText: {
    flex: 1,
  },
});
