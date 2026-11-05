import React, { useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { NativeIcon } from "../NativeIcon";
import { PressableCard, Txt } from "../ui";
import { useShareUpdateAction } from "../../features/shares";
import type { ShareKind } from "../../generated/client-contract/share";
import { colors, spacing } from "../../theme/theme";

/** Source line for an item installed from a share; tapping checks for (or opens) an update. */
export function ShareUpdateRow({ kind, localRef }: { kind: ShareKind; localRef: string }) {
  const update = useShareUpdateAction(kind, localRef);
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState<string>();
  if (!update) return null;

  const tint = update.available ? colors.primary : colors.textMuted;
  const press = async () => {
    setChecking(true);
    try { setStatus(await update.run({ silent: true })); } finally { setChecking(false); }
  };
  return <PressableCard accessibilityRole="button" accessibilityLabel={update.label} disabled={checking} onPress={() => void press()} style={[styles.row, update.available && styles.available]}>
    <NativeIcon sf="arrow.triangle.2.circlepath" material="sync" size={20} color={tint} />
    <View style={styles.copy}>
      <Txt variant="heading" numberOfLines={1}>{update.available ? "Update available" : `Shared by ${update.ownerName}`}</Txt>
      <Txt variant="faint" numberOfLines={1}>{update.available ? `From ${update.ownerName}` : status ?? "Check if the author published a newer version"}</Txt>
    </View>
    {checking ? <ActivityIndicator size="small" color={colors.textMuted} /> : <Txt variant="muted" style={{ color: tint, fontWeight: "600" }}>{update.available ? "Review" : "Check"}</Txt>}
  </PressableCard>;
}

const styles = StyleSheet.create({
  row: { minHeight: 56, padding: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.md },
  available: { borderColor: colors.primary },
  copy: { flex: 1, minWidth: 0, gap: 1 },
});
