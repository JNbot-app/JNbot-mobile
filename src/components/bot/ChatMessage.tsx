import React from "react";
import { Alert, Linking, StyleSheet, Text, View, type TextStyle } from "react-native";
import * as Clipboard from "expo-clipboard";
import { BottomSheet } from "../BottomSheet";
import { RichText } from "../RichText";
import { Button, Txt } from "../ui";
import { actions } from "../../store/store";
import { colors, font, spacing } from "../../theme/theme";
import type { ChatClick, ChatLine, ChatPart } from "../../features/chat";

const ACTION_LABELS: Record<ChatClick["action"], string> = {
  run_command: "Run command",
  suggest_command: "Suggest command",
  open_url: "Open link",
  copy_to_clipboard: "Copy",
  change_page: "Go to page",
};

const toast = (title: string, type: "success" | "error") =>
  actions.enqueueToast({ id: `chat-${Date.now()}`, title, type });

/** Performs a Minecraft chat click event, mirroring the desktop app. */
export function useChatClickHandler(
  runCommand: (command: string) => void,
  suggest: (text: string) => void,
) {
  return ({ action, value }: ChatClick) => {
    switch (action) {
      case "run_command":
        runCommand(value);
        break;
      case "suggest_command":
        suggest(value);
        break;
      case "copy_to_clipboard":
        Clipboard.setStringAsync(value).then(
          () => toast("Copied to clipboard", "success"),
          () => toast("Could not copy", "error"),
        );
        break;
      case "open_url":
        if (!/^https?:\/\//i.test(value)) return;
        Alert.alert("Open link?", value, [
          { text: "Cancel", style: "cancel" },
          { text: "Open", onPress: () => void Linking.openURL(value).catch(() => toast("Could not open link", "error")) },
        ]);
        break;
    }
  };
}

export function ChatMessage({
  line,
  style,
  onPress,
}: {
  line: ChatLine;
  style?: TextStyle;
  onPress: (part: ChatPart) => void;
}) {
  if (typeof line === "string") return <RichText style={style}>{line}</RichText>;
  return (
    <Text style={style}>
      {line.parts.map((part, index) => (
        <RichText
          key={index}
          onPress={part.click || part.hover ? () => onPress(part) : undefined}
        >
          {part.text}
        </RichText>
      ))}
    </Text>
  );
}

/** Mobile stand-in for hovering: shows the hover text and the click action of a tapped part. */
export function ChatPartSheet({
  part,
  onClose,
  onClick,
}: {
  part: ChatPart | null;
  onClose: () => void;
  onClick: (click: ChatClick) => void;
}) {
  const click = part?.click;
  return (
    <BottomSheet visible={!!part} onClose={onClose} accessibilityLabel="Chat message details">
      <View style={styles.body}>
        {part?.hover ? <RichText style={styles.hover}>{part.hover}</RichText> : null}
        {click ? (
          <>
            <Txt variant="faint" numberOfLines={2}>{click.value}</Txt>
            <Button
              full
              title={ACTION_LABELS[click.action]}
              onPress={() => {
                onClose();
                onClick(click);
              }}
            />
          </>
        ) : null}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.md, padding: spacing.lg },
  hover: { color: colors.text, fontSize: font.size.sm, lineHeight: 21 },
});
