import React, { useState } from "react";
import { ScrollView, StyleSheet, Switch, TextInput, View } from "react-native";
import { BottomSheet } from "../BottomSheet";
import { Button, Txt } from "../ui";
import { PickerField } from "../PickerField";
import { useAsyncAction } from "../../hooks/useAsyncAction";
import { useClient } from "../../net/ConnectionProvider";
import {
  selectCanUseAccounts,
  selectProfileReady,
  useStore,
} from "../../store/store";
import { colors, font, radii, spacing } from "../../theme/theme";
import {
  REPEAT_CHOICES,
  repeatPreset,
  scheduleError,
  type RepeatPreset,
  type ScheduleRepeat,
  type ScriptSchedule,
} from "../../generated/client-contract/cooldowns";
import { useRunnableScripts } from "../../hooks/useRunnableScripts";
import ScheduleDateTime from "./ScheduleDateTime";
import ScheduleOverrides from "./ScheduleOverrides";
import { chainIdFromPluginId } from "../../generated/client-contract/chains";

export default function ScheduleEditor({
  schedule,
  onClose,
  onDelete,
}: {
  schedule?: ScriptSchedule;
  onClose: () => void;
  onDelete: (schedule: ScriptSchedule) => void;
}) {
  const client = useClient();
  const ready = useStore(selectProfileReady);
  const canUseAccounts = useStore(selectCanUseAccounts);
  const { scripts, loading } = useRunnableScripts();
  const { busy, run } = useAsyncAction();
  const [name, setName] = useState(schedule?.name ?? "");
  const [pluginId, setPluginId] = useState(schedule?.pluginId ?? "");
  const [nextRunAt, setNextRunAt] = useState(
    schedule?.nextRunAt ??
      Math.ceil((Date.now() + 3_600_000) / 60_000) * 60_000,
  );
  const [preset, setPreset] = useState<RepeatPreset>(
    repeatPreset(schedule?.repeat),
  );
  const [every, setEvery] = useState(String(schedule?.repeat?.every ?? 1));
  const [unit, setUnit] = useState<ScheduleRepeat["unit"]>(
    schedule?.repeat?.unit ?? "day",
  );
  const [enabled, setEnabled] = useState(schedule?.autoStart ?? true);
  const [options, setOptions] = useState<Record<string, unknown>>(
    schedule?.options ?? {},
  );
  const [error, setError] = useState<string>();
  const selected = scripts.find((script) => script.info.pluginId === pluginId);
  const save = () => {
    const next: ScriptSchedule = {
      kind: "schedule",
      id:
        schedule?.id ??
        `schedule-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: name.trim(),
      pluginId,
      nextRunAt,
      autoStart: enabled,
      repeat:
        preset === "never"
          ? undefined
          : {
              every: preset === "custom" ? Number(every) : 1,
              unit: preset === "custom" ? unit : preset,
            },
      options: Object.keys(options).length ? options : undefined,
    };
    const validation = scheduleError(next);
    if (validation || !selected)
      return setError(validation ?? "Choose an available script.");
    void run(
      async () => {
        if (!client || !ready)
          throw new Error("Choose a profile before scheduling scripts.");
        const latest = useStore.getState().settings.reminders ?? [];
        if (schedule && !latest.some((entry) => entry.id === schedule.id))
          throw new Error(
            "This schedule has expired or was deleted. Create a new schedule.",
          );
        await client.updateSettings({
          path: ["reminders"],
          value: schedule
            ? latest.map((entry) => (entry.id === schedule.id ? next : entry))
            : [...latest, next],
        });
        onClose();
      },
      schedule ? "Schedule updated" : "Script scheduled",
    );
  };
  return (
    <BottomSheet
      visible
      onClose={onClose}
      accessibilityLabel={schedule ? "Edit schedule" : "Schedule script"}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        <Txt variant="heading">
          {schedule ? "Edit schedule" : "Schedule script"}
        </Txt>
        <View style={styles.field}>
          <Txt variant="label">Script</Txt>
          <PickerField
            title="Script"
            value={pluginId}
            placeholder={loading ? "Loading scripts…" : "Choose a script"}
            options={scripts.map(({ info }) => ({
              label: info.name,
              value: info.pluginId,
            }))}
            onChange={(value) => {
              if (typeof value !== "string") return;
              setPluginId(value);
              setOptions({});
              setError(undefined);
              if (!name)
                setName(
                  scripts.find((script) => script.info.pluginId === value)?.info
                    .name ?? "",
                );
            }}
          />
        </View>
        <View style={styles.field}>
          <Txt variant="label">Name</Txt>
          <TextInput
            accessibilityLabel="Schedule name"
            value={name}
            onChangeText={setName}
            maxLength={60}
            style={styles.input}
          />
        </View>
        <View style={styles.field}>
          <Txt variant="label">Next run</Txt>
          <ScheduleDateTime value={nextRunAt} onChange={setNextRunAt} />
        </View>
        <View style={styles.field}>
          <Txt variant="label">Repeat</Txt>
          <PickerField
            title="Repeat"
            value={preset}
            options={REPEAT_CHOICES}
            onChange={(value) => {
              if (
                value === "never" ||
                value === "hour" ||
                value === "day" ||
                value === "week" ||
                value === "custom"
              )
                setPreset(value);
            }}
          />
        </View>
        {preset === "custom" && (
          <View style={styles.field}>
            <Txt variant="label">Run every</Txt>
            <TextInput
              accessibilityLabel="Repeat interval"
              keyboardType="number-pad"
              value={every}
              onChangeText={setEvery}
              style={styles.input}
            />
            <PickerField
              title="Repeat unit"
              value={unit}
              options={["hour", "day", "week"].map((value) => ({
                label: `${value}s`,
                value,
              }))}
              onChange={(value) => {
                if (value === "hour" || value === "day" || value === "week")
                  setUnit(value);
              }}
            />
          </View>
        )}
        <View style={styles.enabled}>
          <Txt variant="body">Enabled</Txt>
          <Switch
            accessibilityLabel="Schedule enabled"
            value={enabled}
            onValueChange={setEnabled}
            trackColor={{ true: colors.primary }}
          />
        </View>
        {selected && !chainIdFromPluginId(pluginId) && (
          <ScheduleOverrides
            key={pluginId}
            script={selected}
            values={options}
            onChange={setOptions}
          />
        )}
        <Txt variant="muted">
          Missed runs are skipped. Repeats use fixed intervals; local time can
          shift when daylight saving changes.
        </Txt>
        {error && (
          <Txt variant="body" style={{ color: colors.danger }}>
            {error}
          </Txt>
        )}
        <Button
          title={schedule ? "Save schedule" : "Schedule script"}
          full
          disabled={busy || loading || !ready || !canUseAccounts}
          onPress={save}
        />
        <Button
          title="Cancel"
          full
          variant="ghost"
          disabled={busy}
          onPress={onClose}
        />
        {schedule && (
          <Button
            title="Delete schedule"
            full
            variant="danger"
            disabled={busy}
            onPress={() => onDelete(schedule)}
          />
        )}
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  field: { gap: spacing.sm },
  input: {
    minHeight: 44,
    color: colors.text,
    fontSize: font.size.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
  },
  enabled: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
});
