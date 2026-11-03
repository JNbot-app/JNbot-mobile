import React from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  defaultKickBehaviorConfig,
  KickBehaviorConfig,
  KickBehaviorOptions,
  KickBehaviorRule,
} from "../../features/appSettings";
import { Button, Txt } from "../ui";
import { colors, font, radii, spacing } from "../../theme/theme";

const ACTION_CHOICES: { label: string; value: KickBehaviorOptions }[] = [
  { label: "Retry", value: KickBehaviorOptions.RETRY },
  { label: "Pause", value: KickBehaviorOptions.PAUSE },
  { label: "Skip", value: KickBehaviorOptions.SKIP },
];

export function KickBehaviorEditor({
  value,
  onChange,
}: {
  value: KickBehaviorConfig;
  onChange: (next: KickBehaviorConfig) => void;
}) {
  const config = value ?? defaultKickBehaviorConfig;

  const updateDefaultAction = (action: KickBehaviorOptions) => {
    onChange({ ...config, defaultAction: action });
  };

  const addRule = () => {
    const newRule: KickBehaviorRule = {
      id: Date.now().toString(),
      kickMessage: "",
      action: KickBehaviorOptions.PAUSE,
    };
    onChange({ ...config, rules: [...config.rules, newRule] });
  };

  const deleteRule = (id: string) => {
    onChange({
      ...config,
      rules: config.rules.filter((rule) => rule.id !== id),
    });
  };

  const updateRule = (
    id: string,
    field: "kickMessage" | "action",
    val: string | KickBehaviorOptions,
  ) => {
    onChange({
      ...config,
      rules: config.rules.map((rule) =>
        rule.id === id ? { ...rule, [field]: val } : rule,
      ),
    });
  };

  const resetDefaults = () => {
    onChange(defaultKickBehaviorConfig);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.grow}>
          <Txt variant="body" style={styles.boldText}>
            Default action
          </Txt>
          <Txt variant="faint">Action when no custom rule matches the kick reason</Txt>
        </View>
      </View>

      <View style={styles.actionSegment}>
        {ACTION_CHOICES.map((choice) => {
          const active = config.defaultAction === choice.value;
          return (
            <Pressable
              key={choice.value}
              accessibilityRole="button"
              accessibilityLabel={`Default action ${choice.label}`}
              onPress={() => updateDefaultAction(choice.value)}
              style={[styles.segmentButton, active && styles.segmentButtonActive]}
            >
              <Txt
                variant="faint"
                style={[styles.segmentText, active && styles.segmentTextActive]}
              >
                {choice.label}
              </Txt>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.rulesSection}>
        <View style={styles.rulesHeader}>
          <Txt variant="body" style={styles.boldText}>
            Kick rules ({config.rules.length})
          </Txt>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Reset kick rules to default"
            hitSlop={8}
            onPress={resetDefaults}
          >
            <Txt variant="faint" style={styles.resetLink}>
              Reset defaults
            </Txt>
          </Pressable>
        </View>

        {config.rules.map((rule, index) => (
          <View key={rule.id || String(index)} style={styles.ruleCard}>
            <View style={styles.ruleTop}>
              <Txt variant="faint" style={styles.ruleIndex}>
                Rule #{index + 1}
              </Txt>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove rule ${index + 1}`}
                hitSlop={8}
                onPress={() => deleteRule(rule.id)}
              >
                <Ionicons name="trash-outline" size={17} color={colors.danger} />
              </Pressable>
            </View>

            <TextInput
              value={rule.kickMessage}
              onChangeText={(text) => updateRule(rule.id, "kickMessage", text)}
              placeholder="Kick message contains (e.g. 'wrong password')"
              placeholderTextColor={colors.textFaint}
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.ruleInput}
            />

            <View style={styles.ruleActionRow}>
              <Txt variant="faint" style={styles.actionLabel}>
                Action:
              </Txt>
              <View style={styles.miniSegments}>
                {ACTION_CHOICES.map((choice) => {
                  const active = rule.action === choice.value;
                  return (
                    <Pressable
                      key={choice.value}
                      accessibilityRole="button"
                      accessibilityLabel={`Rule action ${choice.label}`}
                      onPress={() => updateRule(rule.id, "action", choice.value)}
                      style={[
                        styles.miniSegmentButton,
                        active && styles.miniSegmentButtonActive,
                      ]}
                    >
                      <Txt
                        variant="faint"
                        style={[
                          styles.miniSegmentText,
                          active && styles.miniSegmentTextActive,
                        ]}
                      >
                        {choice.label}
                      </Txt>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
        ))}

        <Button
          title="Add kick rule"
          variant="secondary"
          icon={<Ionicons name="add" size={17} color={colors.primary} />}
          full
          onPress={addRule}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
    paddingTop: spacing.xs,
  },
  grow: {
    flex: 1,
  },
  boldText: {
    fontWeight: "600",
    color: colors.text,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  actionSegment: {
    flexDirection: "row",
    borderRadius: radii.md,
    backgroundColor: colors.bgElevated,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.sm,
  },
  segmentButtonActive: {
    backgroundColor: colors.primarySoft,
  },
  segmentText: {
    fontSize: font.size.caption,
    color: colors.textMuted,
  },
  segmentTextActive: {
    color: colors.primary,
    fontWeight: "600",
  },
  rulesSection: {
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  rulesHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  resetLink: {
    color: colors.primary,
    fontSize: font.size.caption,
  },
  ruleCard: {
    padding: spacing.lg,
    borderRadius: radii.md,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  ruleTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  ruleIndex: {
    fontSize: font.size.xs,
    color: colors.textMuted,
    fontWeight: "600",
  },
  ruleInput: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: font.size.sm,
  },
  ruleActionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 2,
  },
  actionLabel: {
    fontSize: font.size.caption,
    color: colors.textMuted,
  },
  miniSegments: {
    flexDirection: "row",
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 2,
  },
  miniSegmentButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  miniSegmentButtonActive: {
    backgroundColor: colors.primarySoft,
  },
  miniSegmentText: {
    fontSize: font.size.xs,
    color: colors.textMuted,
  },
  miniSegmentTextActive: {
    color: colors.primary,
    fontWeight: "600",
  },
});
