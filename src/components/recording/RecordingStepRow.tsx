import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { NativeIcon } from "../NativeIcon";
import { Txt } from "../ui";
import { actionLabel, clock, describeStep, stepIcon, toneColors, type RecordingKind, type RecordingStep } from "../../features/plugins/recording";
import { colors, font, radii, spacing } from "../../theme/theme";

export function StepIconTile({ kind, size = 32 }: { kind: RecordingKind; size?: number }) {
  const icon = stepIcon(kind);
  const tone = toneColors(icon.tone);
  return (
    <View style={[styles.tile, { width: size, height: size, borderRadius: size * 0.28, backgroundColor: tone.bg }]}>
      <NativeIcon sf={icon.sf} material={icon.material} size={size * 0.53} color={tone.fg} />
    </View>
  );
}

export const RecordingStepRow = React.memo(function RecordingStepRow({
  step,
  first,
  last,
  onPress,
}: {
  step: RecordingStep;
  first: boolean;
  last: boolean;
  onPress: (step: RecordingStep) => void;
}) {
  const title = actionLabel(step.kind);
  const detail = step.enabled ? describeStep(step) : "Skipped";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}${detail ? `, ${detail}` : ""}, at ${clock(step.atMs)}`}
      onPress={() => onPress(step)}
      style={({ pressed }) => [styles.row, first && styles.first, last && styles.last, pressed && styles.pressed]}
    >
      <View style={[styles.content, !step.enabled && styles.disabled]}>
        <StepIconTile kind={step.kind} />
        <View style={styles.text}>
          <Txt style={styles.title} numberOfLines={1}>{title}</Txt>
          {detail ? <Txt variant="muted" style={styles.detail} numberOfLines={1}>{detail}</Txt> : null}
        </View>
        <Txt style={styles.time}>{clock(step.atMs)}</Txt>
      </View>
      {last ? null : <View style={styles.separator} />}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: { backgroundColor: colors.surface, borderCurve: "continuous" },
  first: { borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg },
  last: { borderBottomLeftRadius: radii.lg, borderBottomRightRadius: radii.lg },
  pressed: { backgroundColor: colors.surfaceHover },
  content: { minHeight: 60, flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  disabled: { opacity: 0.45 },
  tile: { alignItems: "center", justifyContent: "center", borderCurve: "continuous" },
  text: { flex: 1, minWidth: 0 },
  title: { fontSize: font.size.base, fontWeight: font.weight.semibold, color: colors.text },
  detail: { fontSize: font.size.caption, lineHeight: 18 },
  time: { fontSize: font.size.caption, color: colors.textFaint, fontVariant: ["tabular-nums"] },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: spacing.md + 32 + spacing.md, backgroundColor: colors.borderSubtle },
});
