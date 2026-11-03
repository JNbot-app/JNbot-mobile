jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import {
  BACKGROUND_KEEP_ALIVE_KEY,
  loadBackgroundKeepAlivePreference,
  saveBackgroundKeepAlivePreference,
} from "./BackgroundPreferences";

describe("BackgroundPreferences", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("loads default enabled preference on Android when not set", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
    Platform.OS = "android";
    const result = await loadBackgroundKeepAlivePreference();
    expect(result).toBe(true);
    expect(AsyncStorage.getItem).toHaveBeenCalledWith(BACKGROUND_KEEP_ALIVE_KEY);
  });

  it("loads default disabled preference on iOS when not set", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
    Platform.OS = "ios";
    const result = await loadBackgroundKeepAlivePreference();
    expect(result).toBe(false);
  });

  it("loads stored preference correctly", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce("false");
    Platform.OS = "android";
    const result = await loadBackgroundKeepAlivePreference();
    expect(result).toBe(false);
  });

  it("persists preference value", async () => {
    await saveBackgroundKeepAlivePreference(true);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(BACKGROUND_KEEP_ALIVE_KEY, "true");

    await saveBackgroundKeepAlivePreference(false);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(BACKGROUND_KEEP_ALIVE_KEY, "false");
  });
});
