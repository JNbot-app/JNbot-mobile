import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { NativeIcon } from '../NativeIcon';
import { Txt } from '../ui';
import type { MacroInfo } from '../../store/types';
import { colors, font, radii, spacing } from '../../theme/theme';

export function getPluginIconConfig(plugin: MacroInfo) {
  if (plugin.scriptType === 'action') {
    return {
      sf: 'bolt.fill' as const,
      material: 'bolt' as const,
      color: '#BF5AF2',
      bg: 'rgba(191,90,242,0.14)',
    };
  }
  if (plugin.language === 'recording') {
    return {
      sf: 'video.fill' as const,
      material: 'videocam' as const,
      color: '#64D2FF',
      bg: 'rgba(100,210,255,0.14)',
    };
  }
  if (plugin.language === 'js' || plugin.language === 'ts') {
    return {
      sf: 'chevron.left.forwardslash.chevron.right' as const,
      material: 'code' as const,
      color: plugin.language === 'ts' ? '#0A84FF' : '#FFD60A',
      bg: plugin.language === 'ts' ? 'rgba(10,132,255,0.14)' : 'rgba(255,214,10,0.14)',
    };
  }
  return {
    sf: 'puzzlepiece.extension.fill' as const,
    material: 'extension' as const,
    color: colors.primary,
    bg: colors.primarySoft,
  };
}

interface PluginHeaderProps {
  plugin: MacroInfo;
  onClose?: () => void;
  showClose?: boolean;
  onTogglePin?: () => void;
  isPinned?: boolean;
}

export const PluginHeader: React.FC<PluginHeaderProps> = ({
  plugin,
  onClose,
  showClose = true,
  onTogglePin,
  isPinned = false,
}) => {
  const iconConfig = getPluginIconConfig(plugin);

  if (plugin.banner) {
    return (
      <View style={styles.bannerContainer}>
        <Image
          source={{ uri: plugin.banner }}
          style={styles.bannerImage}
          contentFit="cover"
          transition={150}
        />
        {/* Gradient / tint overlay */}
        <View style={styles.bannerOverlay}>
          <View style={styles.bannerContent}>
            <View style={styles.bannerIconBox}>
              <NativeIcon
                sf={iconConfig.sf}
                material={iconConfig.material}
                size={22}
                color="#FFFFFF"
              />
            </View>
            <View style={styles.bannerCopy}>
              <Txt variant="none" numberOfLines={1} style={styles.bannerTitle}>
                {plugin.name}
              </Txt>
              {plugin.folder ? (
                <Txt variant="none" numberOfLines={1} style={styles.bannerSubtitle}>
                  {plugin.folder}
                </Txt>
              ) : null}
            </View>
          </View>
        </View>
        {/* Top-right actions */}
        <View style={styles.bannerTopActions}>
          {onTogglePin ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isPinned ? 'Unpin from dashboard' : 'Pin to dashboard'}
              hitSlop={8}
              onPress={onTogglePin}
              style={({ pressed }) => [
                styles.bannerActionBtn,
                isPinned && styles.bannerActionBtnPinned,
                pressed && styles.bannerActionBtnPressed,
              ]}
            >
              <NativeIcon
                sf={isPinned ? 'pin.fill' : 'pin'}
                material="push-pin"
                size={16}
                color={isPinned ? colors.primary : '#FFFFFF'}
              />
            </Pressable>
          ) : null}
          {showClose ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={8}
              onPress={onClose}
              style={({ pressed }) => [styles.bannerActionBtn, pressed && styles.bannerActionBtnPressed]}
            >
              <NativeIcon sf="xmark" material="close" size={18} color="#FFFFFF" />
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.header}>
      <View style={[styles.iconBox, { backgroundColor: iconConfig.bg }]}>
        <NativeIcon
          sf={iconConfig.sf}
          material={iconConfig.material}
          size={22}
          color={iconConfig.color}
        />
      </View>
      <View style={styles.headerCopy}>
        <Txt variant="heading" numberOfLines={1}>
          {plugin.name}
        </Txt>
        <Txt variant="muted" numberOfLines={1}>
          {plugin.folder || (plugin.scriptType === 'action' ? 'Action' : 'Plugin')}
        </Txt>
      </View>
      <View style={styles.topActions}>
        {onTogglePin ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isPinned ? 'Unpin from dashboard' : 'Pin to dashboard'}
            hitSlop={10}
            onPress={onTogglePin}
            style={styles.closeBtn}
          >
            <NativeIcon
              sf={isPinned ? 'pin.fill' : 'pin'}
              material="push-pin"
              size={20}
              color={isPinned ? colors.primary : colors.textMuted}
            />
          </Pressable>
        ) : null}
        {showClose ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            hitSlop={10}
            onPress={onClose}
            style={styles.closeBtn}
          >
            <NativeIcon sf="xmark" material="close" size={22} color={colors.text} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  closeBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerContainer: {
    width: '100%',
    aspectRatio: 2.3,
    maxHeight: 180,
    borderRadius: radii.lg,
    borderCurve: 'continuous',
    backgroundColor: colors.surface,
    overflow: 'hidden',
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    paddingTop: spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  bannerIconBox: {
    width: 38,
    height: 38,
    borderRadius: radii.sm,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  bannerCodeBtn: {
    width: 38,
    height: 38,
    borderRadius: radii.sm,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitle: {
    color: "rgb(255,255,255)",
    fontSize: font.size.lg,
    fontWeight: font.weight.semibold,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  bannerSubtitle: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: font.size.xs,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  bannerCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerCloseBtnPressed: {
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  bannerTopActions: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  bannerActionBtn: {
    width: 34,
    height: 34,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerActionBtnPinned: {
    backgroundColor: 'rgba(0,0,0,0.75)',
  },
  bannerActionBtnPressed: {
    backgroundColor: 'rgba(0,0,0,0.85)',
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
