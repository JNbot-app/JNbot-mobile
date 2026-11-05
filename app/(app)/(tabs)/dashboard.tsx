import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../../../src/components/Screen';
import { BotStatusBadge } from '../../../src/components/cards';
import { EmptyState, SectionHeader, Txt } from '../../../src/components/ui';
import { MCAvatar } from '../../../src/components/MCAvatar';
import {
  isBotAssignedToScript,
  selectCanUseAccounts,
  selectCanUseActiveBots,
  selectCanUsePlugins,
  selectCanUseScripts,
  useStore,
} from '../../../src/store/store';
import { useConnection } from '../../../src/net/ConnectionProvider';
import { colors, radii, spacing } from '../../../src/theme/theme';
import { NativeIcon } from '../../../src/components/NativeIcon';
import { ActiveScriptDrawer } from '../../../src/components/dashboard/ActiveScriptDrawer';
import { ActiveBotDrawer } from '../../../src/components/dashboard/ActiveBotDrawer';
import { BackgroundPowerBanner } from '../../../src/components/background/BackgroundPowerBanner';
import { AdFreeOfferCard } from '../../../src/components/dashboard/AdFreeOfferCard';
import { compactCount, compactDuration, getNextReminderInfo } from '../../../src/features/dashboardStats';
import { DashboardScripts } from '../../../src/components/dashboard/DashboardScripts';
import { DashboardQuickActions } from '../../../src/components/dashboard/DashboardQuickActions';
import { GettingStartedCard } from '../../../src/components/dashboard/GettingStartedCard';
import { ActivityCard } from '../../../src/components/dashboard/ActivityCard';
import { SwipeAction } from '../../../src/components/SwipeAction';
import { useCommands } from '../../../src/hooks/useCommands';
import { useGettingStarted } from '../../../src/features/onboarding/gettingStarted';
import type { ActiveBot, ActiveScript } from '../../../src/store/types';

export default function Dashboard() {
  const router = useRouter();
  const commands = useCommands();
  const { selectProfile, mode } = useConnection();
  const profile = useStore((state) => state.profiles.find((item) => item.id === state.activeProfileKey));
  const activeProfileKey = useStore((state) => state.activeProfileKey);
  const activeBots = useStore((state) => state.activeBots);
  const scripts = Object.values(useStore((state) => state.activeScripts));
  const stats = useStore((state) => state.stats);
  const reminders = useStore((state) => state.settings.reminders);
  const profileReady = useStore((state) => state.profileReady);
  const canUseBots = useStore(selectCanUseActiveBots);
  const canUseScripts = useStore(selectCanUseScripts);
  const canUseAccounts = useStore(selectCanUseAccounts);
  const canUsePlugins = useStore(selectCanUsePlugins);
  const accountCount = useStore((state) => state.alts.length);
  const liveBots = activeBots.filter((bot) => ['connected', 'joining', 'queued', 'queue'].includes(bot.status));
  const guide = useGettingStarted(mode === 'local' && profileReady, {
    accounts: accountCount,
    botsJoined: stats.botsJoined,
    scriptsStarted: stats.scriptsStarted,
    liveBots: liveBots.length,
    runningScripts: scripts.length,
  });

  const [now, setNow] = useState(Date.now());
  const [selectedScript, setSelectedScript] = useState<ActiveScript | null>(null);
  const [selectedBot, setSelectedBot] = useState<ActiveBot | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const nextReminder = useMemo(() => getNextReminderInfo(reminders, now), [reminders, now]);

  const refresh = useCallback(() => {
    if (activeProfileKey) void selectProfile(activeProfileKey);
  }, [activeProfileKey, selectProfile]);

  return (
    <Screen title="Overview" subtitle={profileReady ? profile?.name ?? 'Your JNbot network' : 'Loading profile…'} showNotifications gradient>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={!profileReady && !!activeProfileKey} onRefresh={refresh} tintColor={colors.primary} />}
      >
        {guide.visible ? <GettingStartedCard steps={guide.steps} onDismiss={guide.dismiss} /> : (
          <View style={styles.summary}>
            <SummaryCell value={compactDuration(stats.onlineTime)} label="Playtime" icon={<NativeIcon sf="clock" material="schedule" size={14} color={colors.textMuted} />} />
            <SummaryCell value={compactCount(stats.botsJoined)} label="Joins" icon={<NativeIcon sf="waveform.path.ecg" material="show-chart" size={14} color={colors.textMuted} />} />
            <SummaryCell
              value={nextReminder.label}
              label="Cooldown"
              ready={nextReminder.ready}
              icon={<NativeIcon sf="hourglass" material="hourglass-top" size={14} color={colors.textMuted} />}
            />
          </View>
        )}

        <SectionHeader title="Quick actions" />
        <DashboardQuickActions canJoinBot={canUseBots && canUseScripts && canUseAccounts} canUsePlugins={canUsePlugins} />

        {!guide.visible && <AdFreeOfferCard />}

        {canUseScripts && <DashboardScripts />}

        {canUseBots && (
          <>
            <SectionHeader title="Active bots" />
            {liveBots.length ? (
              <View style={styles.group}>
                {liveBots.map((bot, index) => (
                  <SwipeAction
                    key={bot.botId}
                    label="Disconnect"
                    sf="power"
                    material="power-settings-new"
                    enabled={!!commands && bot.status === 'connected' && bot.origin !== 'minecraft'}
                    onPress={() => void commands?.botAction(bot, 'leave')}
                    contentStyle={styles.swipeRow}
                  >
                    <Pressable
                      disabled={bot.status !== 'connected'}
                      onLongPress={() => bot.status === 'connected' && router.push(`/(app)/bot/${bot.botId}`)}
                      onPress={() => setSelectedBot(bot)}
                      style={({ pressed }) => [styles.row, index > 0 && styles.rowBorder, pressed && styles.rowPressed]}
                    >
                      <MCAvatar username={bot.username} size={42} />
                      <View style={styles.rowCopy}>
                        <Txt variant="heading" numberOfLines={1}>{bot.username}</Txt>
                        <Txt variant="muted" numberOfLines={1}>{bot.SCRIPT_NAME || bot.script || 'Idle'}{bot.host ? ` · ${bot.host}` : ''}</Txt>
                      </View>
                      <BotStatusBadge bot={bot} />
                      <NativeIcon sf="chevron.right" material="chevron-right" size={18} color={colors.textFaint} />
                    </Pressable>
                  </SwipeAction>
                ))}
              </View>
            ) : (
              <View style={styles.group}><EmptyState compact icon={<NativeIcon sf="cpu" material="smart-toy" size={28} color={colors.textFaint} />} title="No bots online" subtitle="Join an account when you’re ready to start." /></View>
            )}
          </>
        )}

        {canUseScripts && (
          <>
            <SectionHeader title="Running scripts" />
            {scripts.length ? <BackgroundPowerBanner /> : null}
            {scripts.length ? (
              <View style={styles.group}>
                {scripts.map((script, index) => {
                  const botCount = activeBots.filter((bot) => isBotAssignedToScript(bot, script)).length;
                  const progress = script.progress;
                  const pct =
                    progress && progress.total > 0
                      ? Math.min(1, Math.max(0, progress.current / progress.total))
                      : null;
                  return (
                    <SwipeAction
                      key={script.instanceId}
                      label="Stop"
                      sf="stop.fill"
                      material="stop"
                      enabled={!!commands}
                      onPress={() => void commands?.stopScript(script.instanceId)}
                      contentStyle={styles.swipeRow}
                    >
                      <Pressable onPress={() => setSelectedScript(script)} style={({ pressed }) => [styles.row, index > 0 && styles.rowBorder, pressed && styles.rowPressed]}>
                        <View style={styles.rowIcon}><NativeIcon sf="point.3.connected.trianglepath.dotted" material="account-tree" size={21} color={colors.primary} /></View>
                        <View style={styles.rowCopy}>
                          <Txt variant="heading" numberOfLines={1}>{script.name}</Txt>
                          <Txt variant="muted">{botCount} bot{botCount === 1 ? '' : 's'}{pct !== null ? ` · ${Math.round(pct * 100)}%` : ''}</Txt>
                        </View>
                        <Txt variant="muted" style={styles.runningLabel}>Running</Txt>
                        <NativeIcon sf="chevron.right" material="chevron-right" size={18} color={colors.textFaint} />
                      </Pressable>
                    </SwipeAction>
                  );
                })}
              </View>
            ) : (
              <View style={styles.group}><EmptyState compact icon={<NativeIcon sf="point.3.connected.trianglepath.dotted" material="account-tree" size={28} color={colors.textFaint} />} title="No scripts running" subtitle="Choose a script or plugin to start work." /></View>
            )}
          </>
        )}

        {!guide.visible && <ActivityCard weeks={stats.weeks} />}
      </ScrollView>

      <ActiveScriptDrawer
        script={selectedScript}
        visible={!!selectedScript}
        onClose={() => setSelectedScript(null)}
        onSelectBot={(bot) => {
          setSelectedScript(null);
          setSelectedBot(bot);
        }}
      />
      <ActiveBotDrawer
        bot={selectedBot}
        visible={!!selectedBot}
        onClose={() => setSelectedBot(null)}
        onOpenScript={(script) => {
          setSelectedBot(null);
          setSelectedScript(script);
        }}
      />
    </Screen>
  );
}

function SummaryCell({
  value,
  label,
  icon,
  ready = false,
}: {
  value: string;
  label: string;
  icon: React.ReactNode;
  ready?: boolean;
}) {
  return (
    <View style={styles.summaryCell} accessible accessibilityLabel={`${label}: ${value}`}>
      <View style={styles.summaryHeader}>
        <Txt variant="none" style={styles.summaryLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
          {label.toUpperCase()}
        </Txt>
        <View style={styles.summaryIcon}>{icon}</View>
      </View>
      <Txt
        variant="none"
        style={[styles.summaryValue, ready && styles.summaryValueReady]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
      >
        {value.split(/([a-zA-Z]+)/).map((part, index) => (
          <Txt key={index} variant="none" style={/^[a-zA-Z]+$/.test(part) && !ready ? styles.summaryUnit : undefined}>{part}</Txt>
        ))}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl, gap: 0 },
  summary: { flexDirection: 'row', gap: spacing.sm },
  summaryCell: { flex: 1, minWidth: 0, minHeight: 94, justifyContent: 'space-between', gap: spacing.sm, padding: spacing.md, backgroundColor: colors.bgElevated, borderRadius: radii.xl, borderCurve: 'continuous', borderWidth: 1, borderColor: colors.borderSubtle },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.xs },
  summaryIcon: { width: 22, height: 22, borderRadius: radii.pill, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  summaryValue: { color: colors.text, fontSize: 28, fontWeight: '700', letterSpacing: -0.7, fontVariant: ['tabular-nums'] },
  summaryValueReady: { color: colors.success },
  summaryUnit: { color: colors.textMuted, fontSize: 18, fontWeight: '600', letterSpacing: 0 },
  summaryLabel: { flex: 1, color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
  group: { backgroundColor: colors.surface, borderRadius: radii.lg, borderCurve: 'continuous', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderSubtle, overflow: 'hidden' },
  row: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderSubtle },
  rowPressed: { backgroundColor: colors.surfaceHover },
  swipeRow: { backgroundColor: colors.surface },
  runningLabel: { color: colors.success, fontWeight: '600' },
  rowCopy: { flex: 1, minWidth: 0, gap: 2 },
  rowIcon: { width: 42, height: 42, borderRadius: radii.md, borderCurve: 'continuous', backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
});
