import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { NativeIcon } from '../NativeIcon';
import { Badge, StatusDot, Txt } from '../ui';
import { getPluginIconConfig } from './PluginHeader';
import { useStore } from '../../store/store';
import type { MacroInfo } from '../../store/types';
import type { ProfileScriptInfo } from '../../hooks/useProfileScriptInfos';
import { colors, radii, spacing } from '../../theme/theme';

export interface AutomationItemCardProps {
  item: MacroInfo | ProfileScriptInfo;
  isPlugin: boolean;
  running?: boolean;
  matchedPlugin?: MacroInfo;
  hasOptionError?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  onPress: (item: MacroInfo | ProfileScriptInfo) => void;
}

export function getAutomationItemIconConfig(
  item: MacroInfo | ProfileScriptInfo,
  isPlugin: boolean,
  matchedPlugin?: MacroInfo,
) {
  if (isPlugin) {
    return getPluginIconConfig(item as MacroInfo);
  }

  const scriptInfo = (item as ProfileScriptInfo).info ?? matchedPlugin;
  if (scriptInfo) {
    return getPluginIconConfig(scriptInfo);
  }

  return {
    sf: 'doc.text.fill' as const,
    material: 'description' as const,
    color: colors.primary,
    bg: colors.primarySoft,
  };
}

function AutomationItemArtwork({
  banner,
  iconConfig,
}: {
  banner?: string;
  iconConfig: ReturnType<typeof getAutomationItemIconConfig>;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <View style={styles.artworkSlot}>
      {banner && !imageFailed ? (
        <Image
          source={{ uri: banner }}
          style={styles.banner}
          contentFit="cover"
          cachePolicy="memory-disk"
          recyclingKey={banner}
          transition={120}
          accessible={false}
          onError={() => setImageFailed(true)}
        />
      ) : (
        <View style={[styles.iconBox, { backgroundColor: iconConfig.bg }]}>
          <NativeIcon
            sf={iconConfig.sf}
            material={iconConfig.material}
            size={21}
            color={iconConfig.color}
          />
        </View>
      )}
    </View>
  );
}

export const AutomationItemCardComponent: React.FC<AutomationItemCardProps> = ({
  item,
  isPlugin,
  running,
  matchedPlugin,
  hasOptionError,
  isFirst = true,
  isLast = true,
  accessibilityLabel,
  accessibilityHint,
  onPress,
}) => {
  const profileScript = !isPlugin ? (item as ProfileScriptInfo) : undefined;
  const iconConfig = getAutomationItemIconConfig(item, isPlugin, matchedPlugin);
  const banner = (
    item.banner ||
    profileScript?.info?.banner ||
    matchedPlugin?.banner
  )?.trim();
  const isPinned = useStore((state) =>
    isPlugin ? Boolean(state.settings.pluginData?.[(item as MacroInfo).pluginId]?.pinned) : false,
  );

  const handlePress = () => {
    if (process.env.EXPO_OS === 'ios') {
      Haptics.selectionAsync().catch(() => {});
    }
    onPress(item);
  };

  const defaultDescription = isPlugin
    ? 'Configure options and run on desktop.'
    : 'Runs with this profile’s configuration.';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? `Configure ${item.name}`}
      accessibilityHint={accessibilityHint ?? "Opens script settings and controls"}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        isFirst && styles.cardFirst,
        isLast && styles.cardLast,
        !isFirst && styles.cardBorderTop,
        pressed && styles.cardPressed,
      ]}
    >
      <AutomationItemArtwork
        key={banner ?? 'icon'}
        banner={banner}
        iconConfig={iconConfig}
      />

      <View style={styles.cardBody}>
        <View style={styles.headerRow}>
          <Txt variant="heading" numberOfLines={1} style={styles.name}>
            {item.name}
          </Txt>
          {isPinned ? (
            <NativeIcon sf="pin.fill" material="push-pin" size={13} color={colors.primary} />
          ) : null}
          {running ? (
            <Badge
              label="Running"
              color={colors.success}
              bg={colors.successSoft}
              icon={<StatusDot color={colors.success} size={6} pulse />}
            />
          ) : null}
          {hasOptionError ? (
            <Badge
              label="Needs setup"
              color={colors.warning}
              bg={colors.warningSoft}
            />
          ) : null}
        </View>

        <Txt variant="muted" numberOfLines={2} style={styles.description}>
          {item.description || defaultDescription}
        </Txt>
      </View>

      <NativeIcon
        sf="chevron.right"
        material="chevron-right"
        size={16}
        color={colors.textFaint}
      />
    </Pressable>
  );
};

export const AutomationItemCard = React.memo(AutomationItemCardComponent);

const styles = StyleSheet.create({
  card: {
    minHeight: process.env.EXPO_OS === 'android' ? 76 : 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
  },
  cardFirst: {
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  cardLast: {
    borderBottomLeftRadius: radii.lg,
    borderBottomRightRadius: radii.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  cardBorderTop: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSubtle,
  },
  cardPressed: {
    backgroundColor: colors.surfaceHover,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  artworkSlot: {
    width: 60,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  banner: {
    width: 60,
    height: 46,
    borderRadius: radii.sm,
    borderCurve: 'continuous',
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: {
    flex: 1,
    minWidth: 0,
  },
  description: {
    lineHeight: 18,
  },
});
