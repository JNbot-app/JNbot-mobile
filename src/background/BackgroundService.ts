import { NativeModules, PermissionsAndroid, Platform } from "react-native";

interface JNbotBackgroundNativeModule {
  startService(title: string, message: string, details: string): Promise<boolean>;
  updateNotification(title: string, message: string, details: string): Promise<boolean>;
  stopService(): Promise<boolean>;
  isServiceRunning(): Promise<boolean>;
  isBatteryOptimizationIgnored(): Promise<boolean>;
  requestIgnoreBatteryOptimization(): Promise<boolean>;
  getBackgroundPowerStatus(): Promise<BackgroundPowerStatus>;
  openManufacturerPowerSettings(): Promise<ManufacturerPowerSettingsResult>;
}

export type ManufacturerPowerSettingsRoute =
  | "vivo-power-manager"
  | "app-details"
  | "battery-optimization-list"
  | "unavailable";

export interface BackgroundPowerStatus {
  isBatteryOptimizationIgnored: boolean;
  manufacturer: string;
  model: string;
  requiresManufacturerSetup: boolean;
  hasManufacturerSettingsRoute: boolean;
}

export interface ManufacturerPowerSettingsResult {
  opened: boolean;
  route: ManufacturerPowerSettingsRoute;
}

const nonAndroidPowerStatus = (): BackgroundPowerStatus => ({
  isBatteryOptimizationIgnored: true,
  manufacturer: "",
  model: "",
  requiresManufacturerSetup: false,
  hasManufacturerSettingsRoute: false,
});

const getNativeModule = (): JNbotBackgroundNativeModule | null => {
  if (Platform.OS !== "android") return null;
  return (NativeModules.JNbotBackgroundModule as JNbotBackgroundNativeModule) ?? null;
};

export async function startBackgroundService(
  title = "JNbot",
  message = "Bots running in background",
  details = "",
): Promise<boolean> {
  const module = getNativeModule();
  if (!module) return false;
  try {
    return await module.startService(title, message, details);
  } catch (error) {
    console.warn("[BackgroundService] Failed to start foreground service:", error);
    return false;
  }
}

export async function updateBackgroundNotification(
  title = "JNbot",
  message = "Bots running in background",
  details = "",
): Promise<boolean> {
  const module = getNativeModule();
  if (!module) return false;
  try {
    return await module.updateNotification(title, message, details);
  } catch (error) {
    console.warn("[BackgroundService] Failed to update foreground notification:", error);
    return false;
  }
}

export async function requestBackgroundNotificationPermission(): Promise<boolean> {
  if (Platform.OS !== "android") return false;
  if (Platform.Version < 33) return true;
  try {
    const permission = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;
    if (await PermissionsAndroid.check(permission)) return true;
    return await PermissionsAndroid.request(permission) === PermissionsAndroid.RESULTS.GRANTED;
  } catch (error) {
    console.warn("[BackgroundService] Failed to request notification permission:", error);
    return false;
  }
}

export async function stopBackgroundService(): Promise<boolean> {
  const module = getNativeModule();
  if (!module) return false;
  try {
    return await module.stopService();
  } catch (error) {
    console.warn("[BackgroundService] Failed to stop foreground service:", error);
    return false;
  }
}

export async function isBackgroundServiceRunning(): Promise<boolean> {
  const module = getNativeModule();
  if (!module) return false;
  try {
    return await module.isServiceRunning();
  } catch (error) {
    console.warn("[BackgroundService] Failed to check foreground service status:", error);
    return false;
  }
}

export async function isBatteryOptimizationIgnored(): Promise<boolean> {
  const module = getNativeModule();
  if (!module) return true;
  try {
    return await module.isBatteryOptimizationIgnored();
  } catch (error) {
    console.warn("[BackgroundService] Failed to check battery optimization:", error);
    return false;
  }
}

export async function requestIgnoreBatteryOptimization(): Promise<boolean> {
  const module = getNativeModule();
  if (!module) return false;
  try {
    return await module.requestIgnoreBatteryOptimization();
  } catch (error) {
    console.warn("[BackgroundService] Failed to request battery optimization exemption:", error);
    return false;
  }
}

export async function getBackgroundPowerStatus(): Promise<BackgroundPowerStatus> {
  const module = getNativeModule();
  if (!module) return nonAndroidPowerStatus();
  try {
    return await module.getBackgroundPowerStatus();
  } catch (error) {
    console.warn("[BackgroundService] Failed to read background power status:", error);
    return {
      ...nonAndroidPowerStatus(),
      isBatteryOptimizationIgnored: false,
    };
  }
}

export async function openManufacturerPowerSettings(): Promise<ManufacturerPowerSettingsResult> {
  const module = getNativeModule();
  if (!module) return { opened: false, route: "unavailable" };
  try {
    return await module.openManufacturerPowerSettings();
  } catch (error) {
    console.warn("[BackgroundService] Failed to open manufacturer power settings:", error);
    return { opened: false, route: "unavailable" };
  }
}
