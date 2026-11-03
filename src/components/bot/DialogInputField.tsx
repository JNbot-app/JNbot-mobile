import React, { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { RichText } from "../RichText";
import { Txt } from "../ui";
import { McButton, mcStyles } from "./McButton";
import type { DialogInput, DialogValue } from "../../features/inventory";

type Props = {
  input: DialogInput;
  value: DialogValue;
  onChange: (value: DialogValue) => void;
};

const round = (value: number) => Math.round(value * 100) / 100;

/** One dialog input, drawn like its vanilla widget (number ranges use a stepper). */
export function DialogInputField({ input, value, onChange }: Props) {
  const [focused, setFocused] = useState(false);
  const label = input.showLabel ? input.label : "";

  switch (input.type) {
    case "text":
      return (
        <View style={styles.field}>
          {label ? <RichText style={styles.label}>{label}</RichText> : null}
          <TextInput
            value={String(value)}
            maxLength={input.maxLength}
            multiline={input.multiline}
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel={input.label}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onChangeText={onChange}
            style={[mcStyles.field, input.multiline && styles.multiline, focused && mcStyles.fieldFocused]}
          />
        </View>
      );
    case "boolean":
      return (
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: Boolean(value) }}
          onPress={() => onChange(!value)}
          style={styles.checkbox}
        >
          <View style={styles.box}>{value ? <Txt style={styles.check}>✔</Txt> : null}</View>
          <RichText style={styles.label}>{input.label}</RichText>
        </Pressable>
      );
    case "single_option": {
      const index = input.options.findIndex((o) => o.id === value);
      const display = input.options[index]?.display ?? "";
      return (
        <McButton
          label={label ? `${label}: ${display}` : display}
          onPress={() => onChange(input.options[(index + 1) % input.options.length].id)}
        />
      );
    }
    case "number_range": {
      const step = input.step ?? (input.end - input.start) / 20;
      const set = (next: number) => onChange(round(Math.min(input.end, Math.max(input.start, next))));
      const current = Number(value);
      return (
        <View style={styles.stepper}>
          <McButton label="-" accessibilityLabel={`Decrease ${input.label}`} disabled={current <= input.start} onPress={() => set(current - step)} style={styles.stepButton} />
          <RichText style={[styles.label, styles.stepValue]} numberOfLines={1}>
            {`${label ? `${label}: ` : ""}${round(current)}`}
          </RichText>
          <McButton label="+" accessibilityLabel={`Increase ${input.label}`} disabled={current >= input.end} onPress={() => set(current + step)} style={styles.stepButton} />
        </View>
      );
    }
  }
}

const styles = StyleSheet.create({
  field: { gap: 4 },
  label: { color: "#fff", fontSize: 14 },
  multiline: { minHeight: 96, paddingTop: 8, textAlignVertical: "top" },
  checkbox: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 44 },
  box: { width: 24, height: 24, alignItems: "center", justifyContent: "center", backgroundColor: "#000", borderWidth: 2, borderColor: "#a0a0a0" },
  check: { color: "#fff", fontSize: 14 },
  stepper: { flexDirection: "row", alignItems: "center", gap: 8 },
  stepButton: { width: 44 },
  stepValue: { flex: 1, textAlign: "center" },
});
