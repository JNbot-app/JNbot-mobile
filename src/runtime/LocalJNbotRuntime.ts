import type { ActiveBot, AltWithData, MacroInfo } from "../store/types";
import {
  BACKEND,
  type Address,
} from "../generated/client-contract/messaging/Address";
import { Messenger } from "../generated/client-contract/messaging/Messenger";
import { llmRequestOptions } from "../generated/client-contract/llm";
import type { ProfilePublication } from "../generated/client-contract/messaging/Protocol";
import type {
  EndpointTransport,
  TransportFrame,
} from "../generated/client-contract/messaging/Transport";
import { PUBLISHER_NAME_REQUIRED, type JNbotRuntime, type RuntimeUnsubscribe, type ServerStatus, type ShareAction } from "./JNbotRuntime";
import * as Sentry from "@sentry/react-native";
import { EmbeddedNodeBridge } from "./EmbeddedNodeBridge";
import type {
  CreateProfileInput,
  CreateProfileResult,
  DeleteProfileResult,
  PluginRunDescriptor,
  ProfileRuntimeSummary,
  RemoteBootstrap,
  RuntimeConnectionState,
  RuntimeEvents,
  RuntimeProfile,
  StartScriptPayload,
  SyncedProfileInstallResult,
  SyncedProfilePackage,
  InstanceImportInput,
  InstanceImportResult,
  InstanceTransferChunk,
  InstanceTransferManifest,
  PortablePluginPackage,
  PluginImportPreview,
  PluginImportDecision,
  PluginImportResult,
} from "./types";
import type { PluginMetadata } from "../features/plugins/folders";

type ListenerMap = {
  [K in keyof RuntimeEvents]: Set<(value: RuntimeEvents[K]) => void>;
};

const LOCAL_START_TIMEOUT_MS = 60_000;
const LOCAL_START_RETRY_MS = 500;

class BridgeTransport implements EndpointTransport {
  private readonly receivers = new Set<(frame: TransportFrame) => void>();
  constructor(private readonly bridge: EmbeddedNodeBridge) {}
  send(frame: TransportFrame) {
    this.bridge.sendFrame(frame);
  }
  async sendAsync(frame: TransportFrame) {
    this.send(frame);
  }
  subscribe(receiver: (frame: TransportFrame) => void) {
    this.receivers.add(receiver);
    return () => this.receivers.delete(receiver);
  }
  receive(frame: TransportFrame) {
    for (const receiver of this.receivers) receiver(frame);
  }
}

import { MobilePlatformBridge } from "./MobilePlatformBridge";

/**
 * Local mode speaks the exact same Messenger protocol as a paired desktop.
 * The only transport difference is the native JSON bridge to Node.js Mobile.
 */
export class LocalJNbotRuntime implements JNbotRuntime {
  public state: RuntimeConnectionState = "idle";
  private readonly bridge = new EmbeddedNodeBridge();
  private readonly transport = new BridgeTransport(this.bridge);
  private messenger: Messenger | null = null;
  private address: Address | null = null;
  private bootstrap: RemoteBootstrap | null = null;
  private profileSubscription: RuntimeUnsubscribe | null = null;
  private bridgeUnsubscribe: RuntimeUnsubscribe | null = null;
  /** Stops a handshake that is still in progress without settling it. */
  private stopStarting: (() => void) | null = null;
  private platformBridgeUnsubscribe: RuntimeUnsubscribe | null = null;
  private readonly listeners: ListenerMap = {
    state: new Set(),
    error: new Set(),
    bootstrap: new Set(),
    stats: new Set(),
    permissionsUpdated: new Set(),
    profilePublication: new Set(),
    botEvent: new Set(),
  };

  on<K extends keyof RuntimeEvents>(
    event: K,
    listener: (value: RuntimeEvents[K]) => void,
  ) {
    this.listeners[event].add(listener as never);
    return () => this.listeners[event].delete(listener as never);
  }

  async start() {
    this.disconnect();
    this.setState("signaling");
    const session = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    await new Promise<void>((resolve, reject) => {
      let settled = false;
      let retry: ReturnType<typeof setInterval> | null = null;
      const stopRetry = () => {
        if (retry) clearInterval(retry);
        retry = null;
      };
      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        stopRetry();
        if (error) reject(error);
        else resolve();
      };
      // A replaced runtime must not keep retrying or time out into an error.
      this.stopStarting = () => {
        settled = true;
        clearTimeout(timeout);
        stopRetry();
      };
      const timeout = setTimeout(() => {
        this.setState("error");
        finish(new Error("The local Node runtime did not start in time."));
      }, LOCAL_START_TIMEOUT_MS);
      this.bridgeUnsubscribe = this.bridge.on((message) => {
        if (message.kind === "node-error") {
          if (message.source === "worker:exit" && message.exitCode === 1) {
            return;
          }
          const error = new Error(message.message);
          error.name = `EmbeddedNode:${message.source}`;
          if (message.stack) error.stack = message.stack;
          console.error("[LocalJNbotRuntime] embedded Node error", message);
          Sentry.captureException(error, {
            tags: {
              runtime: "embedded-node",
              source: message.source,
            },
            extra: {
              script: message.script,
              instanceId: message.instanceId,
              exitCode: message.exitCode,
            },
          });
        }
        if (message.kind === "assigned") {
          stopRetry();
          this.assignMessenger(message.address as Address);
        }
        if (message.kind === "frame") {
          this.transport.receive(message.frame);
        }
        if (message.kind === "fatal") {
          console.error("[LocalJNbotRuntime] backend fatal", {
            code: message.code,
            message: message.message,
          });
          this.setState("error");
          finish(
            Object.assign(new Error(message.message), { code: message.code }),
          );
        }
        if (message.kind === "ready") {
          this.setState("connected");
          finish();
        }
      });
      try {
        // Android initializes and extracts the embedded Node project on a
        // background thread. Messages sent before rn-bridge is listening are
        // not queued by nodejs-mobile-react-native, so repeat the idempotent
        // handshake until the backend acknowledges it.
        retry = setInterval(
          () => void Promise.resolve(this.bridge.signalStart(session)).catch(() => undefined),
          LOCAL_START_RETRY_MS,
        );
        void Promise.resolve(this.bridge.start(session)).catch((error) => finish(error instanceof Error ? error : new Error(String(error))));
      } catch (error) {
        console.error("[LocalJNbotRuntime] native start threw", error);
        this.setState("error");
        finish(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  async connect() {
    return this.start();
  }
  disconnect() {
    this.stopStarting?.();
    this.stopStarting = null;
    this.profileSubscription?.();
    this.profileSubscription = null;
    this.platformBridgeUnsubscribe?.();
    this.platformBridgeUnsubscribe = null;
    this.bridgeUnsubscribe?.();
    this.bridgeUnsubscribe = null;
    this.messenger?.close();
    this.messenger = null;
    this.bootstrap = null;
    this.address = null;
    if (this.state !== "idle") this.setState("disconnected");
  }
  reconnect() {
    if (this.state !== "connected")
      void this.start().catch((error) =>
        this.emit("error", {
          message: error instanceof Error ? error.message : String(error),
        }),
      );
    else this.bridge.health();
  }

  private assignMessenger(address: Address) {
    // Start handshakes are retried while Node initializes, so the backend may
    // repeat its assignment. Replacing the messenger here would leave two
    // receivers consuming the same response frames.
    if (this.messenger && this.address === address) return;

    this.profileSubscription?.();
    this.profileSubscription = null;
    this.platformBridgeUnsubscribe?.();
    this.platformBridgeUnsubscribe = null;
    void this.messenger?.close();
    this.bootstrap = null;
    this.address = address;
    this.messenger = new Messenger(address, this.transport);
    this.platformBridgeUnsubscribe = MobilePlatformBridge.bindMessenger(this.messenger);
    this.messenger.sub("remote:bootstrap", address, (bootstrap) => {
      this.bootstrap = bootstrap as RemoteBootstrap;
      this.emit("bootstrap", this.bootstrap);
    });
    this.messenger.sub("permissions:updated", address, () =>
      this.emit("permissionsUpdated", undefined),
    );
  }

  async getBootstrap(forceRefresh = false): Promise<RemoteBootstrap> {
    if (!forceRefresh && this.bootstrap) return this.bootstrap;
    if (this.messenger) {
      try {
        const bootstrap = await this.messenger.request<RemoteBootstrap>(
          "client:action",
          BACKEND,
          { event: "GET_BOOTSTRAP" },
          { timeoutMs: 10_000 },
        );
        if (bootstrap?.jndata?.serverList) {
          this.bootstrap = bootstrap;
          return bootstrap;
        }
      } catch {}
    }

    return new Promise<RemoteBootstrap>((resolve, reject) => {
      let settled = false;
      const finish = (error?: Error, bootstrap?: RemoteBootstrap) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        offBootstrap();
        offState();
        if (error) reject(error);
        else resolve(bootstrap!);
      };

      const offBootstrap = this.on("bootstrap", (bootstrap) =>
        finish(undefined, bootstrap),
      );
      const offState = this.on("state", (state) => {
        if (state === "error" || state === "disconnected")
          finish(new Error("Local backend closed before profiles loaded."));
      });
      const timeout = setTimeout(
        () => finish(new Error("Timed out loading local profiles.")),
        LOCAL_START_TIMEOUT_MS,
      );
    });
  }
  getRuntimeSummaries() {
    return this.requireMessenger().request<ProfileRuntimeSummary[]>(
      "profiles:runtime-summaries",
      BACKEND,
    );
  }
  async selectProfile(profileKey: string): Promise<RuntimeProfile> {
    const messenger = this.requireMessenger();
    this.profileSubscription?.();
    const enabled = await messenger.request<{
      profileId: number;
      profileKey: string;
    }>("profile:enable", BACKEND, { profileKey });
    this.profileSubscription = messenger.subscribeProfile(
      enabled.profileId,
      (publication) => this.emit("profilePublication", publication),
    );
    const snapshot = await messenger.request<any>("profile:snapshot", BACKEND, {
      profileId: enabled.profileId,
    });
    return { profileId: enabled.profileId, key: enabled.profileKey, snapshot };
  }
  createProfile(input: CreateProfileInput) {
    return this.requireMessenger().request<CreateProfileResult>(
      "client:action",
      BACKEND,
      { event: "CREATE_CUSTOM_PROFILE", data: input },
    );
  }
  serverStatus(host: string, port: number) {
    return this.requireMessenger().request<ServerStatus>(
      "client:action",
      BACKEND,
      { event: "PING_MINECRAFT_SERVER", data: { host, port } },
    );
  }
  deleteProfile(profileKey: string) {
    return this.requireMessenger().request<DeleteProfileResult>(
      "client:action",
      BACKEND,
      { event: "DELETE_PROFILE", data: { profileKey } },
    );
  }
  importSyncedProfiles(packages: SyncedProfilePackage[]) {
    return this.requireMessenger().request<SyncedProfileInstallResult>(
      "client:action",
      BACKEND,
      { event: "IMPORT_SYNCED_PROFILES", data: { packages } },
    );
  }
  async importFullInstance(input: InstanceImportInput): Promise<InstanceImportResult> {
    const messenger = this.requireMessenger();
    if (input.type === "cloud") {
      const res = await messenger.request<{ success?: boolean; error?: string }>(
        "client:action",
        BACKEND,
        {
          event: "CLOUD_STORAGE_IMPORT",
          data: { userId: input.userId.trim(), password: input.password.trim() },
        },
        { timeoutMs: 120_000 },
      );
      if (res && res.success === false) {
        throw new Error(res.error || "Failed to import from JNbot Cloud.");
      }
    } else {
      const res = await messenger.request<{ success?: boolean; error?: string }>(
        "client:action",
        BACKEND,
        {
          event: "IMPORT_SETTINGS",
          data: { fileContent: input.fileContent, password: input.password },
        },
        { timeoutMs: 120_000 },
      );
      if (res && res.success === false) {
        throw new Error(res.error || "Failed to import backup file.");
      }
    }
    const bootstrap = await messenger.request<RemoteBootstrap>(
      "client:action",
      BACKEND,
      { event: "GET_BOOTSTRAP" },
    );
    this.bootstrap = bootstrap;
    this.emit("bootstrap", bootstrap);
    return { success: true, bootstrap };
  }
  async beginInstanceTransfer(manifest: InstanceTransferManifest) {
    await this.requireMessenger().request(
      "client:action", BACKEND,
      { event: "MOBILE_INSTANCE_TRANSFER_BEGIN", data: manifest },
      { timeoutMs: 10_000 },
    );
  }
  async appendInstanceTransfer(chunk: InstanceTransferChunk) {
    await this.requireMessenger().request(
      "client:action", BACKEND,
      { event: "MOBILE_INSTANCE_TRANSFER_APPEND", data: chunk },
      { timeoutMs: 10_000 },
    );
  }
  async finishInstanceTransfer(): Promise<InstanceImportResult> {
    const messenger = this.requireMessenger();
    const result = await messenger.request<{ success?: boolean; error?: string }>(
      "client:action", BACKEND,
      { event: "MOBILE_INSTANCE_TRANSFER_FINISH" },
      { timeoutMs: 120_000 },
    );
    if (result?.success === false)
      throw new Error(result.error || "Failed to import directly from desktop.");
    const bootstrap = await messenger.request<RemoteBootstrap>(
      "client:action", BACKEND, { event: "GET_BOOTSTRAP" },
    );
    this.bootstrap = bootstrap;
    this.emit("bootstrap", bootstrap);
    return { success: true, bootstrap };
  }
  cancelInstanceTransfer() {
    return this.requireMessenger().request(
      "client:action", BACKEND,
      { event: "MOBILE_INSTANCE_TRANSFER_CANCEL" },
      { timeoutMs: 10_000 },
    );
  }
  /** The phone's own backend has no AI provider, so nothing streams. */
  subscribeLlmStream() {
    return () => {};
  }
  llmAction<T = unknown>(event: string, data?: unknown): Promise<T> {
    return this.requireMessenger().request<T>("client:action", BACKEND, { event, data }, llmRequestOptions(event));
  }
  invoke<T = unknown>(channel: string, data?: unknown) {
    return this.requireMessenger().request<T>("client:invoke", BACKEND, { channel, data });
  }
  profileAction<T = unknown>(profileId: number, event: string, data?: unknown) {
    return this.requireMessenger().request<T>(
      "client:profile-action",
      BACKEND,
      { profileId, event, data },
      llmRequestOptions(event),
    );
  }
  async getInstalledPlugins() {
    const result = await this.requireMessenger().request<any>(
      "client:action",
      BACKEND,
      { event: "GET_MACROS" },
    );
    return Array.isArray(result) ? result : result?.macros ?? [];
  }
  updatePluginMetadata(metadata: PluginMetadata): Promise<PluginMetadata> {
    return this.requireMessenger().request("client:action", BACKEND, {
      event: "UPDATE_PLUGIN_METADATA",
      data: metadata,
    });
  }
  savePluginCode(pluginId: string, code: string): Promise<unknown> {
    return this.requireMessenger().request("client:action", BACKEND, {
      event: "SAVE_MACRO",
      data: { pluginId, code: { code } },
    });
  }
  async getPublicPlugins() {
    const result = await this.requireMessenger().request<any>(
      "client:action",
      BACKEND,
      { event: "GET_PUBLIC_MACROS" },
    );
    return result?.macros ?? [];
  }
  async exportPortablePlugin(pluginId: string): Promise<PortablePluginPackage> {
    return this.requireMessenger().request("client:action", BACKEND, {
      event: "EXPORT_PORTABLE_PLUGIN",
      data: { pluginId },
    });
  }
  async previewPluginImports(
    packages: (PortablePluginPackage | string)[],
  ): Promise<PluginImportPreview[]> {
    return this.requireMessenger().request("client:action", BACKEND, {
      event: "PREVIEW_PORTABLE_PLUGINS",
      data: { packages },
    });
  }
  async importPortablePlugins(
    packages: (PortablePluginPackage | string)[],
    decisions: PluginImportDecision[],
  ): Promise<PluginImportResult> {
    return this.requireMessenger().request("client:action", BACKEND, {
      event: "IMPORT_PORTABLE_PLUGINS",
      data: { packages, decisions },
    });
  }
  async shareAction<T>(event: ShareAction, data: unknown): Promise<T> {
    const result = await this.requireMessenger().request<
      { status?: string; data?: T; message?: string; identity?: { fingerprint?: string } }
    >("client:action", BACKEND, { event, data });
    if (result?.status === "publisher-name-required") {
      throw Object.assign(new Error(PUBLISHER_NAME_REQUIRED), { fingerprint: result.identity?.fingerprint });
    }
    if (result?.status === "error") throw new Error(result.message || "Share link request failed");
    // SHARE_* actions wrap their result in `data`; state and identity reads do not.
    return (result?.status === "success" && "data" in result ? result.data : result) as T;
  }
  getPluginDescriptor(
    profileId: number,
    plugin: MacroInfo,
    source: "installed" | "profile" = "installed",
  ) {
    return this.profileAction<PluginRunDescriptor>(
      profileId,
      "RESOLVE_PLUGIN_RUN_DESCRIPTOR",
      { plugin, source },
    );
  }
  subscribeBot(
    bot: ActiveBot,
    event: import("./types").BotEvent,
    listener: (data: unknown) => void,
  ) {
    if (!this.messenger) return () => {};
    const address = this.botAddress(bot);
    if (!address) return () => {};
    const options =
      event === "inventory" ? { throttle: 150, ignorePrevious: true } : undefined;
    return this.messenger.sub(
      event,
      address,
      (data) => {
        for (const packet of Array.isArray(data) ? data : [data]) {
          listener(packet);
          this.emit("botEvent", { botId: bot.botId, event, data: packet });
        }
      },
      options,
    );
  }
  async botAction<T = unknown>(
    bot: ActiveBot,
    action: string,
    data: unknown[] = [],
    returnValue = false,
  ): Promise<T | undefined> {
    const address = this.botAddress(bot);
    if (!address) throw new Error("This bot is no longer available.");
    if (!this.messenger) throw new Error("Local backend is not ready.");
    if (returnValue)
      return this.messenger.request<T>("BOT_ACTION", address, {
        action,
        data,
      });
    this.messenger.send("BOT_ACTION", address, { action, data });
    return undefined;
  }
  botAddress(bot: ActiveBot): Address | null {
    return typeof bot.MESSAGE_ADDRESS === "number"
      ? (bot.MESSAGE_ADDRESS as Address)
      : null;
  }
  sendToAddress(event: string, address: Address, data?: unknown) {
    if (!this.messenger) {
      console.warn("[LocalJNbotRuntime] Cannot send to address, messenger is not ready.");
      return;
    }
    this.messenger.send(event, address, data);
  }
  startScript(profileId: number, payload: StartScriptPayload) {
    return this.requireMessenger().request(
      "client:profile-action",
      BACKEND,
      { profileId, event: "START_SCRIPT", data: payload },
      { timeoutMs: 35_000 },
    );
  }
  upsertAlt(
    profileId: number,
    input: { alt: AltWithData; originalUsername?: string },
  ) {
    return this.profileAction<AltWithData[]>(profileId, "ALT_UPSERT", input);
  }
  deleteAlt(profileId: number, username: string) {
    return this.profileAction<AltWithData[]>(profileId, "ALT_DELETE", {
      username,
    });
  }
  private requireMessenger() {
    if (!this.messenger) throw new Error("Local backend is not ready.");
    return this.messenger;
  }
  private setState(state: RuntimeConnectionState) {
    this.state = state;
    this.emit("state", state);
  }
  private emit<K extends keyof RuntimeEvents>(
    event: K,
    value: RuntimeEvents[K],
  ) {
    for (const listener of this.listeners[event]) listener(value as never);
  }
}
