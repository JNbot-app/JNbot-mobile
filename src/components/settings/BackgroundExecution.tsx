import React, { useEffect, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Button, Txt } from "../ui";
import { SettingsToggle } from "./SettingsFields";
import { SettingsGroup } from "./SettingsGroup";
import { colors, spacing } from "../../theme/theme";
import {
  loadBackgroundKeepAlivePreference,
  saveBackgroundKeepAlivePreference,
  useBackgroundPowerSetup,
} from "../../background";

/** Android-only: keep-alive foreground service and battery-optimization exemptions. */
export function BackgroundExecution() {
  const { powerStatus, state, requestBackgroundAccess, confirmManufacturerSetup } = useBackgroundPowerSetup();
  const [keepAlive, setKeepAlive] = useState(true);

  useEffect(() => {
    void loadBackgroundKeepAlivePreference().then(setKeepAlive);
  }, []);

  if (Platform.OS !== "android") return null;
  const exempt = powerStatus?.isBatteryOptimizationIgnored;
  return (
    <SettingsGroup
      title="Background"
      footer="Keeps an ongoing notification with CPU and network locks so bots stay connected when JNbot is minimized or the screen is locked."
    >
      <SettingsToggle
        label="Keep bots active in background"
        value={keepAlive}
        onChange={(value) => {
          setKeepAlive(value);
          void saveBackgroundKeepAlivePreference(value);
        }}
      />
      <View style={styles.row}>
        <View style={styles.grow}>
          <Txt variant="body">Battery optimization</Txt>
          <Txt variant="faint">
            {!powerStatus
              ? "Checking Android background settings…"
              : exempt
                ? "JNbot is exempt"
                : "Android may pause JNbot in the background"}
          </Txt>
        </View>
        {powerStatus && !exempt ? (
          <Button title="Exempt" variant="secondary" onPress={() => void requestBackgroundAccess()} />
        ) : exempt ? (
          <Ionicons name="checkmark-circle" size={22} color={colors.online} />
        ) : null}
      </View>
      {powerStatus?.requiresManufacturerSetup ? (
        <View style={styles.row}>
          <View style={styles.grow}>
            <Txt variant="body">Vivo / iQOO background power</Txt>
            <Txt variant="faint">
              {!exempt
                ? "First exempt JNbot from battery optimization"
                : state === "awaiting-oem-confirmation"
                  ? "Choose “Don’t restrict background power usage”, then confirm"
                  : state === "complete"
                    ? "You confirmed “Don’t restrict background power usage”"
                    : "Choose “Don’t restrict background power usage” for JNbot"}
            </Txt>
          </View>
          {state === "awaiting-oem-confirmation" ? (
            <Button title="Confirm" variant="secondary" onPress={() => void confirmManufacturerSetup()} />
          ) : (
            <Button
              title={state === "complete" ? "Review" : "Open"}
              variant="secondary"
              disabled={!exempt}
              onPress={() => void requestBackgroundAccess()}
            />
          )}
        </View>
      ) : null}
    </SettingsGroup>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  grow: { flex: 1 },
});
