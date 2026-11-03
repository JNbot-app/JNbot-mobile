import React from "react";
import { AppState, Platform } from "react-native";
import type { ActiveScriptsType } from "../store/types";

const { act, create } = require("jest-expo/node_modules/react-test-renderer");

let mockState: { activeBots: []; activeScripts: ActiveScriptsType };
jest.mock("../store/store", () => ({
  useStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
}));
jest.mock("../net/ConnectionProvider", () => ({
  useConnection: () => ({ mode: "local", status: "connected" }),
}));
jest.mock("./BackgroundPreferences", () => ({
  loadBackgroundKeepAlivePreference: jest.fn().mockResolvedValue(true),
}));
jest.mock("./BackgroundService", () => ({
  startBackgroundService: jest.fn().mockResolvedValue(true),
  updateBackgroundNotification: jest.fn().mockResolvedValue(true),
  stopBackgroundService: jest.fn().mockResolvedValue(true),
  requestBackgroundNotificationPermission: jest.fn().mockResolvedValue(false),
}));

import { BackgroundSync } from "./BackgroundSync";
import {
  startBackgroundService, updateBackgroundNotification,
  stopBackgroundService, requestBackgroundNotificationPermission,
} from "./BackgroundService";

describe("background notification lifecycle", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Platform.OS = "android";
    AppState.currentState = "active";
    jest.spyOn(AppState, "addEventListener").mockReturnValue({ remove: jest.fn() });
    mockState = {
      activeBots: [],
      activeScripts: { 1: { name: "Mining", scriptId: "mining", instanceId: 1, progress: { current: 1, total: 4 } } },
    };
  });

  afterEach(() => jest.restoreAllMocks());

  it("keeps running after permission denial and updates progress without prompting again", async () => {
    let view: ReturnType<typeof create>;
    await act(async () => { view = create(<BackgroundSync />); });
    expect(startBackgroundService).toHaveBeenCalledWith("JNbot", "1 script running", expect.stringContaining("1/4 (25%)"));
    expect(requestBackgroundNotificationPermission).toHaveBeenCalledTimes(1);

    mockState.activeScripts = { 1: { name: "Mining", scriptId: "mining", instanceId: 1, progress: { current: 2, total: 4 } } };
    await act(async () => { view.update(<BackgroundSync />); });
    expect(updateBackgroundNotification).toHaveBeenCalledWith("JNbot", "1 script running", expect.stringContaining("2/4 (50%)"));
    expect(requestBackgroundNotificationPermission).toHaveBeenCalledTimes(1);

    await act(async () => { view.update(<BackgroundSync />); });
    expect(updateBackgroundNotification).toHaveBeenCalledTimes(1);
    await act(async () => { view.unmount(); });
    expect(stopBackgroundService).toHaveBeenCalledTimes(1);
  });

  it("stops a service whose start finishes after unmount", async () => {
    let finishStart: (value: boolean) => void = () => {};
    jest.mocked(startBackgroundService).mockReturnValueOnce(new Promise<boolean>((resolve) => {
      finishStart = resolve;
    }));
    let view: ReturnType<typeof create>;
    await act(async () => { view = create(<BackgroundSync />); });
    await act(async () => { view.unmount(); });
    expect(stopBackgroundService).not.toHaveBeenCalled();
    await act(async () => { finishStart(true); });
    expect(stopBackgroundService).toHaveBeenCalledTimes(1);
  });
});
