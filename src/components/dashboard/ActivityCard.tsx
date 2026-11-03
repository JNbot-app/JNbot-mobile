import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { SectionHeader, Txt } from '../ui';
import { colors, font, radii, spacing } from '../../theme/theme';
import { HISTORY_WEEKS, weekIndex } from '../../generated/client-contract/statsHistory';
import { compactCount, compactDuration, type ActivityMetric, type DashboardStats } from '../../features/dashboardStats';

const METRICS: { key: ActivityMetric; label: string; format: (value: number) => string }[] = [
  { key: 'onlineTime', label: 'Playtime', format: compactDuration },
  { key: 'botsJoined', label: 'Joins', format: compactCount },
  { key: 'scriptsStarted', label: 'Scripts', format: compactCount },
];

const DAY = 86_400_000;
const CHART_HEIGHT = 84;

// Inverse of weekIndex: the week's Monday as a UTC calendar date.
const weekDate = (week: number) =>
  new Date((week * 7 - 3) * DAY).toLocaleDateString(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' });

const haptic = () => {
  if (process.env.EXPO_OS === 'ios') void Haptics.selectionAsync();
};

/** This week's numbers per metric, with a ten-week trend for the selected one. */
export function ActivityCard({ weeks }: { weeks: DashboardStats['weeks'] }) {
  const [metric, setMetric] = useState(METRICS[0]);
  // Weeks back from the current one; 0 is this week.
  const [offset, setOffset] = useState(0);
  if (!METRICS.some(({ key }) => weeks[key].some(Boolean))) return null;

  const current = weekIndex();
  const valueAt = (key: ActivityMetric, back: number) => weeks[key][weeks[key].length - 1 - back] ?? 0;
  const values = Array.from({ length: HISTORY_WEEKS }, (_, i) => valueAt(metric.key, HISTORY_WEEKS - 1 - i));
  const max = Math.max(...values, 1);
  const selectedWeek = current - offset;

  return (
    <>
      <SectionHeader title="Activity" right={<Txt variant="faint">Last {HISTORY_WEEKS} weeks</Txt>} />
      <View style={styles.card}>
        <View style={styles.tiles}>
          {METRICS.map((item) => {
            const active = item.key === metric.key;
            return (
              <Pressable
                key={item.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${item.label}: ${item.format(valueAt(item.key, offset))}`}
                onPress={() => {
                  haptic();
                  setMetric(item);
                }}
                style={[styles.tile, active && styles.tileActive]}
              >
                <Txt variant="none" style={[styles.tileLabel, active && styles.tileLabelActive]} numberOfLines={1}>
                  {item.label.toUpperCase()}
                </Txt>
                <Txt variant="none" style={styles.tileValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
                  {item.format(valueAt(item.key, offset))}
                </Txt>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.chart}>
          {values.map((value, i) => {
            const back = HISTORY_WEEKS - 1 - i;
            return (
              <Pressable
                key={i}
                accessibilityLabel={`${back ? `Week of ${weekDate(current - back)}` : 'This week'}: ${metric.format(value)}`}
                onPress={() => {
                  haptic();
                  setOffset(back === offset ? 0 : back);
                }}
                style={styles.slot}
              >
                <View style={styles.track}>
                  <Bar ratio={value / max} selected={back === offset} />
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.axis}>
          <Txt variant="faint">{weekDate(current - (HISTORY_WEEKS - 1))}</Txt>
          <Txt variant="none" style={offset ? styles.axisSelected : styles.axisLabel}>
            {offset ? `Week of ${weekDate(selectedWeek)}` : 'This week'}
          </Txt>
        </View>
      </View>
    </>
  );
}

function Bar({ ratio, selected }: { ratio: number; selected: boolean }) {
  const height = useSharedValue(0);
  useEffect(() => {
    height.value = withTiming(ratio, { duration: 280 });
  }, [height, ratio]);
  const style = useAnimatedStyle(() => ({ height: `${height.value * 100}%` }));
  return <Animated.View style={[styles.bar, !selected && styles.barMuted, style]} />;
}

const styles = StyleSheet.create({
  card: { gap: spacing.md, padding: spacing.md, backgroundColor: colors.surface, borderRadius: radii.lg, borderCurve: 'continuous', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderSubtle },
  tiles: { flexDirection: 'row', gap: spacing.sm },
  tile: { flex: 1, minWidth: 0, gap: 2, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radii.md, borderCurve: 'continuous', backgroundColor: colors.surfaceAlt },
  tileActive: { backgroundColor: colors.primarySoft },
  tileLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
  tileLabelActive: { color: colors.primary },
  tileValue: { color: colors.text, fontSize: 20, fontWeight: '700', letterSpacing: -0.4, fontVariant: ['tabular-nums'] },
  chart: { height: CHART_HEIGHT, flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  slot: { flex: 1, alignItems: 'center' },
  track: { width: '100%', maxWidth: 16, height: '100%', justifyContent: 'flex-end', borderRadius: radii.pill, backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
  bar: { width: '100%', borderRadius: radii.pill, backgroundColor: colors.primary },
  barMuted: { opacity: 0.4 },
  axis: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  axisLabel: { color: colors.textMuted, fontSize: font.size.xs, fontWeight: '600' },
  axisSelected: { color: colors.primary, fontSize: font.size.xs, fontWeight: '600' },
});
