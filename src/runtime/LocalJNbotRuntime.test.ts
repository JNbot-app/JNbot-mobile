const mockStart = jest.fn();
const mockSignalStart = jest.fn();
const mockSendFrame = jest.fn();
let mockReceive: ((message: unknown) => void) | null = null;

jest.mock("./EmbeddedNodeBridge", () => ({
  EmbeddedNodeBridge: jest.fn().mockImplementation(() => ({
    on: jest.fn((listener: (message: unknown) => void) => {
      mockReceive = listener;
      return jest.fn();
    }),
    start: mockStart,
    signalStart: mockSignalStart,
    sendFrame: mockSendFrame,
    health: jest.fn(),
  })),
}));
jest.mock("@sentry/react-native", () => ({ captureException: jest.fn() }));

import { LocalJNbotRuntime } from "./LocalJNbotRuntime";

describe("LocalJNbotRuntime startup", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockStart.mockClear();
    mockSignalStart.mockClear();
    mockSendFrame.mockClear();
    mockReceive = null;
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("retries the start handshake until the embedded backend is ready", async () => {
    const runtime = new LocalJNbotRuntime();
    const starting = runtime.start();

    expect(mockStart).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(1_500);
    expect(mockStart).toHaveBeenCalledTimes(1);
    expect(mockSignalStart).toHaveBeenCalledTimes(3);

    mockReceive?.({ kind: "ready" });
    await starting;
    expect(runtime.state).toBe("connected");

    jest.advanceTimersByTime(1_500);
    expect(mockSignalStart).toHaveBeenCalledTimes(3);
  });

  it("reuses the messenger when a retried handshake repeats its assignment", async () => {
    const warn = jest.spyOn(console, "warn").mockImplementation();
    const runtime = new LocalJNbotRuntime();
    const starting = runtime.start();
    const address = 1_099_511_627_777;

    mockReceive?.({ kind: "assigned", address });
    mockReceive?.({ kind: "assigned", address });
    mockReceive?.({ kind: "ready" });
    await starting;

    const summaries = runtime.getRuntimeSummaries();
    const request = mockSendFrame.mock.calls[0][0].envelope;
    mockReceive?.({
      kind: "frame",
      frame: {
        envelope: {
          version: 1,
          type: "response",
          event: request.event,
          from: 0,
          to: address,
          correlationId: request.correlationId,
          data: [],
        },
      },
    });

    await expect(summaries).resolves.toEqual([]);
    expect(mockSendFrame).toHaveBeenCalledTimes(1);
    expect(warn).not.toHaveBeenCalled();
    runtime.disconnect();
  });

  it("handles importFullInstance with cloud parameters", async () => {
    jest.useRealTimers();
    const runtime = new LocalJNbotRuntime();
    const starting = runtime.start();
    const address = 1_099_511_627_777;

    mockReceive?.({ kind: "assigned", address });
    mockReceive?.({ kind: "ready" });
    await starting;

    const mockBootstrap = {
      jndata: { serverList: ["jartex"], data: { jartex: { name: "Jartex" } } },
      profiles: [],
      appSettings: {},
      shared: {},
    };

    mockSendFrame.mockImplementation((frame: any) => {
      const env = frame?.envelope;
      if (!env || env.type !== "request") return;
      if (env.data?.event === "CLOUD_STORAGE_IMPORT") {
        queueMicrotask(() => {
          mockReceive?.({
            kind: "frame",
            frame: {
              envelope: {
                version: 1,
                type: "response",
                event: env.event,
                from: 0,
                to: address,
                correlationId: env.correlationId,
                data: { success: true },
              },
            },
          });
        });
      } else if (env.data?.event === "GET_BOOTSTRAP") {
        queueMicrotask(() => {
          mockReceive?.({
            kind: "frame",
            frame: {
              envelope: {
                version: 1,
                type: "response",
                event: env.event,
                from: 0,
                to: address,
                correlationId: env.correlationId,
                data: mockBootstrap,
              },
            },
          });
        });
      }
    });

    const result = await runtime.importFullInstance({
      type: "cloud",
      userId: "test-user",
      password: "test-share-key",
    });

    expect(result).toEqual({ success: true, bootstrap: mockBootstrap });
    runtime.disconnect();
  });

  it("handles importFullInstance with file content", async () => {
    jest.useRealTimers();
    const runtime = new LocalJNbotRuntime();
    const starting = runtime.start();
    const address = 1_099_511_627_777;

    mockReceive?.({ kind: "assigned", address });
    mockReceive?.({ kind: "ready" });
    await starting;

    const mockBootstrap = {
      jndata: { serverList: ["pika"], data: { pika: { name: "Pika" } } },
      profiles: [],
      appSettings: {},
      shared: {},
    };

    mockSendFrame.mockImplementation((frame: any) => {
      const env = frame?.envelope;
      if (!env || env.type !== "request") return;
      if (env.data?.event === "IMPORT_SETTINGS") {
        queueMicrotask(() => {
          mockReceive?.({
            kind: "frame",
            frame: {
              envelope: {
                version: 1,
                type: "response",
                event: env.event,
                from: 0,
                to: address,
                correlationId: env.correlationId,
                data: { success: true },
              },
            },
          });
        });
      } else if (env.data?.event === "GET_BOOTSTRAP") {
        queueMicrotask(() => {
          mockReceive?.({
            kind: "frame",
            frame: {
              envelope: {
                version: 1,
                type: "response",
                event: env.event,
                from: 0,
                to: address,
                correlationId: env.correlationId,
                data: mockBootstrap,
              },
            },
          });
        });
      }
    });

    const result = await runtime.importFullInstance({
      type: "file",
      fileContent: '{"version":4,"ciphertext":"abc"}',
      password: "my-password",
    });

    expect(result).toEqual({ success: true, bootstrap: mockBootstrap });
    runtime.disconnect();
  });

  it("suppresses Sentry reports when worker exits with code 1", async () => {
    const Sentry = require("@sentry/react-native");
    const runtime = new LocalJNbotRuntime();
    const starting = runtime.start();

    mockReceive?.({
      kind: "node-error",
      source: "worker:exit",
      message: "Worker exited with code 1.",
      exitCode: 1,
    });

    expect(Sentry.captureException).not.toHaveBeenCalled();
    mockReceive?.({ kind: "ready" });
    await starting;
    runtime.disconnect();
  });
});
