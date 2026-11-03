import React, { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { NativeIcon } from '../NativeIcon';
import { StatusDot, Txt } from '../ui';
import { useCommands } from '../../hooks/useCommands';
import { useClient } from '../../net/ConnectionProvider';
import { useAutomationDrawer } from '../automation/AutomationDrawer';
import { useFeedback } from '../AppFeedback';
import { usePluginPin } from '../../hooks/usePluginPin';
import { useStore } from '../../store/store';
import type { MacroInfo } from '../../store/types';
import type { DashboardScriptItem } from './DashboardScripts';
import { colors, font, radii, spacing, palette } from '../../theme/theme';

interface DashboardScriptCardProps {
  script: DashboardScriptItem;
}

function isPluginDisallowed(profile?: { disallowedPlugins?: string[] }, pluginId?: string): boolean {
  return Boolean(pluginId && profile?.disallowedPlugins?.includes(pluginId));
}

export const DashboardScriptCard: React.FC<DashboardScriptCardProps> = React.memo(({ script }) => {
  const commands = useCommands();
  const client = useClient();
  const { openPlugin, openProfileScript } = useAutomationDrawer();
  const { showMessage } = useFeedback();
  const { togglePin } = usePluginPin(script.pluginId);

  const activeScripts = useStore((state) => state.activeScripts);
  const activeProfileKey = useStore((state) => state.activeProfileKey);
  const jndata = useStore((state) => state.JNdata);

  const [starting, setStarting] = useState(false);
  const [imageError, setImageError] = useState(false);

  const runningInstance = Object.values(activeScripts).find(
    (s) => s.scriptId === script.id || s.scriptId === script.pluginId || s.name === script.name,
  );
  const isRunning = Boolean(runningInstance);

  const isBlocked = isPluginDisallowed(
    activeProfileKey ? jndata?.data?.[activeProfileKey] : undefined,
    script.pluginId,
  );

  const handleOpenOptions = useCallback(() => {
    if (process.env.EXPO_OS === 'ios') {
      void Haptics.selectionAsync().catch(() => {});
    }
    if (script.isPlugin && script.info) {
      void openPlugin(script.info, 'options');
    } else {
      void openProfileScript(script, 'options');
    }
  }, [openPlugin, openProfileScript, script]);

  const handleLongPress = useCallback(() => {
    if (!script.isPlugin) return;
    if (process.env.EXPO_OS === 'ios') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    Alert.alert(
      'Unpin Plugin',
      `Unpin "${script.name}" from the dashboard?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unpin',
          style: 'destructive',
          onPress: () => void togglePin(script.pluginId),
        },
      ],
    );
  }, [script.isPlugin, script.name, script.pluginId, togglePin]);

  const handleToggleRun = useCallback(async () => {
    if (process.env.EXPO_OS === 'ios') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }

    if (isRunning && runningInstance) {
      commands?.stopScript(runningInstance.instanceId);
      return;
    }

    if (isBlocked) {
      showMessage('This script is disallowed by the active profile.', 'warning');
      return;
    }

    if (script.unavailableReason) {
      showMessage(script.unavailableReason, 'error');
      return;
    }

    setStarting(true);
    try {
      let macroInfo = script.info;
      if (!macroInfo && client) {
        if (script.isPlugin) {
          const installed = useStore.getState().macros.list;
          macroInfo = installed.find((p) => p.pluginId === script.pluginId);
        } else {
          const res = await client.profileAction<{ info?: MacroInfo; error?: string }>(
            'RESOLVE_PROFILE_SCRIPT_INFO',
            { id: script.id },
          );
          if (res.info) {
            macroInfo = res.info;
          }
        }
      }

      if (macroInfo && commands) {
        await commands.runPlugin(macroInfo);
      } else {
        handleOpenOptions();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not start script';
      showMessage(msg, 'error');
    } finally {
      setStarting(false);
    }
  }, [commands, client, handleOpenOptions, isBlocked, isRunning, runningInstance, script, showMessage]);

  const banner = script.banner?.trim();
  const fallbackBg = script.theme?.primaryColor || colors.surfaceAlt;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${script.name}, ${isRunning ? 'running' : 'idle'}`}
      accessibilityHint={script.isPlugin ? 'Tap to open options, long press to unpin, or use play button' : 'Tap to open options, or use play button'}
      onPress={handleOpenOptions}
      onLongPress={script.isPlugin ? handleLongPress : undefined}
      delayLongPress={500}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: fallbackBg },
        pressed && styles.cardPressed,
      ]}
    >
      {banner && !imageError ? (
        <Image
          source={{ uri: banner }}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
          cachePolicy="memory-disk"
          recyclingKey={banner}
          transition={150}
          onError={() => setImageError(true)}
        />
      ) : (
        <View style={styles.fallbackPattern}>
          <NativeIcon
            sf="puzzlepiece.extension.fill"
            material="extension"
            size={36}
            color="rgba(255,255,255,0.15)"
          />
        </View>
      )}

      {/* Scrim overlay for legibility */}
      <View style={styles.scrimOverlay} />

      {/* Top status indicator */}
      {isRunning ? (
        <View style={styles.topRow}>
          <View style={styles.activeBadge}>
            <StatusDot color={colors.success} size={6} pulse />
            <Txt variant="none" style={styles.activeBadgeText}>
              Active
            </Txt>
          </View>
        </View>
      ) : (
        <View style={styles.topRowSpacer} />
      )}

      {/* Bottom info & action row */}
      <View style={styles.bottomRow}>
        <View style={styles.titleWrap}>
          <Txt variant="none" numberOfLines={1} style={[styles.title, { color: palette.white }]}>
            {script.name}
          </Txt>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isRunning ? `Stop ${script.name}` : `Run ${script.name}`}
          hitSlop={8}
          disabled={starting || Boolean(script.unavailableReason && !isRunning)}
          onPress={handleToggleRun}
          style={({ pressed }) => [
            styles.actionBtn,
            isRunning ? styles.stopBtn : styles.runBtn,
            (starting || (script.unavailableReason && !isRunning)) && styles.actionBtnDisabled,
            pressed && styles.actionBtnPressed,
          ]}
        >
          <NativeIcon
            sf={isRunning ? 'stop.fill' : 'play.fill'}
            material={isRunning ? 'stop' : 'play-arrow'}
            size={13}
            color={palette.white}
          />
        </Pressable>
      </View>
    </Pressable>
  );
});

DashboardScriptCard.displayName = 'DashboardScriptCard';

const styles = StyleSheet.create({
  card: {
    width: 154,
    height: 96,
    borderRadius: radii.lg,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'space-between',
    padding: spacing.sm,
  },
  cardPressed: {
    opacity: 0.92,
  },
  fallbackPattern: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrimOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 11, 14, 0.48)',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 2,
  },
  topRowSpacer: {
    height: 20,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.pill,
    borderCurve: 'continuous',
  },
  activeBadgeText: {
    color: colors.success,
    fontSize: 10,
    fontWeight: font.weight.semibold,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
    zIndex: 2,
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: palette.white,
    fontSize: font.size.caption,
    fontWeight: font.weight.semibold,
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  actionBtn: {
    width: 28,
    height: 28,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.35,
    shadowRadius: 2,
    elevation: 2,
  },
  runBtn: {
    backgroundColor: colors.primary,
  },
  stopBtn: {
    backgroundColor: colors.danger,
  },
  actionBtnDisabled: {
    opacity: 0.5,
  },
  actionBtnPressed: {
    transform: [{ scale: 0.94 }],
  },
});
