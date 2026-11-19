import { StyleSheet, View } from "react-native";
import type { LlmOptionsResult } from "../generated/client-contract/llm";
import { colors, radii, spacing } from "../theme/theme";
import { Button, Txt } from "./ui";

const show = (value: unknown): string => {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return value.length ? value.map(show).join(", ") : "—";
  if (typeof value === "boolean") return value ? "On" : "Off";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

/** The settings the AI wants to change, to apply or discard (like the desktop's). */
export function LlmOptionChanges({
  result,
  onApply,
  onDiscard,
}: {
  result: LlmOptionsResult;
  onApply: () => void;
  onDiscard: () => void;
}) {
  const nothing = !result.changes.length;
  return (
    <View style={styles.box}>
      {nothing ? <Txt variant="muted">Nothing to change: the settings already match.</Txt> : null}
      {result.changes.map((change) => (
        <Txt key={change.id} variant="muted">
          <Txt variant="label">{change.label}</Txt>
          {"  "}
          <Txt variant="faint" style={styles.from}>
            {show(change.from)}
          </Txt>
          {"  →  "}
          <Txt style={{ color: colors.text }}>{show(change.to)}</Txt>
        </Txt>
      ))}
      {result.skipped.map((skip, index) => (
        <Txt key={index} variant="faint" style={{ color: colors.warning }}>
          Skipped {skip.label} ({show(skip.value)}): {skip.reason}
        </Txt>
      ))}
      <View style={styles.actions}>
        <Button title={nothing ? "Close" : "Discard"} variant="secondary" small onPress={onDiscard} />
        {!nothing ? (
          <Button
            title={`Apply ${result.changes.length === 1 ? "change" : `${result.changes.length} changes`}`}
            small
            onPress={onApply}
          />
        ) : null}
      </View>
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
  },
  from: { textDecorationLine: "line-through" },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: spacing.sm, marginTop: spacing.xs },
});
