import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, Txt } from '../ui';
import { colors, font, radii, spacing } from '../../theme/theme';
import { compactCount, compactDuration } from '../../features/dashboardStats';

export interface KpiGridItem {
  label: string;
  value: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  bg: string;
}

interface AltKpiGridProps {
  rankCount: number;
  gkitCount: number;
  playTimeMs: number;
  joinCount: number;
}

export function AltKpiGrid({
  rankCount,
  gkitCount,
  playTimeMs,
  joinCount,
}: AltKpiGridProps) {
  const kpis: KpiGridItem[] = [
    {
      label: 'Ranks',
      value: String(rankCount),
      icon: 'star-outline',
      color: colors.primary,
      bg: colors.primarySoft,
    },
    {
      label: 'GKits',
      value: String(gkitCount),
      icon: 'gift-outline',
      color: colors.info,
      bg: colors.infoSoft,
    },
    {
      label: 'Play Time',
      value: playTimeMs > 0 ? compactDuration(playTimeMs) : '0m',
      icon: 'time-outline',
      color: colors.warning,
      bg: colors.warningSoft,
    },
    {
      label: 'Joins',
      value: compactCount(joinCount),
      icon: 'log-in-outline',
      color: colors.success,
      bg: colors.successSoft,
    },
  ];

  return <KpiGrid items={kpis} />;
}

export function KpiGrid({ items }: { items: KpiGridItem[] }) {
  return (
    <View style={styles.grid}>
      {items.map((kpi, index) => (
        <Card key={`${kpi.label}-${index}`} style={styles.cell}>
          <View style={styles.cellHeader}>
            {kpi.icon ? (
              <View style={[styles.iconContainer, { backgroundColor: kpi.bg }]}>
                <Ionicons name={kpi.icon} size={15} color={kpi.color} />
              </View>
            ) : null}
            <Txt variant="faint" style={styles.label}>
              {kpi.label}
            </Txt>
          </View>
          <Txt variant="heading" style={styles.value}>
            {kpi.value}
          </Txt>
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  cell: {
    flex: 1,
    minWidth: '47%',
    padding: spacing.md,
    gap: 6,
    backgroundColor: colors.surface,
  },
  cellHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  iconContainer: {
    width: 26,
    height: 26,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  value: {
    fontSize: 19,
    fontWeight: '700',
    color: colors.text,
  },
});
