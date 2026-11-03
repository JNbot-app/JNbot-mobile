import React from "react";
import { Pressable, StyleSheet, Switch, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  describeTrigger,
  TRIGGER_ACTION_TYPES,
  TRIGGER_EVENT_ICONS,
  type Trigger,
} from "../../features/triggers";
import { Txt } from "../ui";
import { colors, radii, spacing } from "../../theme/theme";

type Props = {
  trigger: Trigger;
  /** Secondary line, e.g. the targeted bots or the last run. */
  detail?: string;
  /** Controls rendered before the switch (e.g. a test button). */
  extra?: React.ReactNode;
  disabled?: boolean;
  onPress: (trigger: Trigger) => void;
  onToggle: (trigger: Trigger, enabled: boolean) => void;
};

export function TriggerRow({ trigger, detail, extra, disabled, onPress, onToggle }: Props) {
  const title = describeTrigger(trigger);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Edit ${title}`}
      onPress={() => onPress(trigger)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={[styles.icon, !trigger.enabled && styles.dimmed]}>
        <Ionicons name={TRIGGER_EVENT_ICONS[trigger.event]} size={20} color={colors.primary} />
      </View>
      <View style={[styles.body, !trigger.enabled && styles.dimmed]}>
        <Txt numberOfLines={1}>{title}</Txt>
        <Txt variant="faint" numberOfLines={1}>
          {trigger.actions.map((action) => TRIGGER_ACTION_TYPES[action.type].name).join(" · ")}
        </Txt>
        {detail ? <Txt variant="faint" numberOfLines={1}>{detail}</Txt> : null}
      </View>
      {extra}
      <Switch
        accessibilityLabel={`${trigger.enabled ? "Disable" : "Enable"} ${title}`}
        value={trigger.enabled}
        disabled={disabled}
        onValueChange={(enabled) => onToggle(trigger, enabled)}
        ios_backgroundColor={colors.border}
        trackColor={{ false: colors.border, true: colors.primaryDim }}
        thumbColor={trigger.enabled ? colors.primary : colors.textMuted}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 68, flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md },
  pressed: { backgroundColor: colors.surfaceHover },
  icon: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: radii.md, backgroundColor: colors.primarySoft },
  body: { flex: 1, gap: 2 },
  dimmed: { opacity: 0.55 },
});
