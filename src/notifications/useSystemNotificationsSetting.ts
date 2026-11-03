import { useCallback, useEffect, useState } from "react";
import { Alert, Linking } from "react-native";
import {
  hasSystemNotificationPermission,
  loadSystemNotificationsPreference,
  requestSystemNotificationPermission,
  saveSystemNotificationsPreference,
} from "./SystemNotifications";

/** The phone notification toggle: on only when the user wants it and the OS allows it. */
export function useSystemNotificationsSetting() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    void Promise.all([loadSystemNotificationsPreference(), hasSystemNotificationPermission()])
      .then(([wanted, granted]) => setEnabled(wanted && granted))
      .catch(() => undefined);
  }, []);

  const change = useCallback(async (next: boolean) => {
    if (next && !(await requestSystemNotificationPermission())) {
      Alert.alert(
        "Notifications are blocked",
        "Allow notifications for JNbot in your phone's settings to receive them in the background.",
        [
          { text: "Not now", style: "cancel" },
          { text: "Open settings", onPress: () => void Linking.openSettings() },
        ],
      );
      return;
    }
    setEnabled(next);
    await saveSystemNotificationsPreference(next);
  }, []);

  return [enabled, change] as const;
}
