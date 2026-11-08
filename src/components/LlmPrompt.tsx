import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { colors, font, radii, spacing } from "../theme/theme";
import { useLlm } from "../hooks/useLlm";
import { useLlmRun, type LlmRun } from "../hooks/useLlmRun";
import { LlmActivity } from "./LlmActivity";
import { NativeIcon } from "./NativeIcon";
import { Button, Txt } from "./ui";

/** Something to show under the prompt once a request finishes, e.g. changes to review. */
export type LlmResult = (dismiss: () => void) => ReactNode;

export type LlmPromptProps = {
  placeholder: string;
  button?: string;
  /** Example requests, shown as one-tap starters while the field is empty. */
  examples?: string[];
  /** Progress label while the reply writes its result. */
  writingLabel?: string;
  /** Runs the request through `run` (which streams progress). */
  onSubmit: (text: string, run: LlmRun["run"]) => Promise<LlmResult | void>;
};

/** "Describe it" field with live progress, like the desktop's. Renders nothing until AI is set up. */
export function LlmPrompt({ placeholder, button = "Generate", examples = [], writingLabel, onSubmit }: LlmPromptProps) {
  const { configured } = useLlm();
  const ai = useLlmRun();
  const [text, setText] = useState("");
  const [result, setResult] = useState<LlmResult>();
  if (!configured) return null;

  const dismiss = () => {
    setResult(undefined);
    ai.reset();
  };

  const submit = async () => {
    if (!text.trim() || ai.running) return;
    setResult(undefined);
    let succeeded = false;
    const run: LlmRun["run"] = async (request) => {
      const reply = await ai.run<any>(request);
      succeeded = reply !== undefined;
      return reply;
    };
    const shown = await onSubmit(text.trim(), run);
    // A stopped or failed run keeps the text, so it can be tweaked and sent again.
    if (succeeded) setText("");
    if (shown) setResult(() => shown);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.field}>
        <NativeIcon sf="sparkles" material="auto-awesome" size={18} color={colors.textFaint} />
        <TextInput
          accessibilityLabel={placeholder}
          value={text}
          onChangeText={setText}
          placeholder={placeholder}
          placeholderTextColor={colors.textFaint}
          multiline
          editable={!ai.running}
          style={styles.input}
        />
        <Button title={button} small loading={ai.running} disabled={!text.trim()} onPress={submit} />
      </View>
      {!text && !ai.startedAt && examples.length > 0 ? (
        <View style={styles.examples}>
          {examples.map((example) => (
            <Pressable key={example} accessibilityRole="button" onPress={() => setText(example)} style={styles.example}>
              <Txt variant="faint">{example}</Txt>
            </Pressable>
          ))}
        </View>
      ) : null}
      <LlmActivity run={ai} writingLabel={writingLabel} onDismiss={dismiss} />
      {result?.(dismiss)}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  field: {
    minHeight: process.env.EXPO_OS === "android" ? 48 : 44,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderCurve: "continuous",
  },
  input: { flex: 1, alignSelf: "stretch", color: colors.text, fontSize: font.size.md, maxHeight: 120 },
  examples: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  example: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceAlt,
  },
});
