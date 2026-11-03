import React, { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { NativeIcon } from "../NativeIcon";
import { Txt } from "../ui";
import { colors, radii, spacing } from "../../theme/theme";

type Props = {
  title: string;
  summary: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
};

/** Collapsible card, the mobile counterpart of a desktop Collapse panel. */
export function TriggerSection({ title, summary, defaultOpen = false, children }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <View style={styles.section}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${title}: ${summary}`}
        onPress={() => setOpen((current) => !current)}
        style={({ pressed }) => [styles.header, pressed && styles.pressed]}
      >
        <Txt variant="label">{title}</Txt>
        <Txt variant="muted" numberOfLines={1} style={styles.summary}>{summary}</Txt>
        <NativeIcon
          sf={open ? "chevron.up" : "chevron.down"}
          material={open ? "expand-less" : "expand-more"}
          size={18}
          color={colors.textFaint}
        />
      </Pressable>
      {open ? <View style={styles.content}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { borderRadius: radii.md, borderWidth: 1, borderColor: colors.borderSubtle, backgroundColor: colors.surface },
  header: { minHeight: 52, flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.md },
  pressed: { opacity: 0.7 },
  summary: { flex: 1, textAlign: "right" },
  content: { gap: spacing.md, paddingHorizontal: spacing.md, paddingBottom: spacing.md },
});
