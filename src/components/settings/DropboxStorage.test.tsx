jest.mock("@sentry/react-native", () => ({ captureException: jest.fn() }));
jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));
jest.mock("expo-haptics", () => ({
  selectionAsync: jest.fn().mockResolvedValue(undefined),
  impactAsync: jest.fn().mockResolvedValue(undefined),
}));

const mockRequestStorage = jest.fn();
jest.mock("../../runtime/EmbeddedNodeBridge", () => ({
  EmbeddedNodeBridge: jest.fn().mockImplementation(() => ({
    requestStorage: mockRequestStorage,
  })),
}));

import React from "react";
import { DropboxStorage } from "./DropboxStorage";

describe("DropboxStorage", () => {
  const onRestart = jest.fn().mockResolvedValue(undefined);
  const onStatusChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("exports a valid component function", () => {
    expect(typeof DropboxStorage).toBe("function");
  });

  it("renders a valid react element", () => {
    mockRequestStorage.mockResolvedValueOnce({
      mode: "local",
      connected: false,
      accounts: [],
    });

    const element = <DropboxStorage onRestart={onRestart} onStatusChange={onStatusChange} />;
    expect(React.isValidElement(element)).toBe(true);
  });
});
