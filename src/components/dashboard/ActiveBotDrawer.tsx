import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { BottomSheet } from '../BottomSheet';
import { Badge, Button, Txt } from '../ui';
import { NativeIcon } from '../NativeIcon';
import { MCAvatar } from '../MCAvatar';
import { BotStatusBadge } from '../cards';
import { useCommands } from '../../hooks/useCommands';
import { isBotAssignedToScript, useStore } from '../../store/store';
import type { ActiveBot, ActiveScript } from '../../store/types';
import { colors, font, radii, spacing } from '../../theme/theme';

export function ActiveBotDrawer({
  bot,
  visible,
  onClose,
  onOpenScript,
}: {
  bot: ActiveBot | null;
  visible: boolean;
  onClose: () => void;
  onOpenScript?: (script: ActiveScript) => void;
}) {
  const router = useRouter();
  const commands = useCommands();
  const activeScripts = useStore((state) => state.activeScripts);
  const liveBot = useStore((state) =>
    bot ? state.activeBots.find((b) => b.botId === bot.botId) ?? bot : null,
  );
  const currentBot = liveBot ?? bot;
  const botInfo = useStore((state) => (currentBot ? state.botInfo[currentBot.botId] : undefined));

  if (!currentBot) return null;

  const isConnected = currentBot.status === 'connected';

  const parentScript = Object.values(activeScripts).find((script) =>
    isBotAssignedToScript(currentBot, script),
  );

  const navigateToTab = (tab: 'chat' | 'inventory' | 'actions' | 'movement' | 'info') => {
    if (process.env.EXPO_OS === 'ios') {
      void Haptics.selectionAsync();
    }
    onClose();
    router.push({
      pathname: '/(app)/bot/[botId]',
      params: { botId: String(currentBot.botId), tab },
    });
  };

  const handleDisconnect = () => {
    if (process.env.EXPO_OS === 'ios') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
    void commands?.botAction(currentBot, 'leave');
    onClose();
  };

  const handleParentScriptPress = () => {
    if (!parentScript) return;
    if (process.env.EXPO_OS === 'ios') {
      void Haptics.selectionAsync();
    }
    onClose();
    onOpenScript?.(parentScript);
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} accessibilityLabel={`Bot ${currentBot.username}`}>
      <ScrollView
        contentContainerStyle={styles.container}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <MCAvatar username={currentBot.username} size={50} />
          <View style={styles.headerCopy}>
            <Txt variant="heading" numberOfLines={1}>
              {currentBot.username}
            </Txt>
            <View style={styles.metaRow}>
              <BotStatusBadge bot={currentBot} />
              {currentBot.host ? (
                <>
                  <Txt variant="faint">·</Txt>
                  <Txt variant="faint" numberOfLines={1} style={styles.hostText}>
                    {currentBot.host}
                    {currentBot.port ? `:${currentBot.port}` : ''}
                  </Txt>
                </>
              ) : null}
            </View>
          </View>
        </View>

        {/* 4 Quick Action Tiles */}
        <View style={styles.quickGrid}>
          <QuickTile
            sf="bubble.left.and.bubble.right.fill"
            material="chat"
            label="Chat"
            disabled={!isConnected}
            onPress={() => navigateToTab('chat')}
          />
          <QuickTile
            sf="square.grid.3x3.fill"
            material="grid-view"
            label="Inventory"
            disabled={!isConnected}
            onPress={() => navigateToTab('inventory')}
          />
          <QuickTile
            sf="bolt.fill"
            material="flash-on"
            label="Actions"
            disabled={!isConnected}
            onPress={() => navigateToTab('actions')}
          />
          <QuickTile
            sf="location.fill"
            material="navigation"
            label="Movement"
            disabled={!isConnected}
            onPress={() => navigateToTab('movement')}
          />
        </View>

        {/* Live Telemetry Chips */}
        {botInfo && isConnected ? (
          <View style={styles.telemetryCard}>
            <View style={styles.telemetryRow}>
              {typeof botInfo.health === 'number' ? (
                <Badge
                  label={`${Math.round(botInfo.health)} HP`}
                  color={colors.danger}
                  bg={colors.dangerSoft}
                  icon={<NativeIcon sf="heart.fill" material="favorite" size={12} color={colors.danger} />}
                />
              ) : null}

              {typeof botInfo.hunger === 'number' ? (
                <Badge
                  label={`${Math.round(botInfo.hunger)} Food`}
                  color={colors.warning}
                  bg={colors.warningSoft}
                  icon={<NativeIcon sf="flame.fill" material="local-fire-department" size={12} color={colors.warning} />}
                />
              ) : null}

              {typeof botInfo.ping === 'number' ? (
                <Badge
                  label={`${botInfo.ping}ms`}
                  color={colors.info}
                  bg={colors.infoSoft}
                  icon={<NativeIcon sf="wifi" material="wifi" size={12} color={colors.info} />}
                />
              ) : null}

              {botInfo.gamemode ? (
                <Badge
                  label={botInfo.gamemode}
                  color={colors.textMuted}
                />
              ) : null}
            </View>

            {botInfo.position ? (
              <View style={styles.positionRow}>
                <NativeIcon sf="location" material="place" size={12} color={colors.textFaint} />
                <Txt variant="faint" style={styles.coordsText}>
                  X: {Math.round(botInfo.position.x)}  Y: {Math.round(botInfo.position.y)}  Z: {Math.round(botInfo.position.z)}
                </Txt>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Inset Grouped Navigation & Actions */}
        <View style={styles.groupedList}>
          {/* Active Script link if running */}
          {currentBot.SCRIPT_NAME || currentBot.script ? (
            <>
              <Pressable
                accessibilityRole="button"
                disabled={!parentScript}
                onPress={handleParentScriptPress}
                style={({ pressed }) => [styles.actionRow, pressed && parentScript && styles.rowPressed]}
              >
                <View style={[styles.actionIconBox, { backgroundColor: colors.primarySoft }]}>
                  <NativeIcon
                    sf="point.3.connected.trianglepath.dotted"
                    material="account-tree"
                    size={18}
                    color={colors.primary}
                  />
                </View>
                <View style={styles.actionRowCopy}>
                  <Txt variant="body" style={styles.actionRowTitle}>
                    {currentBot.SCRIPT_NAME || currentBot.script}
                  </Txt>
                  <Txt variant="muted" style={styles.actionRowSubtitle}>
                    {parentScript ? `Running · Instance #${parentScript.instanceId}` : 'Script active'}
                  </Txt>
                </View>
                {parentScript ? (
                  <NativeIcon sf="chevron.right" material="chevron-right" size={18} color={colors.textFaint} />
                ) : null}
              </Pressable>
              <View style={styles.rowDivider} />
            </>
          ) : null}

          {/* Full Details Console */}
          <Pressable
            accessibilityRole="button"
            disabled={!isConnected}
            onPress={() => navigateToTab('info')}
            style={({ pressed }) => [styles.actionRow, pressed && isConnected && styles.rowPressed]}
          >
            <View style={[styles.actionIconBox, { backgroundColor: colors.surfaceAlt }]}>
              <NativeIcon sf="terminal" material="terminal" size={18} color={colors.text} />
            </View>
            <View style={styles.actionRowCopy}>
              <Txt variant="body" style={styles.actionRowTitle}>Full bot details & console</Txt>
              <Txt variant="muted" style={styles.actionRowSubtitle}>Inspect live stats, logs and settings</Txt>
            </View>
            <NativeIcon sf="chevron.right" material="chevron-right" size={18} color={colors.textFaint} />
          </Pressable>
        </View>

        {/* Disconnect Action */}
        <View style={styles.footer}>
          <Button
            title="Disconnect Bot"
            variant="danger"
            full
            icon={<NativeIcon sf="xmark.circle.fill" material="cancel" size={18} color={colors.danger} />}
            onPress={handleDisconnect}
          />
        </View>
      </ScrollView>
    </BottomSheet>
  );
}

function QuickTile({
  sf,
  material,
  label,
  disabled,
  onPress,
}: {
  sf: React.ComponentProps<typeof NativeIcon>['sf'];
  material: React.ComponentProps<typeof NativeIcon>['material'];
  label: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.quickTile,
        disabled && styles.quickTileDisabled,
        pressed && styles.quickTilePressed,
      ]}
    >
      <NativeIcon
        sf={sf}
        material={material}
        size={22}
        color={disabled ? colors.textFaint : colors.primary}
      />
      <Txt
        style={[
          styles.quickTileLabel,
          { color: disabled ? colors.textFaint : colors.text },
        ]}
      >
        {label}
      </Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hostText: {
    flexShrink: 1,
  },
  quickGrid: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
    overflow: 'hidden',
  },
  quickTile: {
    flex: 1,
    minHeight: 74,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: colors.borderSubtle,
    paddingVertical: spacing.sm,
  },
  quickTileDisabled: {
    opacity: 0.45,
  },
  quickTilePressed: {
    backgroundColor: colors.surfaceHover,
  },
  quickTileLabel: {
    fontSize: font.size.xs,
    fontWeight: '600',
  },
  telemetryCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
    padding: spacing.md,
    gap: spacing.sm,
  },
  telemetryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  positionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 2,
  },
  coordsText: {
    fontVariant: ['tabular-nums'],
    color: colors.textMuted,
  },
  groupedList: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
    overflow: 'hidden',
  },
  actionRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  rowPressed: {
    backgroundColor: colors.surfaceHover,
  },
  actionIconBox: {
    width: 34,
    height: 34,
    borderRadius: radii.sm,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionRowCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  actionRowTitle: {
    fontSize: font.size.base,
    fontWeight: '600',
    color: colors.text,
  },
  actionRowSubtitle: {
    fontSize: font.size.xs,
    color: colors.textMuted,
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.borderSubtle,
    marginLeft: 58,
  },
  footer: {
    marginTop: spacing.xs,
  },
});
