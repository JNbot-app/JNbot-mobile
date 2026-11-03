import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Card, Txt } from '../ui';
import { colors, font, radii, spacing } from '../../theme/theme';
import type {
  StatsBreakdownItem,
  StatsGamemode,
  StatsSectionData,
} from '../../generated/client-contract/profileUiSchema';

function GamemodeTile({
  gamemode,
  selected,
  onPress,
}: {
  gamemode: StatsGamemode;
  selected: boolean;
  onPress: () => void;
}) {
  const ring = gamemode.accent ?? colors.primary;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      accessibilityLabel={gamemode.label}
      style={({ pressed }) => [
        styles.tile,
        selected && { backgroundColor: `${ring}1f`, borderColor: `${ring}88` },
        pressed && !selected && { backgroundColor: colors.surfaceHover },
      ]}
    >
      <Txt style={styles.tileIcon}>{gamemode.icon ?? '🎮'}</Txt>
      <Txt variant="faint" numberOfLines={1} style={styles.tileLabel}>
        {gamemode.label}
      </Txt>
    </Pressable>
  );
}

function BreakdownCell({ item }: { item: StatsBreakdownItem }) {
  const negative = item.delta?.trim().startsWith('-');
  return (
    <View style={styles.cell}>
      <Txt variant="faint" numberOfLines={1}>{item.label}</Txt>
      <Txt variant="heading" style={styles.cellValue} numberOfLines={1} adjustsFontSizeToFit>
        {item.value}
      </Txt>
      {item.rank || item.delta ? (
        <View style={styles.cellMeta}>
          {item.rank ? <Txt variant="faint">rank {item.rank}</Txt> : null}
          {item.delta ? (
            <Txt
              variant="faint"
              style={[
                styles.delta,
                negative
                  ? { color: colors.danger, backgroundColor: colors.dangerSoft }
                  : { color: colors.success, backgroundColor: colors.successSoft },
              ]}
            >
              {item.delta}
            </Txt>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export function ProfileStatsCard({ data }: { data: StatsSectionData }) {
  const initial = data.selected ?? data.gamemodes[0]?.id ?? '';
  const [selected, setSelected] = useState(initial);

  useEffect(() => setSelected(initial), [initial]);

  const active = data.gamemodes.find((gamemode) => gamemode.id === selected);
  // A per-gamemode breakdown overrides the top-level fallback (as on desktop).
  const breakdown = active?.breakdown ?? data.breakdown;

  const select = (id: string) => {
    if (process.env.EXPO_OS === 'ios') void Haptics.selectionAsync();
    setSelected(id);
  };

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="stats-chart" size={17} color={colors.primary} />
          <Txt variant="heading" style={styles.title}>Stats</Txt>
        </View>
        <Txt variant="faint">{active?.label ?? selected}</Txt>
      </View>

      {data.gamemodes.length ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tiles}
        >
          {data.gamemodes.map((gamemode) => (
            <GamemodeTile
              key={gamemode.id}
              gamemode={gamemode}
              selected={gamemode.id === selected}
              onPress={() => select(gamemode.id)}
            />
          ))}
        </ScrollView>
      ) : null}

      {breakdown.length ? (
        <View style={styles.grid}>
          {breakdown.map((item, index) => (
            <BreakdownCell key={`${selected}-${item.label}-${index}`} item={item} />
          ))}
        </View>
      ) : (
        <Txt variant="muted" style={styles.empty}>No stats for this gamemode.</Txt>
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
  tiles: {
    gap: spacing.sm,
  },
  tile: {
    width: 84,
    height: 72,
    padding: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tileIcon: {
    fontSize: 22,
    lineHeight: 26,
  },
  tileLabel: {
    fontSize: 11,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: spacing.md,
  },
  cell: {
    width: '50%',
    paddingRight: spacing.sm,
    gap: 2,
  },
  cellValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  cellMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  delta: {
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radii.sm,
    overflow: 'hidden',
  },
  empty: {
    color: colors.textFaint,
    fontSize: font.size.caption,
  },
});
