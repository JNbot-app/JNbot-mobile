import { useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { colors, font, radii, spacing } from "../theme/theme";
import { useAsyncAction } from "../hooks/useAsyncAction";
import { useLlm } from "../hooks/useLlm";
import { NativeIcon } from "./NativeIcon";
import { Button } from "./ui";

/** "Describe it" field, like the desktop's. Renders nothing until AI is set up. */
export function LlmPrompt({
  placeholder,
  button = "Generate",
  onSubmit,
}: {
  placeholder: string;
  button?: string;
  /** Runs the AI request; the field clears when it resolves. */
  onSubmit: (text: string) => Promise<void>;
}) {
  const { configured } = useLlm();
  const { busy, run } = useAsyncAction();
  const [text, setText] = useState("");
  if (!configured) return null;

  const submit = () =>
    text.trim() &&
    run(async () => {
      await onSubmit(text.trim());
      setText("");
    });

  return (
    <View style={styles.field}>
      <NativeIcon sf="sparkles" material="auto-awesome" size={18} color={colors.textFaint} />
      <TextInput
        accessibilityLabel={placeholder}
        value={text}
        onChangeText={setText}
        onSubmitEditing={submit}
        placeholder={placeholder}
        placeholderTextColor={colors.textFaint}
        returnKeyType="send"
        editable={!busy}
        style={styles.input}
      />
      <Button title={button} small loading={busy} disabled={!text.trim()} onPress={submit} />
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    minHeight: process.env.EXPO_OS === "android" ? 48 : 44,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderCurve: "continuous",
  },
  input: { flex: 1, alignSelf: "stretch", color: colors.text, fontSize: font.size.md },
});
