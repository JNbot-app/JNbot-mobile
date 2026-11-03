import React from "react";
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { RichText } from "../RichText";

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

/** Gray vanilla-style GUI button; the label may contain § / ANSI formatting. */
export function McButton({ label, onPress, disabled, style, accessibilityLabel }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed, disabled && styles.disabled, style]}
    >
      <RichText style={styles.text} numberOfLines={1}>{label}</RichText>
    </Pressable>
  );
}

export const mcStyles = StyleSheet.create({
  field: { minHeight: 44, paddingHorizontal: 8, color: "#fff", backgroundColor: "#000", borderWidth: 2, borderColor: "#a0a0a0", fontSize: 15 },
  fieldFocused: { borderColor: "#fff" },
});

const styles = StyleSheet.create({
  button: { width: "100%", maxWidth: 320, minHeight: 44, paddingHorizontal: 8, alignItems: "center", justifyContent: "center", backgroundColor: "#6f6f6f", borderWidth: 2, borderColor: "#000" },
  pressed: { borderColor: "#fff" },
  disabled: { opacity: 0.5 },
  text: { color: "#fff", fontSize: 16, fontWeight: "700", textShadowColor: "#3f3f3f", textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 0 },
});
