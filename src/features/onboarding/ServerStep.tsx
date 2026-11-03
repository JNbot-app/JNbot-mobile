import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Txt } from '../../components/ui';
import { useRouter } from 'expo-router';
import { useConnection } from '../../net/ConnectionProvider';
import { useMarketProfiles } from '../shares';
import type { MarketEntry } from '../../generated/client-contract/share';
import { colors, radii, spacing } from '../../theme/theme';
import { MarketplaceProfileList } from '../profiles/MarketplaceProfileList';
import { OnboardingScaffold } from './OnboardingScaffold';

const PREVIEW_COUNT = 4;

type Props = { onBack: () => void; onCreate: () => void; onAdded: () => void };

/** Step 1: add a ready-made server profile (or create one manually). */
export function ServerStep({ onBack, onCreate, onAdded }: Props) {
  const router = useRouter();
  const { installMarketplaceProfile } = useConnection();
  const { profiles: marketplaceProfiles } = useMarketProfiles();
  const [showAll, setShowAll] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const visible = showAll ? marketplaceProfiles : marketplaceProfiles.slice(0, PREVIEW_COUNT);

  const install = async (entry: MarketEntry) => {
    if (!entry.publisher.official || !entry.canInstall) {
      router.push({ pathname: '/(app)/share/[id]', params: { id: entry.id } });
      return;
    }
    setSwitching(`marketplace:${entry.id}`);
    setError(null);
    try {
      await installMarketplaceProfile(entry.id);
      onAdded();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to add this server.');
    } finally {
      setSwitching(null);
    }
  };

  return (
    <OnboardingScaffold
      step={1}
      onBack={onBack}
      title="Pick a server"
      subtitle="Where should your bots play? You can add more servers later."
    >
      <View style={styles.section}>
        <MarketplaceProfileList
          profiles={visible}
          switching={switching}
          onInstall={(entry) => void install(entry)}
          emptyTitle="No ready-made servers available"
          emptySubtitle="You can still add any Minecraft server yourself."
        />
        {marketplaceProfiles.length > PREVIEW_COUNT ? (
          <LinkRow
            label={showAll ? 'Show fewer servers' : `Show all ${marketplaceProfiles.length} servers`}
            icon={showAll ? 'chevron-up' : 'chevron-down'}
            onPress={() => setShowAll((value) => !value)}
          />
        ) : null}
      </View>

      <LinkRow label="Server not listed? Add it yourself" icon="add-circle-outline" onPress={onCreate} />

      {error ? (
        <View accessibilityRole="alert" style={styles.error}>
          <Ionicons name="alert-circle" size={18} color={colors.danger} />
          <Txt variant="muted" style={styles.errorText}>{error}</Txt>
        </View>
      ) : null}
    </OnboardingScaffold>
  );
}

function LinkRow({ label, icon, onPress }: { label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.link, pressed && styles.pressed]}
    >
      <Txt variant="label" style={styles.linkText}>{label}</Txt>
      <Ionicons name={icon} size={18} color={colors.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
  link: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderRadius: radii.md,
  },
  linkText: {
    color: colors.primary,
  },
  error: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.dangerSoft,
  },
  errorText: {
    flex: 1,
    color: colors.danger,
  },
  pressed: {
    backgroundColor: colors.surfaceHover,
  },
});
