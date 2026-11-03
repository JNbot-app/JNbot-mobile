import React from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Txt } from '../../components/ui';
import type { MarketEntry } from '../../generated/client-contract/share';
import { colors, font, radii, spacing } from '../../theme/theme';
import { KindBanner } from './KindTile';

const HEIGHT = 190;

/** Full-bleed banner cards, one per swipe, with the next one peeking in. */
export function MarketFeatured({ entries, onPress }: { entries: MarketEntry[]; onPress: (entry: MarketEntry) => void }) {
  const { width } = useWindowDimensions();
  const cardWidth = width - spacing.lg * 2 - spacing.xl;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      decelerationRate="fast"
      snapToInterval={cardWidth + spacing.md}
      contentContainerStyle={styles.row}
      style={styles.bleed}
    >
      {entries.map((entry) => (
        <Pressable
          key={entry.id}
          accessibilityRole="button"
          accessibilityLabel={`${entry.listing.title} by ${entry.publisher.name}`}
          onPress={() => onPress(entry)}
          style={({ pressed }) => [styles.card, { width: cardWidth }, pressed && { opacity: 0.85 }]}
        >
          <KindBanner kind={entry.kind} color={entry.listing.color} src={entry.bannerUrl} height={HEIGHT} />
          <View style={styles.caption}>
            <Txt variant="none" numberOfLines={1} style={styles.title}>{entry.listing.title}</Txt>
            <Txt variant="none" numberOfLines={1} style={styles.byline}>{entry.publisher.name}</Txt>
          </View>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bleed: { marginHorizontal: -spacing.lg },
  row: { gap: spacing.md, paddingHorizontal: spacing.lg },
  card: { height: HEIGHT, overflow: 'hidden', borderRadius: radii.xl, borderCurve: 'continuous', backgroundColor: colors.surface },
  caption: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: 'rgba(0,0,0,0.58)' },
  title: { fontSize: font.size.lg, fontWeight: font.weight.bold, color: '#fff' },
  byline: { fontSize: font.size.sm, color: 'rgba(255,255,255,0.78)' },
});
