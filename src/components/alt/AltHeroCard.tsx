import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Badge, Card, StatusDot, Txt } from '../ui';
import { PlayerSkin } from './PlayerSkin';
import { colors, font, radii, spacing } from '../../theme/theme';
import type { AltTag, AltWithData } from '../../store/types';

interface AltHeroCardProps {
  alt: AltWithData;
  isOnline: boolean;
  onlineScript?: string;
  tags?: AltTag[];
  displayRank?: string;
}

export function AltHeroCard({
  alt,
  isOnline,
  onlineScript,
  tags = [],
  displayRank,
}: AltHeroCardProps) {
  return (
    <Card style={styles.card}>
      <PlayerSkin username={alt.username} />

      {/* Identity & Badges */}
      <View style={styles.identityContainer}>
        <View style={styles.usernameRow}>
          <Txt variant="title" selectable style={styles.username} numberOfLines={1}>
            {alt.username}
          </Txt>
          {alt.data.premium ? (
            <View style={styles.premiumBadge} accessibilityLabel="Premium Microsoft account">
              <Ionicons name="diamond" size={14} color={colors.info} />
            </View>
          ) : null}
        </View>

        {/* Status indicator */}
        <View style={styles.statusRow}>
          <View style={styles.statusPill}>
            <StatusDot color={isOnline ? colors.online : colors.offline} size={8} pulse={isOnline} />
            <Txt
              variant="faint"
              style={[
                styles.statusText,
                { color: isOnline ? colors.online : colors.textMuted },
              ]}
            >
              {isOnline ? (onlineScript ? `Online · ${onlineScript}` : 'Online') : 'Offline'}
            </Txt>
          </View>

          {displayRank ? (
            <Badge
              label={displayRank}
              color={colors.primary}
              bg={colors.primarySoft}
            />
          ) : null}
        </View>

        {/* Tags */}
        {tags.length > 0 ? (
          <View style={styles.tagsContainer}>
            {tags.map((tag) => (
              <View
                key={tag.id}
                style={[
                  styles.tagChip,
                  { borderColor: tag.color || colors.borderSubtle },
                ]}
              >
                <StatusDot color={tag.color || colors.primary} size={6} />
                <Txt variant="faint" style={styles.tagText}>
                  {tag.name}
                </Txt>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    gap: spacing.md,
    backgroundColor: colors.surface,
  },
  identityContainer: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  username: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  premiumBadge: {
    padding: 3,
    backgroundColor: colors.infoSoft,
    borderRadius: radii.sm,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
    marginTop: 2,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceAlt,
  },
  statusText: {
    fontWeight: '600',
    fontSize: font.size.xs,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tagText: {
    fontSize: 11,
    color: colors.textMuted,
  },
});
