import React from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Txt } from '../../components/ui';
import { NativeIcon } from '../../components/NativeIcon';
import { SHARE_KIND_INFO, type MarketEntry, type ShareKind } from '../../generated/client-contract/share';
import { colors, font, spacing } from '../../theme/theme';
import { ROW_INSET } from './MarketRow';

export const PER_COLUMN = 3;
const MAX_ENTRIES = 12;

export function Divider() {
  return <View style={styles.divider} />;
}

/** A kind's title with an optional "see all" chevron. */
export function ShelfHeader({ kind, onSeeAll }: { kind: ShareKind; onSeeAll?: () => void }) {
  const title = <Txt variant="none" style={styles.heading}>{SHARE_KIND_INFO[kind].plural}</Txt>;
  if (!onSeeAll) return title;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`See all ${SHARE_KIND_INFO[kind].plural}`} onPress={onSeeAll} style={styles.header}>
      {title}
      <NativeIcon sf="chevron.right" material="chevron-right" size={18} color={colors.textFaint} />
    </Pressable>
  );
}

/** Entries stacked three to a column; columns scroll sideways with the next one peeking in. */
export function MarketShelf({ entries, renderRow }: { entries: MarketEntry[]; renderRow: (entry: MarketEntry) => React.ReactNode }) {
  const { width } = useWindowDimensions();
  const columnWidth = width - spacing.lg * 2 - spacing.xl;
  const columns = Array.from({ length: Math.ceil(Math.min(entries.length, MAX_ENTRIES) / PER_COLUMN) }, (_, index) =>
    entries.slice(index * PER_COLUMN, (index + 1) * PER_COLUMN),
  );
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      decelerationRate="fast"
      snapToInterval={columnWidth + spacing.md}
      contentContainerStyle={styles.columns}
      style={styles.bleed}
    >
      {columns.map((column) => (
        <View key={column[0].id} style={{ width: columnWidth }}>
          {column.map((entry, index) => (
            <React.Fragment key={entry.id}>
              {index > 0 ? <Divider /> : null}
              {renderRow(entry)}
            </React.Fragment>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bleed: { marginHorizontal: -spacing.lg },
  columns: { gap: spacing.md, paddingHorizontal: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start', minHeight: 44 },
  heading: { fontSize: font.size.xl, fontWeight: font.weight.bold, color: colors.text },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: ROW_INSET, backgroundColor: colors.border },
});
