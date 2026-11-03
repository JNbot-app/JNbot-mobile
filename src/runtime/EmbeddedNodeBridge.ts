import type { TransportFrame } from "../generated/client-contract/messaging/Transport";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getMigratedItem } from "./legacySecureStore";

const DROPBOX_CREDENTIALS_KEY = "jnbot.dropbox.credentials";
export type DropboxCredentials = { refreshToken: string; accountId: string; email?: string; name?: string };
export type DropboxAccounts = { accounts: DropboxCredentials[] };
export type StorageStatus = {
  mode: "local" | "dropbox";
  connected: boolean;
  account?: { id: string; email?: string; name?: string };
  accounts: { id: string; email?: string; name?: string }[];
  writes?: { saving?: boolean; lastSavedAt?: number; lastError?: string };
  startupState?: "idle" | "loading" | "ready" | "error";
  startupError?: string;
};
type StorageAction = "status" | "begin-login" | "complete-login" | "select" | "disconnect" | "flush" | "refresh" | "transfer";

type NodeMessage =
  | { kind: "assigned"; address: number }
  | { kind: "frame"; frame: TransportFrame }
  | { kind: "ready" }
  | { kind: "health"; ready: boolean }
  | { kind: "debug"; phase: string; rss?: number; heapUsed?: number }
  | {
      kind: "node-error";
      source: string;
      message: string;
      stack?: string;
      script?: string;
      instanceId?: number;
      exitCode?: number;
    }
  | { kind: "fatal"; code: string; message: string }
  | { kind: "storage-result"; id: number; value?: unknown; error?: string }
  | { kind: "credentials-write"; id: number; value: DropboxAccounts };

type Listener = (message: NodeMessage) => void;

let started = false;
let requestId = 0;
let lastCredentialWriteId = 0;
const requests = new Map<number, { resolve(value: unknown): void; reject(error: Error): void; timer: ReturnType<typeof setTimeout> }>();
type NativeNodeApi = {
  channel: {
    addListener: (
      event: string,
      callback: (message: NodeMessage) => void,
    ) => void;
    removeListener: (
      event: string,
      callback: (message: NodeMessage) => void,
    ) => void;
    send: (message: unknown) => void;
  };
  start: (entry: string) => void;
};
type NativeNodeModule = NativeNodeApi & { default?: NativeNodeApi };
let bridge: NativeNodeApi | null = null;

function nativeBridge(): NativeNodeApi {
  if (bridge) return bridge;
  try {
    // nodejs-mobile-react-native publishes CommonJS (`module.exports = nodejs`),
    // even though its type declarations expose a default export. A raw
    // `require()` therefore returns the API itself, not `{ default: API }`.
    // Supporting both shapes keeps this lazy load compatible with Metro and
    // with the native module's actual runtime export.
    const module = require("nodejs-mobile-react-native") as NativeNodeModule;
    const loaded = module.default ?? module;
    if (!loaded?.channel || typeof loaded.start !== "function")
      throw new Error("Invalid nodejs-mobile-react-native export.");
    bridge = loaded;
    return loaded;
  } catch {
    throw new Error(
      "Local bots require a native JNbot build with the embedded Node runtime. Expo Go cannot run local bots.",
    );
  }
}

/** Singleton wrapper: Node.js Mobile permits one Node engine per app process. */
export class EmbeddedNodeBridge {
  private readonly listeners = new Set<Listener>();
  private subscribed = false;
  private readonly receive = (message: NodeMessage) => {
    if (message.kind === "storage-result") {
      const pending = requests.get(message.id);
      if (pending) {
        requests.delete(message.id);
        clearTimeout(pending.timer);
        message.error ? pending.reject(new Error(message.error)) : pending.resolve(message.value);
      }
      return;
    }
    if (message.kind === "credentials-write") {
      // Multiple bridge wrappers can be subscribed, but credentials must be written once.
      if (message.id <= lastCredentialWriteId) return;
      lastCredentialWriteId = message.id;
      const operation = AsyncStorage.setItem(DROPBOX_CREDENTIALS_KEY, JSON.stringify(message.value));
      void operation.then(
        () => nativeBridge().channel.send({ kind: "credentials-result", id: message.id }),
        (error) => nativeBridge().channel.send({ kind: "credentials-result", id: message.id, error: String(error) }),
      );
      return;
    }
    for (const listener of this.listeners) listener(message);
  };

  on(listener: Listener) {
    const api = nativeBridge();
    if (!this.subscribed) {
      api.channel.addListener("message", this.receive);
      this.subscribed = true;
    }
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async start(session: string) {
    const api = nativeBridge();
    if (!started) {
      started = true;
      api.start("main.js");
    }
    await this.signalStart(session);
  }

  /**
   * Repeats the idempotent handshake without trying to restart Node. The
   * backend answers each session once, so queued retries are not re-announced.
   */
  async signalStart(session: string) {
    const raw = await getMigratedItem(DROPBOX_CREDENTIALS_KEY);
    let credentials: DropboxAccounts | DropboxCredentials | null = null;
    if (raw) {
      try { credentials = JSON.parse(raw) as DropboxAccounts | DropboxCredentials; }
      catch { credentials = null; }
    }
    nativeBridge().channel.send({ kind: "start", credentials, session });
  }

  requestStorage<T>(action: StorageAction, values: Record<string, unknown> = {}): Promise<T> {
    const id = ++requestId;
    // The response listener is active even when the local runtime cannot start.
    if (!this.subscribed) {
      nativeBridge().channel.addListener("message", this.receive);
      this.subscribed = true;
    }
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        requests.delete(id);
        reject(new Error("The local storage request timed out."));
      }, 60_000);
      requests.set(id, { resolve: resolve as (value: unknown) => void, reject, timer });
      nativeBridge().channel.send({ kind: "storage-request", id, action, ...values });
    });
  }

  sendFrame(frame: TransportFrame) {
    nativeBridge().channel.send({ kind: "frame", frame });
  }

  health() {
    nativeBridge().channel.send({ kind: "health" });
  }
}
