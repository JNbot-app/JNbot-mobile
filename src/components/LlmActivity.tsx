import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { llmAnswerText } from "../generated/client-contract/llm";
import type { LlmRun } from "../hooks/useLlmRun";
import { colors, font, radii, spacing } from "../theme/theme";
import { NativeIcon } from "./NativeIcon";
import { Button, Txt } from "./ui";

/** Seconds since `since`, ticking while `running`. */
function useElapsed(since?: number, until?: number, running?: boolean) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!running) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(timer);
  }, [running]);
  return since ? Math.max(0, Math.round(((running ? now : until ?? now) - since) / 1_000)) : 0;
}

/** Plain-text view of a markdown answer (code is kept). */
const plain = (text: string) => text.replace(/^#+\s*/gm, "").replace(/\*\*|__/g, "");

/**
 * What an AI request is doing right now: its steps, live reasoning and the
 * streamed answer, like the desktop's.
 */
export function LlmActivity({
  run,
  writingLabel = "Writing the draft",
  onDismiss,
}: {
  run: LlmRun;
  writingLabel?: string;
  onDismiss?: () => void;
}) {
  const [showThinking, setShowThinking] = useState(false);
  const elapsed = useElapsed(run.startedAt, run.finishedAt, run.running);
  if (!run.startedAt) return null;

  const answer = llmAnswerText(run.text);
  const steps = [...run.steps];
  if (run.text.includes("```")) steps.push(writingLabel);
  else if (run.running && !steps.length) steps.push(run.thinking ? "Thinking" : "Starting");
  else if (run.running && run.text) steps.push("Answering");
  const title = run.running ? steps.at(-1) : run.error ? "Something went wrong" : run.stopped ? "Stopped" : "Done";
  const thinking = run.thinking.trim();

  return (
    <View style={styles.box}>
      <View style={styles.header}>
        {run.running ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <NativeIcon
            sf={run.error ? "xmark.circle.fill" : "checkmark.circle.fill"}
            material={run.error ? "cancel" : "check-circle"}
            size={18}
            color={run.error ? colors.danger : colors.success}
          />
        )}
        <Txt variant="label" style={styles.title}>
          {title}
        </Txt>
        <Txt variant="faint">{elapsed}s</Txt>
        {run.running ? (
          <Button title="Stop" variant="secondary" small onPress={run.stop} />
        ) : (
          onDismiss && <Button title="Close" variant="secondary" small onPress={onDismiss} />
        )}
      </View>
      {steps.slice(0, run.running ? -1 : undefined).length > 1 &&
        steps.slice(0, run.running ? -1 : undefined).map((step, index) => (
          <Txt key={index} variant="faint">
            ✓ {step}
          </Txt>
        ))}
      {thinking ? (
        <Pressable accessibilityRole="button" onPress={() => setShowThinking(!showThinking)}>
          <Txt variant="faint" style={styles.thinking} numberOfLines={showThinking ? undefined : 1}>
            {showThinking ? thinking : run.running && !run.text ? thinking.split("\n").filter(Boolean).at(-1) : "Show reasoning"}
          </Txt>
        </Pressable>
      ) : null}
      {run.error ? <Txt style={{ color: colors.danger }}>{run.error}</Txt> : null}
      {answer ? <Txt selectable>{plain(answer)}</Txt> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radii.md,
    borderCurve: "continuous",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  title: { flex: 1, color: colors.text },
  thinking: { fontStyle: "italic", fontSize: font.size.xs },
});
