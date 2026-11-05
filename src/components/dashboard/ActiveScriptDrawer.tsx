import React, { useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { BottomSheet } from '../BottomSheet';
import { Badge, Button, StatusDot, Txt } from '../ui';
import { NativeIcon } from '../NativeIcon';
import { MCAvatar } from '../MCAvatar';
import { ScriptControl, useCommands } from '../../hooks/useCommands';
import { isBotAssignedToScript, selectCanUseScripts, useStore } from '../../store/store';
import { useProfileScriptInfos } from '../../hooks/useProfileScriptInfos';
import { useAutomationDrawer } from '../automation/AutomationDrawer';
import { BackgroundPowerBanner } from '../background/BackgroundPowerBanner';
import type { ActiveBot, ActiveScript } from '../../store/types';
import { colors, font, radii, spacing } from '../../theme/theme';

export function ActiveScriptDrawer({
  script,
  visible,
  onClose,
  onSelectBot,
}: {
  script: ActiveScript | null;
  visible: boolean;
  onClose: () => void;
  onSelectBot?: (bot: ActiveBot) => void;
}) {
  const router = useRouter();
  const commands = useCommands();
  const { openPlugin, openProfileScript } = useAutomationDrawer();
  const activeBots = useStore((state) => state.activeBots);
  const installedMacros = useStore((state) => state.macros.list);
  const profileScripts = useProfileScriptInfos();
  const liveScript = useStore((state) =>
    script ? state.activeScripts[script.instanceId] ?? script : null,
  );

  const currentScript = liveScript ?? script;

  const canUseScripts = useStore(selectCanUseScripts);
  const assignedBots = useMemo(() => {
    if (!currentScript) return [];
    return activeBots.filter((bot) => isBotAssignedToScript(bot, currentScript));
  }, [activeBots, currentScript]);

  if (!currentScript) return null;

  const controls = currentScript.controls ?? 0;
  const progress = currentScript.progress;
  const pct =
    progress && progress.total > 0
      ? Math.min(1, Math.max(0, progress.current / progress.total))
      : null;

  const canPrev = Boolean(controls & ScriptControl.PREVIOUS);
  const canPause = Boolean(controls & ScriptControl.PAUSE);
  const canResume = Boolean(controls & ScriptControl.RESUME);
  const canSkip = Boolean(controls & ScriptControl.SKIP);

  const handleControl = (control: ScriptControl) => {
    if (process.env.EXPO_OS === 'ios') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    commands?.sendControl(currentScript.instanceId, control);
  };

  const handleRestart = () => {
    if (process.env.EXPO_OS === 'ios') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    commands?.restartScript(currentScript.instanceId);
  };

  const handleStop = () => {
    if (process.env.EXPO_OS === 'ios') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
    commands?.stopScript(currentScript.instanceId);
    onClose();
  };

  const handleOpenLogs = () => {
    if (process.env.EXPO_OS === 'ios') {
      void Haptics.selectionAsync();
    }
    onClose();
    router.push({ pathname: '/(app)/logs', params: { scriptId: currentScript.scriptId } });
  };

  const handleOpenConfigure = () => {
    if (process.env.EXPO_OS === 'ios') {
      void Haptics.selectionAsync();
    }
    const macro = installedMacros.find((m) => m.pluginId === currentScript.scriptId);
    const profileScript = profileScripts.find(
      (s) => s.id === currentScript.scriptId || s.pluginId === currentScript.scriptId,
    );

    onClose();
    if (macro) {
      void openPlugin(macro);
    } else if (profileScript) {
      void openProfileScript(profileScript);
    } else {
      router.push({ pathname: '/(app)/automation', params: { scriptId: currentScript.scriptId } });
    }
  };

  type ControlItem = {
    key: string;
    sf: React.ComponentProps<typeof NativeIcon>['sf'];
    material: React.ComponentProps<typeof NativeIcon>['material'];
    label: string;
    color?: string;
    action: () => void;
  };

  const availableControls: ControlItem[] = [];
  if (canPrev) {
    availableControls.push({
      key: 'prev',
      sf: 'backward.fill',
      material: 'skip-previous',
      label: 'Prev',
      action: () => handleControl(ScriptControl.PREVIOUS),
    });
  }
  if (canPause) {
    availableControls.push({
      key: 'pause',
      sf: 'pause.fill',
      material: 'pause',
      label: 'Pause',
      action: () => handleControl(ScriptControl.PAUSE),
    });
  }
  if (canResume) {
    availableControls.push({
      key: 'resume',
      sf: 'play.fill',
      material: 'play-arrow',
      label: 'Resume',
      color: colors.primary,
      action: () => handleControl(ScriptControl.RESUME),
    });
  }
  availableControls.push({
    key: 'restart',
    sf: 'arrow.clockwise',
    material: 'refresh',
    label: 'Restart',
    action: handleRestart,
  });
  if (canSkip) {
    availableControls.push({
      key: 'skip',
      sf: 'forward.fill',
      material: 'skip-next',
      label: 'Skip',
      action: () => handleControl(ScriptControl.SKIP),
    });
  }

  const isCompactRow = availableControls.length >= 3;

  return (
    <BottomSheet visible={visible} onClose={onClose} accessibilityLabel={`Script ${currentScript.name}`}>
      <ScrollView
        contentContainerStyle={styles.container}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconBox}>
            <NativeIcon
              sf="point.3.connected.trianglepath.dotted"
              material="account-tree"
              size={24}
              color={colors.primary}
            />
          </View>
          <View style={styles.headerCopy}>
            <Txt variant="heading" numberOfLines={1}>
              {currentScript.name}
            </Txt>
            <View style={styles.badgeRow}>
              <Badge
                label="Running"
                color={colors.success}
                bg={colors.successSoft}
                icon={<StatusDot color={colors.success} size={6} pulse />}
              />
              <Badge label={`#${currentScript.instanceId}`} />
              {assignedBots.length > 0 && (
                <Badge label={`${assignedBots.length} bot${assignedBots.length === 1 ? '' : 's'}`} />
              )}
              {currentScript.origin === 'minecraft' && <Badge label="Minecraft" />}
            </View>
          </View>
        </View>

        <BackgroundPowerBanner />

        {/* Progress Bar Section */}
        {pct !== null && progress ? (
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Txt variant="label" style={styles.progressLabel}>Progress</Txt>
              <Txt variant="faint" style={styles.progressPercent}>
                {progress.current} / {progress.total} ({Math.round(pct * 100)}%)
              </Txt>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${pct * 100}%` }]} />
            </View>
            {progress.eta ? (
              <View style={styles.progressFooter}>
                <NativeIcon sf="clock" material="schedule" size={13} color={colors.textFaint} />
                <Txt variant="faint">{formatEta(progress.eta)}</Txt>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Horizontal Runner Controls */}
        <View style={styles.controlBar}>
          {availableControls.map((ctrl) => (
            <Pressable
              key={ctrl.key}
              accessibilityRole="button"
              accessibilityLabel={ctrl.label}
              onPress={() => {
                if (process.env.EXPO_OS === 'ios') {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                ctrl.action();
              }}
              style={({ pressed }) => [
                styles.controlBtn,
                isCompactRow ? styles.controlBtnCompact : styles.controlBtnWide,
                pressed && styles.controlBtnPressed,
              ]}
            >
              <NativeIcon
                sf={ctrl.sf}
                material={ctrl.material}
                size={isCompactRow ? 20 : 18}
                color={ctrl.color ?? colors.text}
              />
              <Txt
                style={[
                  styles.controlLabel,
                  { color: ctrl.color ?? colors.text },
                  !isCompactRow && styles.controlLabelWide,
                ]}
              >
                {ctrl.label}
              </Txt>
            </Pressable>
          ))}
        </View>

        {/* Inset Grouped Navigation & Actions */}
        <View style={styles.groupedList}>
          <Pressable
            accessibilityRole="button"
            onPress={handleOpenConfigure}
            style={({ pressed }) => [styles.actionRow, pressed && styles.rowPressed]}
          >
            <View style={[styles.actionIconBox, { backgroundColor: colors.surfaceAlt }]}>
              <NativeIcon sf="slider.horizontal.3" material="tune" size={18} color={colors.text} />
            </View>
            <View style={styles.actionRowCopy}>
              <Txt variant="body" style={styles.actionRowTitle}>Configure options</Txt>
              <Txt variant="muted" style={styles.actionRowSubtitle}>Adjust script settings and flags</Txt>
            </View>
            <NativeIcon sf="chevron.right" material="chevron-right" size={18} color={colors.textFaint} />
          </Pressable>

          <View style={styles.rowDivider} />

          <Pressable
            accessibilityRole="button"
            onPress={handleOpenLogs}
            style={({ pressed }) => [styles.actionRow, pressed && styles.rowPressed]}
          >
            <View style={[styles.actionIconBox, { backgroundColor: colors.surfaceAlt }]}>
              <NativeIcon sf="terminal" material="terminal" size={18} color={colors.text} />
            </View>
            <View style={styles.actionRowCopy}>
              <Txt variant="body" style={styles.actionRowTitle}>Console logs</Txt>
              <Txt variant="muted" style={styles.actionRowSubtitle}>Live script output and events</Txt>
            </View>
            <NativeIcon sf="chevron.right" material="chevron-right" size={18} color={colors.textFaint} />
          </Pressable>
        </View>

        {/* Assigned Bots Section */}
        {assignedBots.length > 0 ? (
          <View style={styles.botsSection}>
            <Txt variant="label" style={styles.sectionTitle}>
              Assigned Bots ({assignedBots.length})
            </Txt>
            <View style={styles.botsGrid}>
              {assignedBots.map((bot) => (
                <Pressable
                  key={bot.botId}
                  accessibilityRole="button"
                  onPress={() => {
                    onClose();
                    onSelectBot?.(bot);
                  }}
                  style={({ pressed }) => [styles.botChip, pressed && styles.chipPressed]}
                >
                  <MCAvatar username={bot.username} size={24} />
                  <Txt variant="muted" numberOfLines={1} style={styles.botChipText}>
                    {bot.username}
                  </Txt>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {/* Stop Action */}
        <View style={styles.footer}>
          <Button
            title="Stop Script"
            variant="danger"
            disabled={!canUseScripts}
            full
            icon={<NativeIcon sf="stop.fill" material="stop" size={18} color={colors.danger} />}
            onPress={handleStop}
          />
        </View>
      </ScrollView>
    </BottomSheet>
  );
}

function formatEta(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s left`;
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}m ${secs}s left`;
  }
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hrs}h ${mins}m left`;
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
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    borderCurve: 'continuous',
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  progressCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
    padding: spacing.md,
    gap: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: font.size.xs,
    fontWeight: '600',
    color: colors.textMuted,
  },
  progressPercent: {
    fontVariant: ['tabular-nums'],
    color: colors.textMuted,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  progressFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  controlBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  controlBtn: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
  },
  controlBtnWide: {
    flex: 1,
    maxWidth: 160,
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: spacing.md,
  },
  controlBtnCompact: {
    flex: 1,
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: spacing.xs,
  },
  controlBtnPressed: {
    backgroundColor: colors.surfaceHover,
  },
  controlLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  controlLabelWide: {
    fontSize: font.size.sm,
    fontWeight: '600',
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
  botsSection: {
    gap: spacing.xs,
  },
  sectionTitle: {
    fontSize: font.size.xs,
    fontWeight: '600',
    color: colors.textMuted,
    paddingHorizontal: spacing.xs,
  },
  botsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  botChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
  },
  chipPressed: {
    backgroundColor: colors.surfaceHover,
  },
  botChipText: {
    fontSize: font.size.caption,
    fontWeight: '500',
    color: colors.text,
  },
  footer: {
    marginTop: spacing.xs,
  },
});
