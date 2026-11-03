import { NativeModules, PermissionsAndroid, Platform } from "react-native";
import {
  getBackgroundPowerStatus,
  isBackgroundServiceRunning,
  isBatteryOptimizationIgnored,
  openManufacturerPowerSettings,
  requestIgnoreBatteryOptimization,
  requestBackgroundNotificationPermission,
  startBackgroundService,
  stopBackgroundService,
  updateBackgroundNotification,
} from "./BackgroundService";

describe("BackgroundService", () => {
  const mockNativeModule = {
    startService: jest.fn(),
    updateNotification: jest.fn(),
    stopService: jest.fn(),
    isServiceRunning: jest.fn(),
    isBatteryOptimizationIgnored: jest.fn(),
    requestIgnoreBatteryOptimization: jest.fn(),
    getBackgroundPowerStatus: jest.fn(),
    openManufacturerPowerSettings: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    NativeModules.JNbotBackgroundModule = mockNativeModule;
  });

  describe("on Android", () => {
    beforeEach(() => {
      Platform.OS = "android";
    });

    it("starts background service with default or custom text", async () => {
      mockNativeModule.startService.mockResolvedValueOnce(true);
      const res = await startBackgroundService("Custom Title", "1 bot active");
      expect(res).toBe(true);
      expect(mockNativeModule.startService).toHaveBeenCalledWith("Custom Title", "1 bot active", "");
    });

    it("updates background notification", async () => {
      mockNativeModule.updateNotification.mockResolvedValueOnce(true);
      const res = await updateBackgroundNotification("JNbot", "2 bots active", "Miner · connected");
      expect(res).toBe(true);
      expect(mockNativeModule.updateNotification).toHaveBeenCalledWith("JNbot", "2 bots active", "Miner · connected");
    });

    it("stops background service", async () => {
      mockNativeModule.stopService.mockResolvedValueOnce(true);
      const res = await stopBackgroundService();
      expect(res).toBe(true);
      expect(mockNativeModule.stopService).toHaveBeenCalled();
    });

    it("queries service running state", async () => {
      mockNativeModule.isServiceRunning.mockResolvedValueOnce(true);
      const res = await isBackgroundServiceRunning();
      expect(res).toBe(true);
      expect(mockNativeModule.isServiceRunning).toHaveBeenCalled();
    });

    it("checks and requests battery optimization exemption", async () => {
      mockNativeModule.isBatteryOptimizationIgnored.mockResolvedValueOnce(false);
      expect(await isBatteryOptimizationIgnored()).toBe(false);

      mockNativeModule.requestIgnoreBatteryOptimization.mockResolvedValueOnce(true);
      expect(await requestIgnoreBatteryOptimization()).toBe(true);
    });

    it("reads background power status and opens manufacturer settings", async () => {
      mockNativeModule.getBackgroundPowerStatus.mockResolvedValueOnce({
        isBatteryOptimizationIgnored: true,
        manufacturer: "vivo",
        model: "V2407",
        requiresManufacturerSetup: true,
        hasManufacturerSettingsRoute: true,
      });
      expect(await getBackgroundPowerStatus()).toEqual({
        isBatteryOptimizationIgnored: true,
        manufacturer: "vivo",
        model: "V2407",
        requiresManufacturerSetup: true,
        hasManufacturerSettingsRoute: true,
      });

      mockNativeModule.openManufacturerPowerSettings.mockResolvedValueOnce({
        opened: true,
        route: "vivo-power-manager",
      });
      expect(await openManufacturerPowerSettings()).toEqual({
        opened: true,
        route: "vivo-power-manager",
      });
    });

    it("handles native errors gracefully", async () => {
      const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
      mockNativeModule.startService.mockRejectedValueOnce(new Error("Native failure"));

      const res = await startBackgroundService();
      expect(res).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
    });
  });

  describe("on non-Android platforms", () => {
    beforeEach(() => {
      Platform.OS = "ios";
    });

    it("gracefully no-ops without calling native modules", async () => {
      expect(await startBackgroundService()).toBe(false);
      expect(await updateBackgroundNotification()).toBe(false);
      expect(await stopBackgroundService()).toBe(false);
      expect(await isBackgroundServiceRunning()).toBe(false);
      expect(await isBatteryOptimizationIgnored()).toBe(true);
      expect(await requestIgnoreBatteryOptimization()).toBe(false);
      expect(await requestBackgroundNotificationPermission()).toBe(false);
      expect(await getBackgroundPowerStatus()).toEqual({
        isBatteryOptimizationIgnored: true,
        manufacturer: "",
        model: "",
        requiresManufacturerSetup: false,
        hasManufacturerSettingsRoute: false,
      });
      expect(await openManufacturerPowerSettings()).toEqual({ opened: false, route: "unavailable" });

      expect(mockNativeModule.startService).not.toHaveBeenCalled();
    });
  });
});

describe("background notification permission", () => {
  const versionDescriptor = Object.getOwnPropertyDescriptor(Platform, "Version");
  let check: jest.SpyInstance;
  let request: jest.SpyInstance;

  beforeEach(() => {
    Platform.OS = "android";
    Object.defineProperty(Platform, "Version", { configurable: true, value: 33 });
    check = jest.spyOn(PermissionsAndroid, "check");
    request = jest.spyOn(PermissionsAndroid, "request");
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (versionDescriptor) Object.defineProperty(Platform, "Version", versionDescriptor);
  });

  it("does not prompt before Android 13", async () => {
    Object.defineProperty(Platform, "Version", { configurable: true, value: 32 });
    expect(await requestBackgroundNotificationPermission()).toBe(true);
    expect(check).not.toHaveBeenCalled();
    expect(request).not.toHaveBeenCalled();
  });

  it("does not prompt when permission is already granted", async () => {
    check.mockResolvedValue(true);
    expect(await requestBackgroundNotificationPermission()).toBe(true);
    expect(request).not.toHaveBeenCalled();
  });

  it.each(["denied", "never_ask_again"])("handles %s without throwing", async (result) => {
    check.mockResolvedValue(false);
    request.mockResolvedValue(result);
    expect(await requestBackgroundNotificationPermission()).toBe(false);
    expect(request).toHaveBeenCalledWith(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
  });

  it("requests missing permission", async () => {
    check.mockResolvedValue(false);
    request.mockResolvedValue(PermissionsAndroid.RESULTS.GRANTED);
    expect(await requestBackgroundNotificationPermission()).toBe(true);
  });
});
