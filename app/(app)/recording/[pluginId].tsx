import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Screen } from "../../../src/components/Screen";
import { Button, EmptyState, Txt } from "../../../src/components/ui";
import { NativeIcon } from "../../../src/components/NativeIcon";
import { RecordingStepRow } from "../../../src/components/recording/RecordingStepRow";
import { RecordingStepSheet } from "../../../src/components/recording/RecordingStepSheet";
import { clock, type RecordingDocument, type RecordingStep } from "../../../src/features/plugins/recording";
import { useClient } from "../../../src/net/ConnectionProvider";
import { useStore } from "../../../src/store/store";
import { colors, spacing } from "../../../src/theme/theme";

/** Read-only replay steps of a recording plugin; recording and editing stay on the desktop. */
export default function RecordingViewer() {
  const { pluginId } = useLocalSearchParams<{ pluginId: string }>();
  const client = useClient();
  const insets = useSafeAreaInsets();
  const name = useStore((state) => state.macros.list.find((plugin) => plugin.pluginId === pluginId)?.name);
  const [recording, setRecording] = useState<RecordingDocument | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    if (!client) return;
    let active = true;
    setError(null);
    client.getRecording(pluginId).then(
      (next) => { if (active) setRecording(next); },
      (reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "Could not load the recording."); },
    );
    return () => { active = false; };
  }, [attempt, client, pluginId]);

  const steps = recording?.steps;
  const open = useCallback((step: RecordingStep) => setSelected(steps?.indexOf(step) ?? null), [steps]);
  const renderItem = useCallback(
    ({ item, index }: { item: RecordingStep; index: number }) => (
      <RecordingStepRow step={item} first={index === 0} last={index === (steps?.length ?? 0) - 1} onPress={open} />
    ),
    [open, steps],
  );

  const title = name ?? recording?.name ?? "Recording";
  const subtitle = recording ? `${recording.steps.length} ${recording.steps.length === 1 ? "step" : "steps"} · ${clock(recording.durationMs)}` : undefined;

  if (!recording) {
    return (
      <Screen title={title} back>
        {error ? (
          <View style={styles.center}>
            <EmptyState icon={<NativeIcon sf="exclamationmark.triangle" material="warning" size={36} color={colors.textFaint} />} title="Recording unavailable" subtitle={error} />
            <Button title="Try again" variant="secondary" onPress={() => setAttempt((value) => value + 1)} />
          </View>
        ) : (
          <ActivityIndicator accessibilityLabel="Loading recording" color={colors.primary} style={styles.center} />
        )}
      </Screen>
    );
  }

  const source = [recording.source.username, recording.source.serverAddress].filter(Boolean).join(" on ");

  return (
    <Screen title={title} subtitle={subtitle} back>
      <FlatList
        data={recording.steps}
        keyExtractor={(step) => step.id}
        renderItem={renderItem}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + spacing.xl }]}
        ListHeaderComponent={
          source || recording.interrupted ? (
            <View style={styles.header}>
              {source ? <Txt variant="muted">Recorded as {source}</Txt> : null}
              {recording.interrupted ? <Txt variant="muted" style={styles.warning}>This recording ended early.</Txt> : null}
            </View>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            icon={<NativeIcon sf="record.circle" material="fiber-manual-record" size={38} color={colors.textFaint} />}
            title="No steps yet"
            subtitle="Record a take in JNbot on your computer."
          />
        }
        ListFooterComponent={steps?.length ? <Txt variant="faint" style={styles.footer}>Record and edit steps in JNbot on your computer.</Txt> : null}
      />
      <RecordingStepSheet step={selected === null ? null : recording.steps[selected] ?? null} index={selected ?? 0} onClose={() => setSelected(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: spacing.md },
  list: { paddingHorizontal: spacing.lg, paddingTop: spacing.xs },
  header: { gap: 2, paddingHorizontal: spacing.xs, paddingBottom: spacing.md },
  warning: { color: colors.warning },
  footer: { textAlign: "center", paddingTop: spacing.lg },
});
