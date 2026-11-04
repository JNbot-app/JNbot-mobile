import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Txt } from "./ui";
import { colors, radii, spacing } from "../theme/theme";

export type ConflictAction = "replace" | "keep-both" | "skip";

const OPTIONS = [
  { id: "replace", label: "Replace" },
  { id: "keep-both", label: "Keep both" },
  { id: "skip", label: "Skip" },
] as const;

/** Replace / keep both / skip picker for a plugin that is already installed. */
export function ConflictChoices<Action extends ConflictAction = ConflictAction>({
  value,
  onChange,
  title = "A plugin with this ID already exists:",
  options = OPTIONS as unknown as readonly { id: Action; label: string }[],
}: {
  value: Action;
  onChange: (action: Action) => void;
  title?: string;
  options?: readonly { id: Action; label: string }[];
}) {
  return (
    <View style={styles.section}>
      <Txt variant="label" style={{ color: colors.warning }}>
        {title}
      </Txt>
      <View style={styles.row}>
        {options.map((option) => {
          const active = value === option.id;
          return (
            <Pressable
              key={option.id}
              onPress={() => onChange(option.id)}
              style={[styles.button, active && styles.buttonActive]}
            >
              <Txt variant="label" style={[styles.text, active && styles.textActive]}>
                {option.label}
              </Txt>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSubtle,
    gap: 6,
  },
  row: {
    flexDirection: "row",
    gap: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: "transparent",
  },
  buttonActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  text: {
    color: colors.textMuted,
  },
  textActive: {
    color: colors.primary,
    fontWeight: "700",
  },
});
