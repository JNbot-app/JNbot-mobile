import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EmptyState, Txt } from '../../components/ui';
import { ProfileIcon } from '../../components/ProfileIcon';
import type { MarketEntry } from '../../generated/client-contract/share';
import { colors, radii, spacing } from '../../theme/theme';

type Props = {
  profiles: MarketEntry[];
  switching: string | null;
  /** Official profiles install in one tap; community ones open their review screen. */
  onInstall: (entry: MarketEntry) => void;
  emptyTitle: string;
  emptySubtitle: string;
};

export function MarketplaceProfileList({ profiles, switching, onInstall, emptyTitle, emptySubtitle }: Props) {
  if (!profiles.length) {
    return (
      <EmptyState
        icon={<Ionicons name="server-outline" size={30} color={colors.textFaint} />}
        title={emptyTitle}
        subtitle={emptySubtitle}
      />
    );
  }

  return (
    <View style={styles.group}>
      {profiles.map((profile, index) => {
        const busy = switching === `marketplace:${profile.id}`;
        return (
          <Pressable
            key={profile.id}
            accessibilityRole="button"
            accessibilityLabel={`Add ${profile.listing.title}`}
            accessibilityState={{ disabled: Boolean(switching) }}
            disabled={Boolean(switching)}
            onPress={() => onInstall(profile)}
            style={({ pressed }) => [styles.row, index > 0 && styles.separator, pressed && styles.pressed]}
          >
            <ProfileIcon uri={profile.bannerUrl} color={profile.listing.color ?? colors.primary} size={44} />
            <View style={styles.copy}>
              <Txt variant="heading" numberOfLines={1}>{profile.listing.title}</Txt>
              <Txt variant="faint" numberOfLines={1}>
                {profile.publisher.official ? 'Official' : `Community · ${profile.publisher.name}`}
                {profile.canInstall ? '' : ` · Needs JNbot ${profile.listing.minAppVersion}`}
              </Txt>
            </View>
            {busy ? (
              <ActivityIndicator color={colors.primary} size="small" />
            ) : (
              <Ionicons name="chevron-forward" size={19} color={colors.textFaint} />
            )}
          </Pressable>
        );
      })}
    </View>
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
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
  },
  separator: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSubtle,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  pressed: {
    backgroundColor: colors.surfaceHover,
  },
});
