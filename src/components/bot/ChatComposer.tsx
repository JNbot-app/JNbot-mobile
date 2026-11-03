import React, { useEffect, useRef, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { IconButton, Txt } from "../ui";
import { colors, font, radii, spacing } from "../../theme/theme";
import { applyCompletion, rememberChatMessage, useChatHistory } from "../../features/chat";

const COMPLETE_DELAY = 350;

/**
 * Chat input with one suggestion row: server tab-completions while typing a
 * command, or recently sent messages while the field is empty.
 */
export function ChatComposer({
  value,
  onChange,
  onSend,
  complete,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  complete: (text: string) => Promise<string[]>;
  disabled: boolean;
}) {
  const history = useChatHistory();
  const [focused, setFocused] = useState(false);
  const [completion, setCompletion] = useState<{ query: string; matches: string[] } | null>(null);
  const completeRef = useRef(complete);
  completeRef.current = complete;

  useEffect(() => {
    setCompletion(null);
    if (disabled || !value.startsWith("/")) return;
    let active = true;
    const timer = setTimeout(() => {
      void completeRef.current(value)
        .then((matches) => {
          const useful = matches.filter((match) => applyCompletion(value, match) !== value);
          if (active && useful.length) setCompletion({ query: value, matches: useful });
        })
        .catch(() => undefined);
    }, COMPLETE_DELAY);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [value, disabled]);

  const suggestions = completion
    ? completion.matches.map((match) => ({ label: match, value: applyCompletion(completion.query, match) }))
    : focused && !value && !disabled
      ? history.map((message) => ({ label: message, value: message }))
      : [];

  const pick = (next: string) => {
    if (process.env.EXPO_OS === "ios") void Haptics.selectionAsync();
    onChange(next);
  };

  const send = () => {
    const message = value.trim();
    if (!message || disabled) return;
    rememberChatMessage(message);
    onSend();
  };

  return (
    <View style={styles.wrap}>
      {suggestions.length ? (
        <ScrollView
          horizontal
          keyboardShouldPersistTaps="always"
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.suggestions}
        >
          {suggestions.map((item) => (
            <Pressable
              key={item.label}
              accessibilityRole="button"
              accessibilityLabel={`Use ${item.label}`}
              onPress={() => pick(item.value)}
              style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
            >
              <Txt variant="none" style={styles.chipText} numberOfLines={1}>{item.label}</Txt>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
      <View style={styles.composer}>
        <TextInput
          editable={!disabled}
          value={value}
          onChangeText={onChange}
          onSubmitEditing={send}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          submitBehavior="submit"
          returnKeyType="send"
          placeholder="Message or /command"
          placeholderTextColor={colors.textFaint}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
        />
        <IconButton
          bg={colors.primary}
          onPress={send}
          disabled={disabled || !value.trim()}
          accessibilityLabel="Send message"
        >
          <Ionicons name="send" size={18} color={colors.primaryOn} />
        </IconButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  suggestions: { gap: spacing.xs },
  chip: {
    maxWidth: 220,
    minHeight: 32,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  chipPressed: { backgroundColor: colors.surfaceHover },
  chipText: {
    color: colors.text,
    fontSize: font.size.caption,
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace" }),
  },
  composer: { flexDirection: "row", gap: spacing.sm, alignItems: "center", width: "100%" },
  input: {
    flex: 1,
    minHeight: 44,
    color: colors.text,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
});
