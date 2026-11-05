import React, { useState } from "react";
import { Alert } from "react-native";
import { describeTrigger, newTrigger, type Trigger } from "../../features/triggers";
import { useAsyncAction } from "../../hooks/useAsyncAction";
import { useClient } from "../../net/ConnectionProvider";
import { useStore } from "../../store/store";
import { TriggerEditor } from "./TriggerEditor";
import { useOpenShareLink, useShareActions, useShareUpdateAction } from "../../features/shares";

/** Shared save/toggle/delete flow for the trigger list and the bot tab. */
export function useTriggerEditor() {
  const client = useClient();
  const { busy, run } = useAsyncAction();
  const [editing, setEditing] = useState<{ trigger: Trigger; exists: boolean } | null>(null);
  const profileKey = useStore((state) => state.activeProfileKey);
  const { local: canShare } = useShareActions();
  const openShareLink = useOpenShareLink();

  const shareUpdate = useShareUpdateAction("trigger", editing?.trigger.id ?? "");

  const write = (update: (triggers: Trigger[]) => Trigger[]) => {
    if (!client) return Promise.reject(new Error("Connect to JNbot before editing triggers."));
    const latest = useStore.getState().settings.triggers ?? [];
    return client.updateSettings({ path: ["triggers"], value: update(latest) });
  };
  const upsert = (trigger: Trigger) =>
    write((triggers) =>
      triggers.some((t) => t.id === trigger.id)
        ? triggers.map((t) => (t.id === trigger.id ? trigger : t))
        : [...triggers, trigger],
    );

  const open = (trigger?: Trigger, defaults?: Partial<Trigger>) =>
    setEditing({
      trigger: trigger ?? newTrigger(`${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`, defaults),
      exists: Boolean(trigger),
    });
  const toggle = (trigger: Trigger, enabled: boolean) =>
    void run(() => upsert({ ...trigger, enabled }));
  const remove = (trigger: Trigger) =>
    Alert.alert("Delete trigger?", `Remove “${describeTrigger(trigger)}”?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          void run(async () => {
            await write((triggers) => triggers.filter((t) => t.id !== trigger.id));
            setEditing(null);
          }, "Trigger deleted"),
      },
    ]);

  const editor = editing ? (
    <TriggerEditor
      key={editing.trigger.id}
      trigger={editing.trigger}
      exists={editing.exists}
      client={client}
      busy={busy}
      onClose={() => setEditing(null)}
      onDelete={remove}
      onCheckUpdate={shareUpdate?.run}
      onShare={
        canShare
          ? (trigger) => {
              setEditing(null);
              openShareLink({
                kind: "trigger",
                ref: trigger.id,
                title: describeTrigger(trigger),
                ...(profileKey ? { profileKey } : {}),
              });
            }
          : undefined
      }
      onSave={(trigger) =>
        void run(async () => {
          await upsert(trigger);
          setEditing(null);
        }, "Trigger saved")
      }
    />
  ) : null;

  return { busy, client, open, toggle, editor };
}
