import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, Txt } from '../ui';
import { colors, font, radii, spacing } from '../../theme/theme';

interface RankEntry {
  gamemode: string;
  rank: string;
  color?: string;
  /** Profile UI visual weight: `high` filled, `low` muted. */
  emphasis?: 'high' | 'low';
}

interface AltRanksCardProps {
  ranks: RankEntry[];
}

export function AltRanksCard({ ranks }: AltRanksCardProps) {
  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="star" size={17} color={colors.primary} />
          <Txt variant="heading" style={styles.title}>
            Ranks
          </Txt>
        </View>
        <Txt variant="faint">
          {ranks.length} {ranks.length === 1 ? 'rank' : 'ranks'}
        </Txt>
      </View>

      {ranks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Txt variant="muted" style={styles.emptyText}>
            No ranks assigned to this account.
          </Txt>
        </View>
      ) : (
        <View style={styles.list}>
          {ranks.map((item) => {
            const rankColor = item.color || colors.primary;
            return (
              <View
                key={`${item.gamemode}-${item.rank}`}
                style={[styles.rankRow, item.emphasis === 'low' && styles.rankRowLow]}
              >
                <View style={styles.gamemodeCol}>
                  <Txt variant="body" style={styles.gamemodeName}>
                    {item.gamemode.replace(/_/g, ' ')}
                  </Txt>
                </View>
                <View
                  style={[
                    styles.rankBadge,
                    {
                      borderColor: `${rankColor}44`,
                      backgroundColor: `${rankColor}${item.emphasis === 'high' ? '33' : '14'}`,
                    },
                  ]}
                >
                  <Txt
                    variant="label"
                    style={[styles.rankText, { color: rankColor }]}
                  >
                    {item.rank}
                  </Txt>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    gap: spacing.md,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  title: {
    fontSize: font.size.md,
    fontWeight: '600',
  },
  emptyContainer: {
    paddingVertical: spacing.sm,
  },
  emptyText: {
    color: colors.textFaint,
    fontSize: font.size.caption,
  },
  list: {
    gap: spacing.xs,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.sm,
  },
  rankRowLow: {
    opacity: 0.55,
  },
  gamemodeCol: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  gamemodeName: {
    fontSize: font.size.sm,
    fontWeight: '500',
    color: colors.text,
    textTransform: 'capitalize',
  },
  rankBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  rankText: {
    fontSize: font.size.xs,
    fontWeight: '700',
  },
});
