import React, { useCallback, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useBackgroundPowerSetup } from "../../background/BackgroundPowerSetup";
import { NativeIcon } from "../NativeIcon";
import { Button, IconButton, Txt } from "../ui";
import { colors, font, radii, spacing } from "../../theme/theme";

type BannerCopy = {
  title: string;
  description: string;
  action: string;
};

function copyForState(state: ReturnType<typeof useBackgroundPowerSetup>["state"]): BannerCopy {
  switch (state) {
    case "needs-standard-exemption":
      return {
        title: "Keep this script running",
        description: "Allow background activity so Android is less likely to pause JNbot when you minimize the app or lock your phone.",
        action: "Allow background",
      };
    case "needs-oem-setup":
      return {
        title: "Finish Vivo / iQOO background setup",
        description: "In Background power control, choose “Don’t restrict background power usage” for JNbot.",
        action: "Open power settings",
      };
    case "awaiting-oem-confirmation":
      return {
        title: "Finish Vivo / iQOO background setup",
        description: "After choosing “Don’t restrict background power usage” for JNbot, confirm it here.",
        action: "I selected Don’t restrict",
      };
    case "error":
      return {
        title: "Background setup needs attention",
        description: "JNbot could not open the device power settings. Try again to keep this script running in the background.",
        action: "Try again",
      };
    case "complete":
      return {
        title: "",
        description: "",
        action: "",
      };
  }
}

export function BackgroundPowerBanner() {
  const {
    state,
    visible,
    requestBackgroundAccess,
    confirmManufacturerSetup,
    dismissForCurrentRun,
  } = useBackgroundPowerSetup();
  const [expanded, setExpanded] = useState(false);

  const handlePrimaryAction = useCallback(() => {
    if (state === "awaiting-oem-confirmation") {
      void confirmManufacturerSetup();
      return;
    }
    void requestBackgroundAccess();
  }, [confirmManufacturerSetup, requestBackgroundAccess, state]);

  if (!visible) return null;
  const copy = copyForState(state);

  return (
    <View style={[styles.banner, expanded && styles.bannerExpanded]}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          accessibilityLabel={`${expanded ? "Hide" : "Show"} background setup details`}
          onPress={() => setExpanded((value) => !value)}
          style={({ pressed }) => [styles.summary, pressed && styles.summaryPressed]}
        >
          <Txt variant="body" style={styles.title} maxFontSizeMultiplier={1.35}>
            {copy.title}
          </Txt>
          <Txt variant="label" style={styles.expandLabel}>
            {expanded ? "Hide" : "Show"}
          </Txt>
        </Pressable>
        <IconButton
          bg="transparent"
          size={48}
          accessibilityLabel="Hide background setup reminder for this run"
          onPress={() => void dismissForCurrentRun()}
          style={styles.dismiss}
        >
          <NativeIcon sf="xmark" material="close" size={20} color={colors.textMuted} />
        </IconButton>
      </View>
      {expanded ? (
        <View style={styles.details}>
          <Txt variant="muted" style={styles.description} maxFontSizeMultiplier={1.35}>
            {copy.description}
          </Txt>
          <View style={styles.actions}>
            <Button
              title={copy.action}
              small
              variant="secondary"
              onPress={handlePrimaryAction}
            />
            {state === "awaiting-oem-confirmation" ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open Vivo or iQOO power settings again"
                onPress={() => void requestBackgroundAccess()}
                style={({ pressed }) => [styles.secondaryAction, pressed && styles.secondaryActionPressed]}
              >
                <Txt variant="label" style={styles.secondaryActionText}>Open settings again</Txt>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginBottom: spacing.md,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    paddingVertical: spacing.xs,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceAlt,
    borderCurve: "continuous",
  },
  bannerExpanded: { paddingBottom: spacing.sm },
  header: { flexDirection: "row", alignItems: "center" },
  summary: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  summaryPressed: { opacity: 0.72 },
  title: { fontSize: font.size.sm, lineHeight: 20, fontWeight: "600", color: colors.textMuted },
  expandLabel: { color: colors.textFaint },
  details: { gap: spacing.sm, paddingRight: spacing.sm, paddingBottom: spacing.xs },
  description: { lineHeight: 19 },
  dismiss: { marginRight: -4 },
  actions: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  secondaryAction: { minHeight: 48, justifyContent: "center", paddingHorizontal: spacing.xs },
  secondaryActionPressed: { opacity: 0.7 },
  secondaryActionText: { color: colors.textMuted, textDecorationLine: "underline" },
});
