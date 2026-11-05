import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { NativeIcon } from "../NativeIcon";
import type { Trigger } from "../../features/triggers";
import type { AltTag } from "../../store/types";
import { useStore } from "../../store/store";
import { Divider, EmptyState } from "../ui";
import { colors, radii, spacing } from "../../theme/theme";
import { TriggerRow } from "./TriggerRow";
import type { useTriggerEditor } from "./useTriggerEditor";

const EMPTY: Trigger[] = [];

export const targetLabel = (trigger: Trigger, altTags: AltTag[]) => {
  const names = [
    ...(trigger.tags ?? []).map((id) => altTags.find((tag) => tag.id === id)?.name ?? "Deleted tag"),
    ...(trigger.alts ?? []),
  ];
  return names.length ? names.join(", ") : "All bots";
};

/** Automation → Triggers section. The add button lives in the screen header. */
export function TriggerList({ editor }: { editor: ReturnType<typeof useTriggerEditor> }) {
  const triggers = useStore((state) => state.settings.triggers ?? EMPTY);
  const altTags = useStore((state) => state.settings.altTags);
  return (
    <>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        {triggers.length ? (
          <View style={styles.group}>
            {triggers.map((trigger, index) => (
              <React.Fragment key={trigger.id}>
                {index ? <Divider /> : null}
                <TriggerRow
                  trigger={trigger}
                  detail={targetLabel(trigger, altTags)}
                  disabled={editor.busy || !editor.client}
                  onPress={(t) => editor.open(t)}
                  onToggle={editor.toggle}
                />
              </React.Fragment>
            ))}
          </View>
        ) : (
          <EmptyState
            icon={<NativeIcon sf="bolt" material="flash-on" size={40} color={colors.textFaint} />}
            title="No triggers yet"
            subtitle="Triggers react to events on your bots, like a disconnect or a chat message, by notifying you or running a script automatically."
            actionLabel="Add a trigger"
            onAction={editor.busy || !editor.client ? undefined : () => editor.open()}
          />
        )}
      </ScrollView>
      {editor.editor}
    </>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  group: { overflow: "hidden", backgroundColor: colors.surface, borderRadius: radii.lg, borderCurve: "continuous" },
});
