import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Badge, Card, Txt } from '../ui';
import { PlayerSkin } from '../alt/PlayerSkin';
import { TONE_TO_BG, TONE_TO_HEX } from '../alt/toneColors';
import { colors, font, spacing } from '../../theme/theme';
import type {
  IdentitySectionData,
  ProfileUiPlayer,
} from '../../generated/client-contract/profileUiSchema';

export function ProfileIdentityCard({
  player,
  data,
}: {
  player: ProfileUiPlayer;
  data: IdentitySectionData;
}) {
  return (
    <Card style={styles.card}>
      <PlayerSkin username={player.username} uri={player.skinUrl} />

      <View style={styles.nameRow}>
        {player.displayRank ? (
          <Badge label={player.displayRank} color={TONE_TO_HEX.emerald} bg={TONE_TO_BG.emerald} />
        ) : null}
        <Txt variant="title" selectable style={styles.name} numberOfLines={1}>
          {player.displayName ?? player.username}
        </Txt>
      </View>

      {data.badges?.length ? (
        <View style={styles.badges}>
          {data.badges.map((badge, index) => {
            const color = badge.tone ? TONE_TO_HEX[badge.tone] : colors.textMuted;
            return (
              <Badge
                key={`${badge.label}-${index}`}
                label={badge.label}
                color={color}
                bg={badge.tone ? TONE_TO_BG[badge.tone] : colors.surfaceAlt}
                icon={<Ionicons name="checkmark-circle" size={11} color={color} />}
              />
            );
          })}
        </View>
      ) : null}

      {data.counts?.length ? (
        <View style={styles.counts}>
          {data.counts.map((count) => (
            <View key={count.label} style={styles.count}>
              <Txt variant="heading" style={styles.countValue}>
                {count.value}
              </Txt>
              <Txt variant="faint">{count.label}</Txt>
            </View>
          ))}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    gap: spacing.md,
    backgroundColor: colors.surface,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  name: {
    fontSize: font.size.xl,
    flexShrink: 1,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
  },
  counts: {
    flexDirection: 'row',
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSubtle,
  },
  count: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  countValue: {
    fontSize: 20,
    fontWeight: '700',
  },
});
