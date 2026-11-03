import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { MCAvatar } from '../../components/MCAvatar';
import { ProfileIcon } from '../../components/ProfileIcon';
import { Button, Txt } from '../../components/ui';
import { useStore } from '../../store/store';
import { colors, radii, spacing } from '../../theme/theme';
import { OnboardingScaffold } from './OnboardingScaffold';

type Props = { onBack: () => void; onSkip: () => void };

/** Step 3: hand off to the regular join sheet with the new account preselected. */
export function JoinStep({ onBack, onSkip }: Props) {
  const router = useRouter();
  const profile = useStore((state) => state.profiles.find((item) => item.id === state.activeProfileKey));
  const username = useStore((state) => state.alts[0]?.username);
  const server = profile?.name ?? 'the server';

  return (
    <OnboardingScaffold
      step={3}
      onBack={onBack}
      title="Start your first bot"
      subtitle="Your bot joins the server and shows up in the Bots tab, where you can watch it, chat and run scripts."
      footer={
        <>
          <Button
            title={`Join ${server}`}
            full
            icon={<Ionicons name="play" size={18} color={colors.primaryOn} />}
            onPress={() => router.replace({ pathname: '/(app)/bots', params: { join: '1', username } })}
          />
          <Button title="Go to Overview" variant="ghost" full onPress={onSkip} />
        </>
      }
    >
      <View style={styles.summary}>
        {username ? <MCAvatar username={username} size={48} /> : null}
        <Ionicons name="arrow-forward" size={20} color={colors.textFaint} />
        <ProfileIcon uri={profile?.icon} color={profile?.color} size={48} />
      </View>
      <Txt variant="muted" style={styles.caption}>
        {username ? `${username} → ${server}` : server}
      </Txt>
    </OnboardingScaffold>
  );
}

const styles = StyleSheet.create({
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.xl,
    borderRadius: radii.lg,
    borderCurve: 'continuous',
    backgroundColor: colors.surface,
  },
  caption: {
    textAlign: 'center',
  },
});
