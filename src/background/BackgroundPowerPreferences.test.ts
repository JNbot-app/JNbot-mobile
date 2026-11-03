jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  BACKGROUND_POWER_DISMISSED_RUN_KEY,
  clearDismissedBackgroundPowerRun,
  loadDismissedBackgroundPowerRun,
  loadManufacturerPowerSetupConfirmed,
  saveDismissedBackgroundPowerRun,
  saveManufacturerPowerSetupConfirmed,
} from "./BackgroundPowerPreferences";

describe("BackgroundPowerPreferences", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("stores a normalized dismissed script run", async () => {
    await saveDismissedBackgroundPowerRun(["2", "1", "2"]);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      BACKGROUND_POWER_DISMISSED_RUN_KEY,
      JSON.stringify(["1", "2"]),
    );

    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(["2", "1", "1", 4]));
    await expect(loadDismissedBackgroundPowerRun()).resolves.toEqual(["1", "2"]);
  });

  it("clears dismissed runs when the active run ends", async () => {
    await clearDismissedBackgroundPowerRun();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(BACKGROUND_POWER_DISMISSED_RUN_KEY);
  });

  it("stores Vivo completion per manufacturer and model", async () => {
    await saveManufacturerPowerSetupConfirmed("vivo", "V2407");
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "jnbot_background_power_vendor_setup:vivo:V2407",
      "true",
    );

    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce("true");
    await expect(loadManufacturerPowerSetupConfirmed("vivo", "V2407")).resolves.toBe(true);
  });
});
