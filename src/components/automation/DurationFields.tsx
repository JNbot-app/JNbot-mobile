import React, { useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { Txt } from "../ui";
import { DAY, HOUR, MINUTE } from "../../generated/client-contract/cooldowns";
import { colors, radii, spacing } from "../../theme/theme";

const UNITS = [
  { label: "days", ms: DAY },
  { label: "hours", ms: HOUR },
  { label: "minutes", ms: MINUTE },
];

/** Days/hours/minutes inputs. Text stays as typed; `onChange` gets the total in ms. */
export function DurationFields({ initialValue, onChange }: { initialValue: number; onChange: (ms: number) => void }) {
  const [parts, setParts] = useState(() => [
    Math.floor(initialValue / DAY),
    Math.floor((initialValue % DAY) / HOUR),
    Math.round((initialValue % HOUR) / MINUTE),
  ].map(String));

  const update = (index: number, text: string) => {
    const next = parts.map((part, i) => i === index ? text.replace(/[^0-9]/g, "") : part);
    setParts(next);
    onChange(next.reduce((total, part, i) => total + Number(part) * UNITS[i].ms, 0));
  };

  return <View style={styles.row}>
    {UNITS.map(({ label }, index) => <View key={label} style={styles.field}>
      <TextInput accessibilityLabel={label} value={parts[index]} onChangeText={(text) => update(index, text)} keyboardType="number-pad" selectTextOnFocus maxLength={4} style={styles.input} />
      <Txt variant="faint">{label}</Txt>
    </View>)}
  </View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: spacing.sm },
  field: { flex: 1, minWidth: 0, alignItems: "center", gap: 5, padding: spacing.sm, backgroundColor: colors.surface, borderRadius: radii.md, borderCurve: "continuous" },
  input: { alignSelf: "stretch", minHeight: 38, textAlign: "center", color: colors.text, fontSize: 20, fontWeight: "600" },
});
