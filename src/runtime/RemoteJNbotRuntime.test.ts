import { RemoteJNbotRuntime } from "./RemoteJNbotRuntime";
import type { RemoteBootstrap } from "./types";

const bootstrap = {
  jndata: { serverList: [], servers: {}, data: {}, versions: [] },
  profiles: [],
  appSettings: {},
  shared: {},
} as unknown as RemoteBootstrap;

describe("RemoteJNbotRuntime bootstrap readiness", () => {
  it("does not report connected when only the data channel is open", () => {
    const runtime = new RemoteJNbotRuntime();
    const states: string[] = [];
    runtime.on("state", (state) => states.push(state));
    const channel: any = { readyState: "open" };
    (runtime as any).bindDataChannel(channel);
    channel.onopen();
    expect(states.at(-1)).toBe("synchronizing");
  });

  it("waits for bootstrap when called before peer assignment", async () => {
    const runtime = new RemoteJNbotRuntime();
    const pending = runtime.getBootstrap();
    (runtime as any).bootstrap = bootstrap;
    (runtime as any).emit("bootstrap", bootstrap);
    await expect(pending).resolves.toBe(bootstrap);
  });

  it("rejects when the connection closes before bootstrap", async () => {
    const runtime = new RemoteJNbotRuntime();
    const pending = runtime.getBootstrap();
    (runtime as any).setState("disconnected");
    await expect(pending).rejects.toThrow("closed before profiles loaded");
  });

  it("rejects importFullInstance indicating instance imports are for phone runtime", async () => {
    const runtime = new RemoteJNbotRuntime();
    await expect(
      runtime.importFullInstance({ type: "cloud", userId: "abc", password: "123" }),
    ).rejects.toThrow("JNbot instance imports can only be performed on this phone.");
  });

  it("handles handleOffer safely when ack callback is omitted", async () => {
    const runtime = new RemoteJNbotRuntime();
    (runtime as any).credentials = {
      room: "test-room",
      deviceId: "dev1",
      token: "tok1",
    };
    (runtime as any).peer = {
      setRemoteDescription: jest.fn().mockResolvedValue(undefined),
      createAnswer: jest.fn().mockResolvedValue({ sdp: "answer-sdp", type: "answer" }),
      setLocalDescription: jest.fn().mockResolvedValue(undefined),
      localDescription: { sdp: "answer-sdp", type: "answer" },
      addIceCandidate: jest.fn().mockResolvedValue(undefined),
    };
    (runtime as any).socket = {
      id: "sock1",
      emit: jest.fn(),
    };

    // Calling handleOffer with no ack argument should complete without error
    await expect(
      (runtime as any).handleOffer({
        accepted: true,
        offer: JSON.stringify({ sdp: "offer-sdp", type: "offer" }),
      }),
    ).resolves.toBeUndefined();

    expect((runtime as any).socket.emit).toHaveBeenCalledWith(
      "ANSWER",
      expect.objectContaining({ roomId: "test-room" }),
    );
  });

  it("returns no-op unsubscribe when subscribing bot without an active messenger", () => {
    const runtime = new RemoteJNbotRuntime();
    const bot = { botId: 1, MESSAGE_ADDRESS: 100 } as any;
    const unsub = runtime.subscribeBot(bot, "chat", () => undefined);
    expect(typeof unsub).toBe("function");
    expect(() => unsub()).not.toThrow();
  });

  it("does not throw when sending to address without an active messenger", () => {
    const runtime = new RemoteJNbotRuntime();
    expect(() => runtime.sendToAddress("test", 123 as any, {})).not.toThrow();
  });

  it("rejects botAction when messenger is not ready", async () => {
    const runtime = new RemoteJNbotRuntime();
    const bot = { botId: 1, MESSAGE_ADDRESS: 100 } as any;
    await expect(runtime.botAction(bot, "jump")).rejects.toThrow(
      "Peer connection is not ready.",
    );
  });

  it("queries fresh bootstrap from messenger when forceRefresh is true", async () => {
    const runtime = new RemoteJNbotRuntime();
    (runtime as any).bootstrap = bootstrap;
    const freshBootstrap = {
      ...bootstrap,
      profiles: [{ id: "p1", name: "Profile 1" }],
    };
    (runtime as any).messenger = {
      request: jest.fn().mockResolvedValue(freshBootstrap),
    };

    const result = await runtime.getBootstrap(true);
    expect(result).toBe(freshBootstrap);
    expect((runtime as any).messenger.request).toHaveBeenCalledWith(
      "client:action",
      expect.anything(),
      { event: "GET_BOOTSTRAP" },
      { timeoutMs: 10_000 },
    );
  });

  it("cleans up peer and channel listeners completely on disconnect", () => {
    const runtime = new RemoteJNbotRuntime();
    const peerClose = jest.fn();
    const channelClose = jest.fn();
    const mockPeer: any = {
      close: peerClose,
      onconnectionstatechange: jest.fn(),
      ondatachannel: jest.fn(),
      onicecandidate: jest.fn(),
      oniceconnectionstatechange: jest.fn(),
      onsignalingstatechange: jest.fn(),
    };
    const mockChannel: any = {
      close: channelClose,
      onopen: jest.fn(),
      onclose: jest.fn(),
      onerror: jest.fn(),
      onmessage: jest.fn(),
    };
    (runtime as any).peer = mockPeer;
    (runtime as any).channel = mockChannel;

    runtime.disconnect();

    expect(mockPeer.onconnectionstatechange).toBeNull();
    expect(mockPeer.onicecandidate).toBeNull();
    expect(mockPeer.oniceconnectionstatechange).toBeNull();
    expect(mockChannel.onmessage).toBeNull();
    expect(peerClose).toHaveBeenCalled();
    expect(channelClose).toHaveBeenCalled();
    expect((runtime as any).peer).toBeNull();
    expect((runtime as any).channel).toBeNull();
  });
});
