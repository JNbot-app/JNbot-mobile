import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ScreenSafeArea } from './ScreenSafeArea';
import { useConnection } from "../net/ConnectionProvider";
import { colors, radii, spacing } from "../theme/theme";
import { Button, Txt } from "./ui";

export function RemoteReconnectScreen() {
  const { reconnect, useLocal } = useConnection();
  const [switchingToLocal, setSwitchingToLocal] = useState(false);

  const switchToLocal = async () => {
    setSwitchingToLocal(true);
    try {
      await useLocal();
    } finally {
      setSwitchingToLocal(false);
    }
  };

  return (
    <ScreenSafeArea
      accessibilityRole="alert"
      style={styles.safe}
      edges={["top", "bottom", "left", "right"]}
    >
      <View style={styles.content}>
        <View style={styles.icon}>
          <Ionicons name="cloud-offline-outline" size={31} color={colors.warning} />
        </View>
        <Txt variant="title" style={styles.title}>Connection lost</Txt>
        <Txt variant="muted" style={styles.description}>
          Trying to reconnect to your desktop.
        </Txt>
      </View>

      <View style={styles.actions}>
        <Button
          title="Reconnect now"
          full
          icon={<Ionicons name="refresh" size={19} color={colors.primaryOn} />}
          onPress={reconnect}
        />
        <Button
          title="Use this phone"
          variant="secondary"
          full
          loading={switchingToLocal}
          disabled={switchingToLocal}
          icon={<Ionicons name="phone-portrait-outline" size={19} color={colors.text} />}
          onPress={() => void switchToLocal()}
        />
      </View>
    </ScreenSafeArea>
  );
}

const styles = StyleSheet.create({
  safe: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    justifyContent: "space-between",
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    width: 68,
    height: 68,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.xl,
    borderCurve: "continuous",
    backgroundColor: colors.warningSoft,
  },
  title: {
    marginTop: spacing.xl,
    textAlign: "center",
  },
  description: {
    marginTop: spacing.sm,
    textAlign: "center",
  },
  actions: {
    width: "100%",
    maxWidth: 440,
    alignSelf: "center",
    gap: spacing.md,
  },
});
