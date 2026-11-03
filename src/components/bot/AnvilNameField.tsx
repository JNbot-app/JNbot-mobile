import React, { useState } from "react";
import { StyleSheet, TextInput } from "react-native";
import { mcStyles } from "./McButton";

const ANSI_RE = /\x1b\[[0-9;]*m|§./g;

type Props = {
  name?: string;
  disabled: boolean;
  onRename: (name: string) => void;
};

export const plainItemName = (name?: string) => (name ?? "").replace(ANSI_RE, "");

/** Anvil rename field; vanilla sends the name on every keystroke. */
export function AnvilNameField({ name, disabled, onRename }: Props) {
  const [value, setValue] = useState(plainItemName(name));
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      value={value}
      maxLength={50}
      editable={!disabled}
      autoCapitalize="none"
      autoCorrect={false}
      accessibilityLabel="Item name"
      placeholder="Put an item in the first slot"
      placeholderTextColor="#707070"
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onChangeText={(text) => {
        setValue(text);
        onRename(text);
      }}
      style={[mcStyles.field, styles.field, focused && mcStyles.fieldFocused, disabled && styles.disabled]}
    />
  );
}

const styles = StyleSheet.create({
  field: { alignSelf: "stretch", marginBottom: 8 },
  disabled: { borderColor: "#555" },
});
