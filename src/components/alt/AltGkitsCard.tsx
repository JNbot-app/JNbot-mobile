import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, Txt } from '../ui';
import { colors, font, radii, spacing } from '../../theme/theme';

interface GkitGroup {
  gamemode: string;
  items: string[];
}

interface AltGkitsCardProps {
  groups: GkitGroup[];
}

export function AltGkitsCard({ groups }: AltGkitsCardProps) {
  const totalCount = groups.reduce((total, group) => total + group.items.length, 0);

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="gift" size={17} color={colors.info} />
          <Txt variant="heading" style={styles.title}>
            GKits
          </Txt>
        </View>
        <Txt variant="faint">
          {totalCount} {totalCount === 1 ? 'gkit' : 'gkits'}
        </Txt>
      </View>

      {groups.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Txt variant="muted" style={styles.emptyText}>
            No GKits configured for this account.
          </Txt>
        </View>
      ) : (
        <View style={styles.groupList}>
          {groups.map((group) => (
            <View key={group.gamemode} style={styles.groupContainer}>
              <View style={styles.groupHeader}>
                <Txt variant="faint" style={styles.groupTitle}>
                  {group.gamemode.replace(/_/g, ' ')}
                </Txt>
                <Txt variant="faint" style={styles.groupCount}>
                  {group.items.length}
                </Txt>
              </View>
              <View style={styles.chipRow}>
                {group.items.map((gkit) => (
                  <View key={gkit} style={styles.chip}>
                    <Txt variant="faint" style={styles.chipText}>
                      {gkit}
                    </Txt>
                  </View>
                ))}
              </View>
            </View>
          ))}
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
  groupList: {
    gap: spacing.sm,
  },
  groupContainer: {
    padding: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.sm,
    gap: 6,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  groupTitle: {
    fontSize: font.size.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: colors.textMuted,
  },
  groupCount: {
    fontSize: 11,
    color: colors.textFaint,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
  },
  chipText: {
    fontSize: font.size.xs,
    color: colors.text,
    fontWeight: '500',
  },
});
