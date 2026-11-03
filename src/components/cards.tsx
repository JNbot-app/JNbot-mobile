import React from 'react';
import { StyleProp, StyleSheet, TextStyle, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing } from '../theme/theme';
import { Badge, IconButton, PressableCard, StatusDot, Txt } from './ui';
import { MCAvatar } from './MCAvatar';
import type { ActiveBot, ActiveScript } from '../store/types';
import { ScriptControl } from '../hooks/useCommands';
import { formatJoinCountdown, isBotQueued, useJoinQueueClock } from '../features/joinQueue';

// ── Bot status helpers & badge ──────────────────────────────────────────────

export function botStatusMeta(
  bot: { status: string; paused?: boolean; joinAt?: number },
  now?: number,
) {
  if (bot.paused) return { color: colors.paused, label: 'Paused' };
  switch (bot.status) {
    case 'connected':
      return { color: colors.online, label: 'Online' };
    case 'joining':
      return { color: colors.warning, label: 'Joining' };
    case 'queued':
    case 'queue': {
      const timestamp = now ?? (typeof bot.joinAt === 'number' ? Date.now() : undefined);
      if (timestamp && typeof bot.joinAt === 'number') {
        return {
          color: colors.info,
          label: `Queued · in ${formatJoinCountdown(bot.joinAt, timestamp)}`,
        };
      }
      return { color: colors.info, label: 'Queued' };
    }
    case 'failed':
      return { color: colors.danger, label: 'Failed' };
    default:
      return { color: colors.offline, label: bot.status };
  }
}

export function BotStatusBadgeView({
  bot,
  textStyle,
  dotSize = 8,
  now,
}: {
  bot: { status: string; paused?: boolean; joinAt?: number };
  textStyle?: StyleProp<TextStyle>;
  dotSize?: number;
  now?: number;
}) {
  const isQueued = isBotQueued(bot.status);
  const meta = botStatusMeta(bot, now);

  return (
    <View style={styles.statusRow}>
      <StatusDot
        color={meta.color}
        size={dotSize}
        pulse={bot.status === 'connected'}
      />
      <Txt
        variant="muted"
        style={[
          styles.statusText,
          { color: meta.color },
          isQueued && styles.statusTextTabular,
          textStyle,
        ]}
      >
        {meta.label}
      </Txt>
    </View>
  );
}

export function BotStatusBadge({
  bot,
  textStyle,
  dotSize = 8,
  now: propNow,
}: {
  bot: { status: string; paused?: boolean; joinAt?: number };
  textStyle?: StyleProp<TextStyle>;
  dotSize?: number;
  now?: number;
}) {
  const isQueued = isBotQueued(bot.status);
  const internalNow = useJoinQueueClock(propNow === undefined && isQueued);
  const now = propNow ?? internalNow;

  return (
    <BotStatusBadgeView
      bot={bot}
      textStyle={textStyle}
      dotSize={dotSize}
      now={now}
    />
  );
}

// ── Bot card ─────────────────────────────────────────────────────────────────

export function BotCard({
  bot,
  onPress,
}: {
  bot: ActiveBot;
  onPress?: () => void;
}) {
  return (
    <PressableCard onPress={onPress} style={styles.botCard}>
      <MCAvatar username={bot.username} size={46} />
      <View style={{ flex: 1, gap: 3 }}>
        <View style={styles.botTop}>
          <Txt variant="heading" numberOfLines={1} style={{ flex: 1 }}>
            {bot.username}
          </Txt>
          <BotStatusBadge bot={bot} />
        </View>
        <Txt variant="muted" numberOfLines={1}>
          <Ionicons name="flash" size={12} color={colors.textFaint} />{' '}
          {bot.SCRIPT_NAME || bot.script || 'Idle'}
        </Txt>
        {bot.host ? (
          <Txt variant="faint" numberOfLines={1}>
            {bot.host}
            {bot.port ? `:${bot.port}` : ''}
          </Txt>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
    </PressableCard>
  );
}

// ── Active script card with runner controls ──────────────────────────────────

type Ctl = { icon: keyof typeof Ionicons.glyphMap; control: ScriptControl; bg?: string; fg?: string };

export function ActiveScriptCard({
  script,
  botCount,
  onControl,
  onStop,
  onRestart,
  onLogs,
}: {
  script: ActiveScript;
  botCount?: number;
  onControl: (control: ScriptControl) => void;
  onStop: () => void;
  onRestart: () => void;
  onLogs?: () => void;
}) {
  const controls = script.controls ?? 0;
  const progress = script.progress;
  const pct =
    progress && progress.total > 0
      ? Math.min(1, progress.current / progress.total)
      : null;

  const available: Ctl[] = [];
  if (controls & ScriptControl.PREVIOUS)
    available.push({ icon: 'play-skip-back', control: ScriptControl.PREVIOUS });
  if (controls & ScriptControl.PAUSE)
    available.push({ icon: 'pause', control: ScriptControl.PAUSE });
  if (controls & ScriptControl.RESUME)
    available.push({ icon: 'play', control: ScriptControl.RESUME });
  if (controls & ScriptControl.SKIP)
    available.push({ icon: 'play-skip-forward', control: ScriptControl.SKIP });

  return (
    <View style={styles.scriptCard}>
      <View style={styles.scriptTop}>
        <View style={styles.scriptIcon}>
          <Ionicons name="flash" size={18} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Txt variant="heading" numberOfLines={1}>
            {script.name}
          </Txt>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
            <Badge
              label="Running"
              color={colors.success}
              bg={colors.successSoft}
              icon={<StatusDot color={colors.success} size={6} pulse />}
            />
            {typeof botCount === 'number' && botCount > 0 ? (
              <Badge label={`${botCount} bot${botCount === 1 ? '' : 's'}`} />
            ) : null}
            {script.origin === 'minecraft' ? <Badge label="Minecraft" /> : null}
          </View>
        </View>
      </View>

      {pct !== null && progress ? (
        <View style={{ marginTop: spacing.md, gap: 6 }}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${pct * 100}%` }]} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Txt variant="faint">
              {progress.current} / {progress.total}
            </Txt>
            {progress.eta ? <Txt variant="faint">{formatEta(progress.eta)} left</Txt> : null}
          </View>
        </View>
      ) : null}

      <View style={styles.scriptControls}>
        {onLogs ? (
          <IconButton accessibilityLabel={`Open ${script.name} logs`} size={42} onPress={onLogs}>
            <Ionicons name="terminal-outline" size={18} color={colors.text} />
          </IconButton>
        ) : null}
        {available.map((c) => (
          <IconButton key={c.control} size={42} onPress={() => onControl(c.control)}>
            <Ionicons name={c.icon} size={18} color={colors.text} />
          </IconButton>
        ))}
        <IconButton size={42} onPress={onRestart}>
          <Ionicons name="refresh" size={18} color={colors.text} />
        </IconButton>
        <View style={{ flex: 1 }} />
        <IconButton size={42} bg={colors.dangerSoft} onPress={onStop}>
          <Ionicons name="stop" size={18} color={colors.danger} />
        </IconButton>
      </View>
    </View>
  );
}

// ── Stat tile ────────────────────────────────────────────────────────────────

export function StatTile({
  icon,
  value,
  label,
  color = colors.primary,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string | number;
  label: string;
  color?: string;
}) {
  return (
    <View style={styles.statTile}>
      <View style={[styles.statIcon, { backgroundColor: color + '22' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Txt variant="none" style={styles.statValue}>{value}</Txt>
      <Txt variant="muted">{label}</Txt>
    </View>
  );
}

function formatEta(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${Math.round(seconds / 3600)}h`;
}

const styles = StyleSheet.create({
  botCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  botTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statusText: { fontWeight: '600' },
  statusTextTabular: { fontVariant: ['tabular-nums'] },
  scriptCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
    padding: spacing.lg,
    borderCurve: 'continuous',
  },
  scriptTop: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  scriptIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: {
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 4, backgroundColor: colors.primary },
  scriptControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  statTile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
    padding: spacing.md,
    gap: 6,
    borderCurve: 'continuous',
  },
  statIcon: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  statValue: { fontSize: 24, lineHeight: 30, fontWeight: '700', color: colors.text },
});
