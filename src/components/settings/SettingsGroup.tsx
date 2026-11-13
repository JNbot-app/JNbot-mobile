import React from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Txt } from "../ui";
import { colors, radii, spacing } from "../../theme/theme";

/** Inset-grouped list section: small caption above, rounded card, hairline-divided cells, optional footnote below. */
export function SettingsGroup({
  title,
  footer,
  children,
}: {
  title?: string;
  footer?: string;
  children: React.ReactNode;
}) {
  const cells = React.Children.toArray(children).filter(Boolean);
  if (!cells.length) return null;
  return (
    <View style={styles.group}>
      {title ? <Txt variant="label" style={styles.caption}>{title.toUpperCase()}</Txt> : null}
      <View style={styles.card}>
        {cells.map((cell, index) => (
          <View key={index} style={[styles.cell, index > 0 && styles.divider]}>{cell}</View>
        ))}
      </View>
      {footer ? <Txt variant="faint" style={styles.footer}>{footer}</Txt> : null}
    </View>
  );
}

/** Tappable row that opens a settings page. */
export function NavRow({
  icon,
  title,
  summary,
  dirty,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  summary?: string;
  dirty?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        if (Platform.OS === "ios") void Haptics.selectionAsync().catch(() => undefined);
        onPress();
      }}
      style={({ pressed }) => [styles.navRow, pressed && { backgroundColor: colors.surfaceHover }]}
    >
      <View style={styles.navIcon}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View style={styles.navText}>
        <Txt variant="body" numberOfLines={1}>{title}</Txt>
        {summary ? <Txt variant="faint" numberOfLines={1}>{summary}</Txt> : null}
      </View>
      {dirty ? <View style={styles.dirtyDot} /> : null}
      <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.xs },
  caption: { paddingHorizontal: spacing.lg, color: colors.textFaint, fontSize: 12, letterSpacing: 0.5 },
  card: {
    borderRadius: radii.lg,
    borderCurve: "continuous",
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
    overflow: "hidden",
  },
  cell: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderSubtle },
  footer: { paddingHorizontal: spacing.lg, lineHeight: 18 },
  navRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: 56, marginHorizontal: -spacing.lg, marginVertical: -spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  navIcon: { width: 32, height: 32, alignItems: "center", justifyContent: "center", borderRadius: radii.sm, backgroundColor: colors.primarySoft },
  navText: { flex: 1, minWidth: 0 },
  dirtyDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.warning },
});
