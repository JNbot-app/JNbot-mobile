import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { ActiveBot } from '../../store/types';
import { colors, font, radii, spacing } from '../../theme/theme';
import { BotStatusBadge } from '../cards';
import { BackButton } from '../Screen';
import { MCAvatar } from '../MCAvatar';
import { NativeIcon } from '../NativeIcon';
import { IconButton, Txt } from '../ui';

export type BotDetailTab =
  | 'info'
  | 'chat'
  | 'inventory'
  | 'actions'
  | 'movement'
  | 'map'
  | 'triggers';

export const DEFAULT_BOT_DETAIL_TAB: BotDetailTab = 'chat';

export const BOT_DETAIL_TABS: ReadonlyArray<{
  id: BotDetailTab;
  label: string;
}> = [
  { id: 'info', label: 'Info' },
  { id: 'chat', label: 'Chat' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'actions', label: 'Actions' },
  { id: 'movement', label: 'Move' },
  { id: 'map', label: 'Map' },
  { id: 'triggers', label: 'Triggers' },
];

export function BotDetailHeader({
  bot,
  scriptName,
  canControl,
  canLeave,
  toggleLabel,
  onBack,
  onToggle,
  onStop,
  onLeave,
}: {
  bot: ActiveBot;
  scriptName?: string;
  canControl: boolean;
  canLeave: boolean;
  toggleLabel?: 'Pause' | 'Resume';
  onBack: () => void;
  onToggle?: () => void;
  onStop?: () => void;
  onLeave: () => void;
}) {
  return (
    <View style={styles.header}>
      <BackButton label="Back to bots" onPress={onBack} />
      <MCAvatar username={bot.username} size={40} radius={radii.md} />
      <View style={styles.identity}>
        <Txt variant="heading" numberOfLines={1} style={styles.username}>
          {bot.username}
        </Txt>
        {scriptName ? (
          <Txt numberOfLines={1} style={styles.script}>
            {scriptName}
          </Txt>
        ) : (
          <BotStatusBadge bot={bot} textStyle={styles.status} />
        )}
      </View>
      {toggleLabel && onToggle ? (
        <IconButton
          accessibilityLabel={toggleLabel}
          bg={colors.surfaceAlt}
          size={40}
          disabled={!canControl}
          onPress={onToggle}
        >
          <NativeIcon
            sf={toggleLabel === 'Pause' ? 'pause.fill' : 'play.fill'}
            material={toggleLabel === 'Pause' ? 'pause' : 'play-arrow'}
            size={18}
            color={colors.text}
          />
        </IconButton>
      ) : null}
      {onStop ? (
        <IconButton
          accessibilityLabel="Stop script"
          bg={colors.dangerSoft}
          size={40}
          disabled={!canControl}
          onPress={onStop}
        >
          <NativeIcon
            sf="stop.circle"
            material="stop-circle"
            size={20}
            color={colors.danger}
          />
        </IconButton>
      ) : null}
      {canLeave ? (
        <IconButton
          accessibilityLabel="Leave server"
          bg={colors.dangerSoft}
          size={40}
          onPress={onLeave}
        >
          <NativeIcon
            sf="rectangle.portrait.and.arrow.right"
            material="logout"
            size={18}
            color={colors.danger}
          />
        </IconButton>
      ) : null}
    </View>
  );
}

export function BotDetailTabBar({
  activeTab,
  connected,
  onChange,
}: {
  activeTab: BotDetailTab;
  connected: boolean;
  onChange: (tab: BotDetailTab) => void;
}) {
  return (
    <View accessibilityRole="tablist" style={styles.tabBar}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabContent}
      >
        {BOT_DETAIL_TABS.map((item) => {
          const selected = activeTab === item.id;
          const disabled = !connected && item.id !== 'info';
          return (
            <Pressable
              key={item.id}
              accessibilityRole="tab"
              accessibilityState={{ selected, disabled }}
              disabled={disabled}
              onPress={() => {
                if (process.env.EXPO_OS === 'ios') {
                  Haptics.selectionAsync().catch(() => {});
                }
                onChange(item.id);
              }}
              style={({ pressed }) => [
                styles.tab,
                disabled && styles.tabDisabled,
                pressed && !disabled && styles.tabPressed,
              ]}
            >
              <Txt
                variant="label"
                style={[styles.tabLabel, selected && styles.tabLabelActive]}
              >
                {item.label}
              </Txt>
              {selected ? <View style={styles.tabIndicator} /> : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: process.env.EXPO_OS === 'android' ? 64 : 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: spacing.xs,
    paddingRight: spacing.md,
    paddingVertical: spacing.xs,
  },
  identity: { flex: 1, minWidth: 0, gap: 1 },
  username: {
    fontSize: font.size.lg,
    lineHeight: 22,
    letterSpacing: -0.25,
  },
  status: { fontSize: font.size.xs, lineHeight: 16 },
  script: {
    fontSize: font.size.xs,
    lineHeight: 16,
    fontWeight: font.weight.semibold,
    color: colors.primary,
  },
  tabBar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  tabContent: { paddingHorizontal: spacing.md },
  tab: {
    minHeight: process.env.EXPO_OS === 'android' ? 48 : 44,
    justifyContent: 'center',
    paddingHorizontal: 12,
    position: 'relative',
  },
  tabDisabled: { opacity: 0.35 },
  tabPressed: { opacity: 0.62 },
  tabLabel: { color: colors.textMuted },
  tabLabelActive: { color: colors.primary, fontWeight: font.weight.bold },
  tabIndicator: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 0,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.primary,
  },
});
