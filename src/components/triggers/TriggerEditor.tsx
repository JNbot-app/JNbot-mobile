import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Switch, TextInput, View } from "react-native";
import {
  describeTrigger,
  TRIGGER_EVENT_IDS,
  TRIGGER_EVENTS,
  triggerProblem,
  type Trigger,
  type TriggerEvent,
} from "../../features/triggers";
import type { JNbotClient } from "../../client/JNbotClient";
import { useStore } from "../../store/store";
import { BottomSheet } from "../BottomSheet";
import { Choice, PickerField } from "../PickerField";
import { Button, Txt } from "../ui";
import { colors, spacing } from "../../theme/theme";
import { TriggerActionsField } from "./TriggerActionsField";
import { TriggerSection } from "./TriggerSection";
import { triggerInputStyle } from "./triggerInputStyle";
import { LlmPrompt } from "../LlmPrompt";

const EVENT_CHOICES: Choice[] = TRIGGER_EVENT_IDS.map((event) => ({
  label: TRIGGER_EVENTS[event].name,
  value: event,
  description: TRIGGER_EVENTS[event].description,
}));

type Props = {
  trigger: Trigger;
  exists: boolean;
  client: JNbotClient | null;
  busy: boolean;
  onClose: () => void;
  onSave: (trigger: Trigger) => void;
  onDelete: (trigger: Trigger) => void;
  /** Share the saved trigger (only on this phone). */
  onShare?: (trigger: Trigger) => void;
  /** Set when the trigger was installed from a share. */
  onCheckUpdate?: () => void;
};

function useTargetChoices() {
  const altTags = useStore((state) => state.settings.altTags);
  const alts = useStore((state) => state.alts);
  return useMemo(
    () => ({
      tags: altTags.map((tag) => ({ label: tag.name, value: tag.id })),
      alts: alts.map(({ username }) => ({ label: username, value: username })),
    }),
    [altTags, alts],
  );
}

const toStrings = (value: unknown) => (Array.isArray(value) ? value.map(String) : []);
const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Txt variant="label">{label}</Txt>
      {children}
      {hint ? <Txt variant="faint">{hint}</Txt> : null}
    </View>
  );
}

export function TriggerEditor({ trigger, exists, client, busy, onClose, onSave, onDelete, onShare, onCheckUpdate }: Props) {
  const [draft, setDraft] = useState(trigger);
  const [error, setError] = useState<string | null>(null);
  const targets = useTargetChoices();
  const event = TRIGGER_EVENTS[draft.event];
  const targetCount = (draft.tags?.length ?? 0) + (draft.alts?.length ?? 0);
  const generate = async (description: string) => {
    const generated = await client!.generate<Trigger>({ kind: "trigger", description });
    setDraft({ ...generated, id: draft.id });
    setError(null);
  };
  const update = (patch: Partial<Trigger>) => {
    setDraft((current) => ({ ...current, ...patch }));
    setError(null);
  };
  // Follow the new event's default cooldown unless the user changed it.
  const changeEvent = (next: TriggerEvent) =>
    update({
      event: next,
      filter: undefined,
      cooldown: (draft.cooldown ?? 0) === (event.cooldown ?? 0) ? TRIGGER_EVENTS[next].cooldown ?? 0 : draft.cooldown,
    });
  const save = () => {
    const next = { ...draft, name: draft.name?.trim() || undefined };
    const problem = triggerProblem(next);
    if (problem) setError(problem);
    else onSave(next);
  };

  return (
    <BottomSheet visible accessibilityLabel="Edit trigger" onClose={onClose}>
      <ScrollView contentContainerStyle={styles.editor} keyboardShouldPersistTaps="handled">
        <Txt variant="heading">{exists ? "Edit trigger" : "New trigger"}</Txt>
        {!exists && client ? (
          <LlmPrompt placeholder="Describe it, e.g. post to Discord when a bot dies" onSubmit={generate} />
        ) : null}
        <TriggerSection title="When" summary={event.name} defaultOpen>
          <PickerField title="Event" options={EVENT_CHOICES} value={draft.event} onChange={(value) => changeEvent(value as TriggerEvent)} />
          {event.filter ? (
            <Field label={event.filter.label}>
              <TextInput
                value={draft.filter ?? ""}
                onChangeText={(filter) => update({ filter })}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType={event.filter.kind === "number" ? "number-pad" : "default"}
                placeholder={event.filter.kind === "players" ? "Names, comma separated" : event.filter.placeholder}
                placeholderTextColor={colors.textFaint}
                style={triggerInputStyle}
              />
            </Field>
          ) : null}
        </TriggerSection>
        <TriggerSection title="Do" summary={plural(draft.actions.length, "action")} defaultOpen>
          <TriggerActionsField actions={draft.actions} vars={event.vars} client={client} onChange={(actions) => update({ actions })} />
        </TriggerSection>
        <TriggerSection title="Bots" summary={targetCount ? plural(targetCount, "selection") : "All bots"}>
          <Txt variant="faint">Leave both empty to run on every bot.</Txt>
          <Field label="Tags">
            <PickerField
              title="Tags"
              options={targets.tags}
              multiple
              clearable
              placeholder="Any tag"
              value={draft.tags ?? []}
              onChange={(value) => update({ tags: toStrings(value) })}
            />
          </Field>
          <Field label="Accounts">
            <PickerField
              title="Accounts"
              options={targets.alts}
              multiple
              clearable
              placeholder="Any account"
              value={draft.alts ?? []}
              onChange={(value) => update({ alts: toStrings(value) })}
            />
          </Field>
        </TriggerSection>
        <TriggerSection title="Settings" summary={draft.enabled ? "Enabled" : "Disabled"}>
          <Field label="Name">
            <TextInput
              value={draft.name ?? describeTrigger({ ...draft, name: undefined })}
              onChangeText={(name) => update({ name })}
              maxLength={60}
              placeholderTextColor={colors.textFaint}
              style={triggerInputStyle}
            />
          </Field>
          <Field label="Cooldown (seconds)" hint="Minimum time between two runs on the same bot.">
            <TextInput
              value={String(draft.cooldown ?? 0)}
              onChangeText={(value) => update({ cooldown: Number(value.replace(/\D/g, "")) || 0 })}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={colors.textFaint}
              style={triggerInputStyle}
            />
          </Field>
          <View style={styles.switchRow}>
            <Txt style={{ flex: 1 }}>Enabled</Txt>
            <Switch
              accessibilityLabel="Trigger enabled"
              value={draft.enabled}
              onValueChange={(enabled) => update({ enabled })}
              ios_backgroundColor={colors.border}
              trackColor={{ false: colors.border, true: colors.primaryDim }}
              thumbColor={draft.enabled ? colors.primary : colors.textMuted}
            />
          </View>
        </TriggerSection>
        {error ? <Txt variant="muted" style={{ color: colors.danger }}>{error}</Txt> : null}
        {exists ? <View style={styles.buttons}>
          {onCheckUpdate ? <Button title="Update" variant="secondary" small disabled={busy} style={{ flex: 1 }} onPress={onCheckUpdate} /> : null}
          {onShare ? <Button title="Share" variant="secondary" small disabled={busy} style={{ flex: 1 }} onPress={() => onShare(trigger)} /> : null}
          <Button title="Delete" variant="secondary" small disabled={busy} style={{ flex: 1 }} onPress={() => onDelete(draft)} />
        </View> : null}
        <Button title={exists ? "Save" : "Add trigger"} full loading={busy} onPress={save} />
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  editor: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  field: { gap: spacing.xs },
  switchRow: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: spacing.md },
  buttons: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
});
