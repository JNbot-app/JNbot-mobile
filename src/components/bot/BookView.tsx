import React, { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Txt } from "../ui";
import { spacing } from "../../theme/theme";
import type { ChatClick, ChatPart } from "../../features/chat";
import { ChatMessage } from "./ChatMessage";
import { McButton } from "./McButton";
import type { ScreenPrompt } from "../../features/inventory";

type Props = {
  book: Extract<ScreenPrompt, { kind: "book" }>;
  onClick: (click: ChatClick) => void;
  onClose: () => void;
};

/** Written book the server opened (vanilla book screen). */
export function BookView({ book, onClick, onClose }: Props) {
  const [page, setPage] = useState(0);
  const last = book.pages.length - 1;
  const onPress = ({ click }: ChatPart) => {
    if (click?.action === "change_page") setPage(Math.min(last, Math.max(0, Number(click.value) - 1)));
    else if (click) onClick(click);
  };

  return (
    <View style={styles.root}>
      <View style={styles.book}>
        <Txt style={styles.number}>Page {page + 1} of {last + 1}</Txt>
        <View style={{ flex: 1 }}>
          <ChatMessage line={book.pages[page]} style={styles.text} onPress={onPress} />
        </View>
        <View style={styles.arrows}>
          <Arrow icon="arrow-back" label="Previous page" hidden={page === 0} onPress={() => setPage(page - 1)} />
          <Arrow icon="arrow-forward" label="Next page" hidden={page === last} onPress={() => setPage(page + 1)} />
        </View>
      </View>
      <McButton label="Done" onPress={onClose} />
    </View>
  );
}

function Arrow({ icon, label, hidden, onPress }: { icon: "arrow-back" | "arrow-forward"; label: string; hidden: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityLabel={label} disabled={hidden} hitSlop={12} onPress={onPress} style={{ opacity: hidden ? 0 : 1 }}>
      {({ pressed }) => <Ionicons name={icon} size={26} color={pressed ? "#c9952d" : "#7a5a2b"} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: "center", gap: spacing.md, paddingVertical: spacing.md },
  book: { width: "100%", maxWidth: 320, minHeight: 400, padding: spacing.lg, paddingBottom: spacing.sm, backgroundColor: "#fdf8e8", borderWidth: 4, borderLeftWidth: 10, borderColor: "#c9b48a", gap: spacing.sm },
  number: { alignSelf: "flex-end", color: "#3f3f3f", fontSize: 12 },
  text: { color: "#000", fontSize: 15, lineHeight: 23 },
  arrows: { flexDirection: "row", justifyContent: "space-between" },
});
