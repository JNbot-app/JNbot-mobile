import AsyncStorage from "@react-native-async-storage/async-storage";

export const BACKGROUND_POWER_DISMISSED_RUN_KEY = "jnbot_background_power_dismissed_run";
const VENDOR_SETUP_KEY_PREFIX = "jnbot_background_power_vendor_setup";

function parseScriptIds(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return [...new Set(parsed.filter((item): item is string => typeof item === "string" && item.length > 0))]
      .sort();
  } catch {
    return [];
  }
}

function vendorSetupKey(manufacturer: string, model: string): string {
  return `${VENDOR_SETUP_KEY_PREFIX}:${encodeURIComponent(manufacturer)}:${encodeURIComponent(model)}`;
}

export async function loadDismissedBackgroundPowerRun(): Promise<string[]> {
  try {
    return parseScriptIds(await AsyncStorage.getItem(BACKGROUND_POWER_DISMISSED_RUN_KEY));
  } catch {
    return [];
  }
}

export async function saveDismissedBackgroundPowerRun(instanceIds: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(
      BACKGROUND_POWER_DISMISSED_RUN_KEY,
      JSON.stringify([...new Set(instanceIds)].sort()),
    );
  } catch (error) {
    console.warn("[BackgroundPowerPreferences] Failed to save dismissed run:", error);
  }
}

export async function clearDismissedBackgroundPowerRun(): Promise<void> {
  try {
    await AsyncStorage.removeItem(BACKGROUND_POWER_DISMISSED_RUN_KEY);
  } catch (error) {
    console.warn("[BackgroundPowerPreferences] Failed to clear dismissed run:", error);
  }
}

export async function loadManufacturerPowerSetupConfirmed(
  manufacturer: string,
  model: string,
): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(vendorSetupKey(manufacturer, model))) === "true";
  } catch {
    return false;
  }
}

export async function saveManufacturerPowerSetupConfirmed(
  manufacturer: string,
  model: string,
): Promise<void> {
  try {
    await AsyncStorage.setItem(vendorSetupKey(manufacturer, model), "true");
  } catch (error) {
    console.warn("[BackgroundPowerPreferences] Failed to save manufacturer setup:", error);
  }
}
