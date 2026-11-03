import React from "react";
import { StyleSheet, View } from "react-native";
import { BottomSheet } from "../BottomSheet";
import { Txt } from "../ui";
import { DetailRow } from "../automation/PluginDetailsView";
import { StepIconTile } from "./RecordingStepRow";
import { actionLabel, stepDetails, type RecordingStep } from "../../features/plugins/recording";
import { colors, font, radii, spacing } from "../../theme/theme";

export function RecordingStepSheet({ step, index, onClose }: { step: RecordingStep | null; index: number; onClose: () => void }) {
  return (
    <BottomSheet visible={step !== null} onClose={onClose} accessibilityLabel="Step details">
      {step ? <StepDetails step={step} index={index} /> : null}
    </BottomSheet>
  );
}

function StepDetails({ step, index }: { step: RecordingStep; index: number }) {
  const rows = stepDetails(step);
  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <StepIconTile kind={step.kind} size={44} />
        <View style={styles.heading}>
          <Txt variant="heading" numberOfLines={2}>{step.label ?? actionLabel(step.kind)}</Txt>
          <Txt variant="muted" style={styles.meta}>
            Step {index + 1} · {(step.atMs / 1000).toFixed(2)} s{step.enabled ? "" : " · Skipped"}
          </Txt>
        </View>
      </View>
      {rows.length ? (
        <View style={styles.card}>
          {rows.map(([label, value], i) => <DetailRow key={label} label={label} value={value} isFirst={i === 0} />)}
        </View>
      ) : null}
      {step.enabled ? null : <Txt variant="faint" style={styles.note}>Replays skip this step.</Txt>}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { width: "100%", gap: spacing.lg, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  heading: { flex: 1, minWidth: 0 },
  meta: { fontVariant: ["tabular-nums"], fontSize: font.size.caption },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderCurve: "continuous",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
    overflow: "hidden",
  },
  note: { textAlign: "center" },
});
