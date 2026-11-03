import React, { useRef, useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { Txt } from "../ui";
import { McButton } from "./McButton";
import { spacing } from "../../theme/theme";

type Props = {
  lines: string[];
  disabled: boolean;
  onSubmit: (lines: string[]) => void;
};

/** Sign text prompt opened by the server (e.g. Hypixel's "enter amount" signs), drawn like the vanilla sign screen. */
export function SignEditor({ lines: initialLines, disabled, onSubmit }: Props) {
  const [lines, setLines] = useState(initialLines);
  const inputs = useRef<Array<TextInput | null>>([]);
  const submit = () => onSubmit(lines);

  return (
    <View style={styles.root}>
      <Txt variant="heading">Edit sign message</Txt>
      <View style={styles.signArea}>
        <View style={styles.board}>
          {[1, 2, 3].map((seam) => (
            <View key={seam} style={[styles.seam, { top: `${seam * 25}%` }]} />
          ))}
          {lines.map((line, i) => (
            <TextInput
              key={i}
              ref={(input) => {
                inputs.current[i] = input;
              }}
              value={line}
              maxLength={45}
              editable={!disabled}
              autoFocus={i === 0}
              returnKeyType={i === lines.length - 1 ? "done" : "next"}
              submitBehavior={i === lines.length - 1 ? "blurAndSubmit" : "submit"}
              onSubmitEditing={() => (i === lines.length - 1 ? submit() : inputs.current[i + 1]?.focus())}
              onChangeText={(value) => setLines((prev) => prev.map((old, j) => (j === i ? value : old)))}
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel={`Sign line ${i + 1}`}
              style={styles.line}
            />
          ))}
        </View>
        <View style={styles.post} />
      </View>
      <McButton label="Done" disabled={disabled} onPress={submit} />
    </View>
  );
}

const wood = "#a0814e";
const woodDark = "#6b5131";

const styles = StyleSheet.create({
  root: { alignItems: "center", gap: spacing.md, paddingVertical: spacing.lg },
  signArea: { width: "100%", maxWidth: 384, alignItems: "center" },
  board: { width: "100%", aspectRatio: 2, paddingHorizontal: spacing.md, backgroundColor: wood, borderWidth: 5, borderColor: woodDark },
  seam: { position: "absolute", left: 0, right: 0, height: 2, backgroundColor: "rgba(0,0,0,0.12)" },
  line: { flex: 1, padding: 0, color: "#000", fontSize: 18, fontWeight: "600", textAlign: "center" },
  post: { width: 22, height: 80, backgroundColor: woodDark },
});
