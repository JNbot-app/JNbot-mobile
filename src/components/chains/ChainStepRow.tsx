import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { NativeIcon } from "../NativeIcon";
import { IconButton, Txt } from "../ui";
import type { ChainStep, ScriptActionInfo } from "../../store/types";
import { chainNextLabel } from "../../generated/client-contract/chains";
import { colors, radii, spacing } from "../../theme/theme";

export function ChainStepRow({
  step,
  steps,
  index,
  action,
  unavailable,
  editable,
  onSelectAction,
  onEdit,
  onMove,
  onRemove,
}: {
  step: ChainStep;
  steps: ChainStep[];
  index: number;
  action?: ScriptActionInfo;
  unavailable: boolean;
  editable: boolean;
  onSelectAction: () => void;
  onEdit: () => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}) {
  const actionName = action?.name ?? (step.scriptId ? step.name || step.scriptId : "Choose an action");
  const total = steps.length;
  const changed = Object.keys(step.options ?? {}).length;
  const summary = [
    changed > 0 && `${changed} option${changed === 1 ? "" : "s"} changed`,
    step.onSuccess && `If it works: ${chainNextLabel(step.onSuccess, steps).toLowerCase()}`,
    step.onFail && `If it fails: ${chainNextLabel(step.onFail, steps).toLowerCase()}`,
  ].filter(Boolean).join(" · ");
  return <View style={[styles.card, unavailable && styles.unavailable]}>
    <View style={styles.row}>
      <View style={styles.index}><Txt variant="faint" style={styles.indexText}>{index + 1}</Txt></View>
      <Pressable accessibilityRole="button" disabled={!editable} onPress={onSelectAction} style={({ pressed }) => [styles.action, !editable && styles.disabled, pressed && styles.pressed]}>
        <View style={styles.actionIcon}><NativeIcon sf={step.scriptId ? "bolt.fill" : "bolt"} material="bolt" size={18} color={step.scriptId ? colors.primary : colors.textFaint} /></View>
        <View style={styles.actionCopy}>
          <Txt variant="heading" numberOfLines={1}>{actionName}</Txt>
          <Txt variant="faint" numberOfLines={1} style={unavailable ? { color: colors.warning } : undefined}>{unavailable ? "Unavailable — choose a replacement" : action?.description || "Select an action to run"}</Txt>
        </View>
        <NativeIcon sf="chevron.right" material="chevron-right" size={17} color={colors.textFaint} />
      </Pressable>
      <View style={styles.controls}>
        <IconButton bg="transparent" disabled={!editable} accessibilityLabel={`Edit step ${index + 1}`} onPress={onEdit}><NativeIcon sf="slider.horizontal.3" material="tune" size={18} color={colors.textMuted} /></IconButton>
        <IconButton bg="transparent" disabled={!editable || index === 0} accessibilityLabel={`Move step ${index + 1} up`} onPress={() => onMove(-1)}><NativeIcon sf="arrow.up" material="arrow-upward" size={17} color={colors.textMuted} /></IconButton>
        <IconButton bg="transparent" disabled={!editable || index === total - 1} accessibilityLabel={`Move step ${index + 1} down`} onPress={() => onMove(1)}><NativeIcon sf="arrow.down" material="arrow-downward" size={17} color={colors.textMuted} /></IconButton>
        <IconButton bg="transparent" disabled={!editable} accessibilityLabel={`Remove step ${index + 1}`} onPress={onRemove}><NativeIcon sf="trash" material="delete-outline" size={19} color={colors.danger} /></IconButton>
      </View>
    </View>
    {summary ? <Txt variant="faint" numberOfLines={2} style={styles.summary}>{summary}</Txt> : null}
  </View>;
}

const styles = StyleSheet.create({
  card: { minHeight: 68, padding: spacing.sm, borderRadius: radii.lg, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderSubtle },
  unavailable: { borderColor: colors.warning },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  index: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceAlt },
  indexText: { fontWeight: "800", color: colors.textMuted },
  action: { flex: 1, minWidth: 0, minHeight: process.env.EXPO_OS === "android" ? 48 : 44, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  actionIcon: { width: 32, height: 32, borderRadius: radii.sm, alignItems: "center", justifyContent: "center", backgroundColor: colors.primarySoft },
  actionCopy: { flex: 1, minWidth: 0, gap: 1 },
  controls: { flexDirection: "row", alignItems: "center" },
  summary: { paddingLeft: 24 + spacing.xs, paddingTop: spacing.xs },
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.5 },
});
