import type { BackgroundPowerStatus } from "./BackgroundService";

jest.mock("../net/ConnectionProvider", () => ({
  useConnection: jest.fn(),
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

import {
  getBackgroundPowerSetupState,
  shouldShowBackgroundPowerReminder,
} from "./BackgroundPowerSetup";

const stockAndroid: BackgroundPowerStatus = {
  isBatteryOptimizationIgnored: false,
  manufacturer: "google",
  model: "Pixel",
  requiresManufacturerSetup: false,
  hasManufacturerSettingsRoute: false,
};

const vivo: BackgroundPowerStatus = {
  isBatteryOptimizationIgnored: true,
  manufacturer: "vivo",
  model: "V2407",
  requiresManufacturerSetup: true,
  hasManufacturerSettingsRoute: true,
};

describe("BackgroundPowerSetup", () => {
  it("derives the standard and Vivo setup steps", () => {
    expect(getBackgroundPowerSetupState({
      powerStatus: stockAndroid,
      manufacturerSetupConfirmed: false,
      manufacturerSettingsOpened: false,
      hasError: false,
    })).toBe("needs-standard-exemption");

    expect(getBackgroundPowerSetupState({
      powerStatus: vivo,
      manufacturerSetupConfirmed: false,
      manufacturerSettingsOpened: false,
      hasError: false,
    })).toBe("needs-oem-setup");

    expect(getBackgroundPowerSetupState({
      powerStatus: vivo,
      manufacturerSetupConfirmed: false,
      manufacturerSettingsOpened: true,
      hasError: false,
    })).toBe("awaiting-oem-confirmation");

    expect(getBackgroundPowerSetupState({
      powerStatus: vivo,
      manufacturerSetupConfirmed: true,
      manufacturerSettingsOpened: true,
      hasError: false,
    })).toBe("complete");
  });

  it("shows only for active local Android scripts and honours the current-run dismissal", () => {
    const base: Parameters<typeof shouldShowBackgroundPowerReminder>[0] = {
      isAndroid: true,
      mode: "local",
      activeScriptIds: ["run-1"],
      dismissedScriptIds: [],
      dismissalLoaded: true,
      state: "needs-standard-exemption",
    };

    expect(shouldShowBackgroundPowerReminder(base)).toBe(true);
    expect(shouldShowBackgroundPowerReminder({ ...base, mode: "remote" })).toBe(false);
    expect(shouldShowBackgroundPowerReminder({ ...base, isAndroid: false })).toBe(false);
    expect(shouldShowBackgroundPowerReminder({ ...base, activeScriptIds: [] })).toBe(false);
    expect(shouldShowBackgroundPowerReminder({ ...base, dismissedScriptIds: ["run-1"] })).toBe(false);
    expect(shouldShowBackgroundPowerReminder({ ...base, dismissedScriptIds: ["run-1"], activeScriptIds: ["run-1", "run-2"] })).toBe(true);
  });
});
