import { reminderDueAt, repeatInterval, scheduleLabel, type ScriptCooldown, type ScriptSchedule } from '../../generated/client-contract/cooldowns';
import ScheduleEditor from './ScheduleEditor';
import React, { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from "react-native";
import { BottomSheet } from "../BottomSheet";
import { NativeIcon } from "../NativeIcon";
import { Button, EmptyState, Txt } from "../ui";
import { useAsyncAction } from "../../hooks/useAsyncAction";
import { useClient } from "../../net/ConnectionProvider";
import { selectProfileReady, useStore } from "../../store/store";
import type { Cooldown } from "../../store/types";
import { colors, font, radii, spacing } from "../../theme/theme";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function remainingLabel(ms: number) {
  if (ms <= 0) return "Ready";
  const days = Math.floor(ms / DAY);
  const hours = Math.floor((ms % DAY) / HOUR);
  const minutes = Math.floor((ms % HOUR) / MINUTE);
  if (days) return `${days}d ${hours}h`;
  if (hours) return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
  return `${Math.max(1, minutes)}m`;
}

function intervalLabel(cooldownMs: number) {
  const days = Math.floor(cooldownMs / DAY);
  const hours = Math.floor((cooldownMs % DAY) / HOUR);
  const minutes = Math.round((cooldownMs % HOUR) / MINUTE);
  return [days && `${days}d`, hours && `${hours}h`, minutes && `${minutes}m`]
    .filter(Boolean).join(" ") || "1m";
}

function nextRunLabel(timestamp: number) {
  if (!Number.isFinite(new Date(timestamp).getTime())) return "Invalid date";
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short", hour: "numeric", minute: "2-digit",
  }).format(timestamp);
}

export function CooldownList({ creatingSchedule, onCloseSchedule, onCreate }: {
  onCreate?: () => void;
  creatingSchedule: boolean;
  onCloseSchedule: () => void;
}) {
  const client = useClient();
  const profileKey = useStore((state) => state.activeProfileKey);
  const [scheduleEditor, setScheduleEditor] = useState<{ schedule?: ScriptSchedule } | null>(null);
  useEffect(() => { setScheduleEditor(null); setEditing(null); onCloseSchedule(); }, [profileKey, onCloseSchedule]);
  const isProfileReady = useStore(selectProfileReady);
  const cooldowns = useStore((state) => state.settings.reminders ?? []);
  const [now, setNow] = useState(Date.now());
  const [editing, setEditing] = useState<ScriptCooldown | null>(null);
  const { busy, run } = useAsyncAction();
  const sorted = useMemo(
    () => [...cooldowns].sort((a, b) => reminderDueAt(a) - reminderDueAt(b)),
    [cooldowns],
  );

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const replace = (cooldown: Cooldown) => {
    if (!isProfileReady || !client) return Promise.reject(new Error("Choose a profile before editing cooldowns."));
    const latest = useStore.getState().settings.reminders ?? [];
    return client.updateSettings({
      path: ["reminders"],
      value: latest.map((item) => item.id === cooldown.id ? cooldown : item),
    });
  };

  // Same as an auto-run firing: start the script with the cooldown's options and restart the countdown.
  const runNow = (cooldown: ScriptCooldown) => void run(async () => {
    if (!client) throw new Error("Choose a profile before running cooldowns.");
    await client.startScript({
      script: "macro",
      arguments: { devMode: false, optionOverrides: cooldown.options, macroInfo: { pluginId: cooldown.pluginId } },
    });
    await replace({ ...cooldown, time: Date.now() });
  }, "Script started");

  const remove = (cooldown: Cooldown) => {
    Alert.alert(cooldown.kind === "schedule" ? "Delete schedule?" : "Delete cooldown?", `Remove “${cooldown.name}”?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: () => void run(async () => {
          if (!isProfileReady || !client) throw new Error("Choose a profile before editing cooldowns.");
          const latest = useStore.getState().settings.reminders ?? [];
          await client.updateSettings({ path: ["reminders"], value: latest.filter((item) => item.id !== cooldown.id) });
          setEditing(null); setScheduleEditor(null);
        }, "Cooldown deleted")
      },
    ]);
  };

  return (
    <>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        {!sorted.length && <EmptyState icon={<NativeIcon sf="timer" material="timer" size={40} color={colors.textFaint} />} actionLabel="Schedule a script" onAction={onCreate} title="No cooldowns yet" subtitle="Cooldowns show when a script can run again. Tap + to schedule a script to start on its own, or let scripts create cooldowns for you." />}
        {sorted.map((cooldown) => {
          const scheduled = cooldown.kind === "schedule";
          const readyAt = reminderDueAt(cooldown);
          const remaining = readyAt - now;
          const ready = !scheduled && remaining <= 0;
          const paused = scheduled && !cooldown.autoStart;
          const length = scheduled ? repeatInterval(cooldown.repeat) : cooldown.cooldown;
          const progress = length > 0 ? Math.min(1, Math.max(0, 1 - remaining / length)) : 0;
          const disabled = busy || !isProfileReady || !client;
          const auto = cooldown.autoStart === true;
          return <Pressable
            key={cooldown.id}
            accessibilityRole="button"
            accessibilityLabel={`Edit ${cooldown.name}`}
            onPress={() => { if (scheduled) setScheduleEditor({ schedule: cooldown }); else setEditing(cooldown); }}
            style={({ pressed }) => [styles.card, pressed && styles.rowPressed]}
          >
            <View style={styles.row}>
              <View style={[styles.statusIcon, ready && styles.readyIcon]}>
                <NativeIcon
                  sf={ready ? "checkmark" : paused ? "pause.fill" : scheduled ? "calendar" : "clock"}
                  material={ready ? "check" : paused ? "pause" : scheduled ? "event" : "schedule"}
                  size={20}
                  color={ready ? colors.success : colors.textMuted}
                />
              </View>
              <View style={styles.rowBody}>
                <Txt variant="heading" numberOfLines={1}>{cooldown.name}</Txt>
                <Txt variant="faint" numberOfLines={1}>
                  {scheduled ? `${paused ? "Paused · " : ""}${scheduleLabel(cooldown.repeat)}` : `Every ${intervalLabel(cooldown.cooldown)}`}
                </Txt>
              </View>
              {ready ? (
                <Button variant="secondary" title="Run" small disabled={disabled} icon={<NativeIcon sf="play.fill" material="play-arrow" size={14} color={colors.textMuted} />} onPress={() => runNow(cooldown)} />
              ) : (
                <View style={styles.timeBlock}>
                  <Txt variant="heading" style={styles.timeLeft}>{remaining <= 0 ? "Due" : remainingLabel(remaining)}</Txt>
                  <Txt variant="faint">{nextRunLabel(readyAt)}</Txt>
                </View>
              )}
              <Pressable
                accessibilityRole="switch"
                accessibilityState={{ checked: auto }}
                accessibilityLabel={scheduled ? `Enable ${cooldown.name}` : `Auto-run ${cooldown.name}`}
                disabled={disabled}
                hitSlop={8}
                onPress={() => void run(() => replace({ ...cooldown, autoStart: !auto }))}
                style={[styles.autoButton, auto && styles.autoButtonOn]}
              >
                <NativeIcon sf={auto ? "bolt.fill" : "bolt"} material="bolt" size={18} color={auto ? colors.primary : colors.textMuted} />
              </Pressable>
            </View>
            {ready ? null : <View style={styles.track}>
              <View style={[styles.fill, { width: `${progress * 100}%` }, paused && styles.fillPaused]} />
            </View>}
          </Pressable>;
        })}
      </ScrollView>
      {(scheduleEditor || creatingSchedule) && <ScheduleEditor key={scheduleEditor?.schedule?.id ?? "new"} schedule={scheduleEditor?.schedule} onClose={() => { setScheduleEditor(null); onCloseSchedule(); }} onDelete={remove} />}
      <CooldownEditor
        cooldown={editing}
        busy={busy}
        onClose={() => setEditing(null)}
        onDelete={remove}
        onReset={(cooldown) => void run(async () => {
          await replace({ ...cooldown, time: Date.now() });
          setEditing(null);
        }, "Countdown restarted")}
        onSave={(cooldown) => void run(async () => {
          await replace(cooldown);
          setEditing(null);
        }, "Cooldown updated")}
      />
    </>
  );
}

function CooldownEditor({ cooldown, busy, onClose, onDelete, onReset, onSave }: {
  cooldown: ScriptCooldown | null;
  busy: boolean;
  onClose: () => void;
  onDelete: (cooldown: Cooldown) => void;
  onReset: (cooldown: ScriptCooldown) => void;
  onSave: (cooldown: ScriptCooldown) => void;
}) {
  const [name, setName] = useState("");
  const [days, setDays] = useState("0");
  const [hours, setHours] = useState("0");
  const [minutes, setMinutes] = useState("0");
  const [autoStart, setAutoStart] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!cooldown) return;
    setName(cooldown.name);
    setDays(String(Math.floor(cooldown.cooldown / DAY)));
    setHours(String(Math.floor((cooldown.cooldown % DAY) / HOUR)));
    setMinutes(String(Math.round((cooldown.cooldown % HOUR) / MINUTE)));
    setAutoStart(cooldown.autoStart === true);
    setError(null);
  }, [cooldown]);

  const save = () => {
    if (!cooldown) return;
    const trimmed = name.trim();
    if (!trimmed) return setError("Enter a cooldown name.");
    if (trimmed.length > 60) return setError("Use 60 characters or fewer.");
    const cooldownMs = Math.max(0, Number(days) || 0) * DAY
      + Math.max(0, Number(hours) || 0) * HOUR
      + Math.max(0, Number(minutes) || 0) * MINUTE;
    if (cooldownMs < MINUTE) return setError("Set an interval of at least 1 minute.");
    const time = cooldownMs !== cooldown.cooldown ? Date.now() : cooldown.time;
    onSave({ ...cooldown, name: trimmed, cooldown: cooldownMs, time, autoStart });
  };

  return (
    <BottomSheet visible={!!cooldown} onClose={onClose} accessibilityLabel="Edit cooldown">
      {cooldown ? <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.editor}>
        <View style={styles.editorHeader}>
          <View style={styles.editorTitle}><Txt variant="heading">Edit cooldown</Txt><Txt variant="muted" numberOfLines={1}>{cooldown.pluginId}</Txt></View>
          <Button title="Done" small variant="ghost" onPress={save} disabled={busy} />
        </View>
        <View style={styles.fieldGroup}>
          <Txt variant="label" style={styles.fieldLabel}>NAME</Txt>
          <TextInput accessibilityLabel="Cooldown name" value={name} onChangeText={(value) => { setName(value); setError(null); }} maxLength={61} placeholder="Cooldown name" placeholderTextColor={colors.textFaint} style={styles.nameInput} />
          {error ? <Txt variant="faint" style={styles.error}>{error}</Txt> : null}
        </View>
        <View style={styles.fieldGroup}>
          <Txt variant="label" style={styles.fieldLabel}>RUN EVERY</Txt>
          <View style={styles.durationRow}>
            <DurationField label="days" value={days} onChange={setDays} />
            <DurationField label="hours" value={hours} onChange={setHours} />
            <DurationField label="minutes" value={minutes} onChange={setMinutes} />
          </View>
          <Txt variant="faint">Changing the interval resets the countdown.</Txt>
        </View>
        <View style={styles.settingGroup}>
          <View style={styles.settingCopy}><Txt variant="body">Auto-run when ready</Txt><Txt variant="muted">Runs the script and restarts this countdown.</Txt></View>
          <Switch value={autoStart} onValueChange={setAutoStart} ios_backgroundColor={colors.border} trackColor={{ false: colors.border, true: colors.primaryDim }} thumbColor={autoStart ? colors.primary : colors.textMuted} />
        </View>
        <Button title="Restart countdown now" variant="secondary" full disabled={busy} icon={<NativeIcon sf="arrow.clockwise" material="refresh" size={18} color={colors.text} />} onPress={() => onReset(cooldown)} />
        <Button title="Delete cooldown" variant="danger" full disabled={busy} onPress={() => onDelete(cooldown)} />
      </ScrollView> : null}
    </BottomSheet>
  );
}

function DurationField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <View style={styles.durationField}>
    <TextInput accessibilityLabel={label} value={value} onChangeText={(text) => onChange(text.replace(/[^0-9]/g, ""))} keyboardType="number-pad" selectTextOnFocus maxLength={4} style={styles.durationInput} />
    <Txt variant="faint">{label}</Txt>
  </View>;
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md
  },
  emptyWrap: { flexGrow: 1, justifyContent: "center", padding: spacing.lg },
  intro: { paddingVertical: spacing.sm, paddingHorizontal: spacing.xs },
  card: { overflow: "hidden", backgroundColor: colors.surface, borderRadius: radii.lg, borderCurve: "continuous" },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md },
  rowPressed: { backgroundColor: colors.surfaceHover },
  statusIcon: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 20, backgroundColor: colors.surfaceAlt },
  readyIcon: { backgroundColor: colors.successSoft },
  rowBody: { flex: 1, minWidth: 0, gap: 2 },
  timeBlock: { alignItems: "flex-end", gap: 2 },
  timeLeft: { fontVariant: ["tabular-nums"] },
  autoButton: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: radii.md, borderCurve: "continuous" },
  autoButtonOn: { backgroundColor: colors.surfaceAlt },
  track: { height: 3, backgroundColor: colors.surfaceAlt },
  fill: { height: 3, backgroundColor: colors.primary },
  fillPaused: { backgroundColor: colors.textFaint },
  editor: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.lg },
  editorHeader: { flexDirection: "row", alignItems: "center", minHeight: 48 },
  editorTitle: { flex: 1, minWidth: 0 },
  fieldGroup: { gap: spacing.sm },
  fieldLabel: { color: colors.textFaint, letterSpacing: 0.7 },
  nameInput: { minHeight: process.env.EXPO_OS === "android" ? 48 : 44, color: colors.text, fontSize: font.size.md, paddingHorizontal: spacing.md, backgroundColor: colors.surface, borderRadius: radii.md, borderCurve: "continuous" },
  error: { color: colors.danger },
  durationRow: { flexDirection: "row", gap: spacing.sm },
  durationField: { flex: 1, minWidth: 0, alignItems: "center", gap: 5, padding: spacing.sm, backgroundColor: colors.surface, borderRadius: radii.md, borderCurve: "continuous" },
  durationInput: { alignSelf: "stretch", minHeight: 38, textAlign: "center", color: colors.text, fontSize: 20, fontWeight: "600" },
  settingGroup: { minHeight: 64, flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, backgroundColor: colors.surface, borderRadius: radii.md, borderCurve: "continuous" },
  settingCopy: { flex: 1, minWidth: 0, gap: 2 },
});
