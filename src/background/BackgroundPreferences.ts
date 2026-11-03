import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

export const BACKGROUND_KEEP_ALIVE_KEY = "jnbot_keep_alive_background";

export async function loadBackgroundKeepAlivePreference(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(BACKGROUND_KEEP_ALIVE_KEY);
    if (value === null) {
      // Default to enabled on Android, disabled elsewhere
      return Platform.OS === "android";
    }
    return value === "true";
  } catch {
    return Platform.OS === "android";
  }
}

export async function saveBackgroundKeepAlivePreference(
  enabled: boolean,
): Promise<void> {
  try {
    await AsyncStorage.setItem(BACKGROUND_KEEP_ALIVE_KEY, enabled ? "true" : "false");
  } catch (error) {
    console.warn("[BackgroundPreferences] Failed to save preference:", error);
  }
}
