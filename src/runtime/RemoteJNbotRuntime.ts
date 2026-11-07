import { io, type Socket } from "socket.io-client";
import type { RTCPeerConnection, RTCIceCandidate } from "react-native-webrtc";
import type { ActiveBot, AltWithData, MacroInfo, Stats } from "../store/types";
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
import type { JNbotRuntime, ServerStatus } from "./JNbotRuntime";
import {
  REMOTE_PROTOCOL_VERSION,
  type PairingCredentials,
  type CreateProfileInput,
  type CreateProfileResult,
  type DeleteProfileResult,
  type PluginRunDescriptor,
  type ProfileRuntimeSummary,
  type RemoteBootstrap,
  type RuntimeConnectionState,
  type RuntimeEvents,
  type RuntimeProfile,
  type StartScriptPayload,
  type SyncedProfileInstallResult,
  type SyncedProfilePackage,
  type InstanceImportInput,
  type InstanceImportResult,
  type PortablePluginPackage,
  type PluginImportPreview,
  type PluginImportDecision,
  type PluginImportResult,
  type InstanceTransferChunk,
  type InstanceTransferRequestResult,
} from "./types";
import type { PluginMetadata } from "../features/plugins/folders";

const SIGNAL_SERVER = "https://jnbot-signal-server.onrender.com";
const CONNECT_TIMEOUT_MS = 30_000;
const RECONNECT_MAX_DELAY_MS = 15_000;
const TURN_USERNAME = process.env.EXPO_PUBLIC_TURN_USERNAME;
const TURN_CREDENTIAL = process.env.EXPO_PUBLIC_TURN_CREDENTIAL;
const TURN_URLS = [
  "turn:standard.relay.metered.ca:80",
  "turn:standard.relay.metered.ca:80?transport=tcp",
  "turn:standard.relay.metered.ca:443",
  "turns:standard.relay.metered.ca:443?transport=tcp",
];
const ICE_SERVERS = [
  { urls: "stun:stun.relay.metered.ca:80" },
  { urls: "stun:stun1.l.google.com:19302" },
  ...(TURN_USERNAME && TURN_CREDENTIAL
    ? TURN_URLS.map((urls) => ({ urls, username: TURN_USERNAME, credential: TURN_CREDENTIAL }))
    : []),
];

type ListenerMap = {
  [K in keyof RuntimeEvents]: Set<(value: RuntimeEvents[K]) => void>;
};

type WebRTCNativeModule = {
  RTCPeerConnection: new (configuration?: unknown) => RTCPeerConnection;
  RTCIceCandidate: new (candidate: unknown) => RTCIceCandidate;
};

let nativeWebRTC: WebRTCNativeModule | null = null;

/**
 * Expo Go does not bundle react-native-webrtc. Keeping this require lazy lets
 * the pairing UI render there and surfaces a useful error only when a user
 * actually tries to start a native peer connection.
 */
function getNativeWebRTC(): WebRTCNativeModule {
  if (nativeWebRTC) return nativeWebRTC;
  try {
    nativeWebRTC = require("react-native-webrtc") as WebRTCNativeModule;
    return nativeWebRTC;
  } catch {
    throw new Error(
      "JNbot Mobile needs a development build because WebRTC is not included in Expo Go. Run npx expo run:ios or open an installed development build.",
    );
  }
}

class DataChannelTransport implements EndpointTransport {
  private readonly receivers = new Set<(frame: TransportFrame) => void>();

  constructor(
    private readonly sendRaw: (event: string, data: unknown) => void,
  ) {}

  send(frame: TransportFrame) {
    try {
      this.sendRaw("messenger:frame", frame);
    } catch (error) {
      console.warn("[DataChannelTransport] send failed", error);
    }
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

export class RemoteJNbotRuntime implements JNbotRuntime {
  private socket: Socket | null = null;
  private peer: RTCPeerConnection | null = null;
  private channel: any | null = null;
  private messenger: Messenger | null = null;
  private transport: DataChannelTransport | null = null;
  private credentials: PairingCredentials | null = null;
  private assignedAddress: Address | null = null;
  private connectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private stopped = false;
  private currentProfileId: number | null = null;
  private bootstrap: RemoteBootstrap | null = null;
  private profileSubscription: (() => void) | null = null;
  private remoteDescriptionSet = false;
  private pendingCandidates: unknown[] = [];
  private readonly listeners: ListenerMap = {
    state: new Set(),
    error: new Set(),
    bootstrap: new Set(),
    stats: new Set(),
    permissionsUpdated: new Set(),
    profilePublication: new Set(),
    botEvent: new Set(),
  };
  public state: RuntimeConnectionState = "idle";

  constructor(credentials?: PairingCredentials) {
    this.credentials = credentials ?? null;
  }

  on<K extends keyof RuntimeEvents>(
    event: K,
    listener: (value: RuntimeEvents[K]) => void,
  ) {
    this.listeners[event].add(listener as never);
    return () => this.listeners[event].delete(listener as never);
  }

  async start() {
    if (!this.credentials)
      throw new Error("Remote pairing credentials are missing.");
    await this.connect(this.credentials);
    try {
      await this.getBootstrap();
    } catch (error) {
      if (!this.stopped) this.queueReconnect();
      throw error;
    }
  }

  async connect(credentials?: PairingCredentials) {
    if (!credentials)
      throw new Error("Remote pairing credentials are missing.");
    // Validate native availability before persisting a partially connected
    // runtime or opening a signaling socket.
    getNativeWebRTC();
    this.disconnect();
    this.stopped = false;
    this.reconnectAttempts = 0;
    this.credentials = credentials;
    this.setState("signaling");
    await new Promise<void>((resolve, reject) => {
      const socket = io(SIGNAL_SERVER, {
        auth: { token: credentials.deviceId, type: 1, version: "1.0.0" },
        transports: ["websocket"],
        secure: true,
        reconnection: true,
        reconnectionDelay: 1_000,
        reconnectionDelayMax: 15_000,
      });
      this.socket = socket;
      const timeout = setTimeout(
        () => reject(new Error("Could not reach the JNbot signaling server.")),
        60_000,
      );
      socket.on("connect", () => {
        clearTimeout(timeout);
        this.setupSocketListeners();
        this.beginNegotiation();
        resolve();
      });
      socket.on("connect_error", (error) =>
        this.emit("error", {
          message: error.message || "Signaling connection failed",
          retry: true,
        }),
      );
      socket.on(
        "ERROR",
        (error: { error?: string; code?: string; retry?: boolean }) =>
          this.handleRemoteError(error),
      );
    });
  }

  disconnect() {
    this.stopped = true;
    if (this.connectTimer) clearTimeout(this.connectTimer);
    this.connectTimer = null;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.profileSubscription?.();
    this.profileSubscription = null;
    this.currentProfileId = null;
    this.bootstrap = null;
    this.remoteDescriptionSet = false;
    this.pendingCandidates = [];
    void this.messenger?.close();
    this.messenger = null;
    this.transport = null;
    this.assignedAddress = null;
    const channel = this.channel;
    const peer = this.peer;
    this.channel = null;
    this.peer = null;
    if (channel) {
      channel.onopen = null;
      channel.onclose = null;
      channel.onerror = null;
      channel.onmessage = null;
      try {
        channel.close();
      } catch {}
    }
    if (peer) {
      peer.onconnectionstatechange = null;
      peer.ondatachannel = null;
      peer.onicecandidate = null;
      peer.oniceconnectionstatechange = null;
      peer.onsignalingstatechange = null;
      try {
        peer.close();
      } catch {}
    }
    this.socket?.disconnect();
    this.socket = null;
    if (this.state !== "idle") this.setState("disconnected");
  }

  reconnect() {
    if (!this.credentials || this.stopped) return;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket?.connected) {
      this.beginNegotiation();
    } else if (this.socket) {
      this.socket.connect();
    } else {
      void this.connect(this.credentials).catch(() => undefined);
    }
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
        offError();
        if (error) reject(error);
        else resolve(bootstrap!);
      };
      const offBootstrap = this.on("bootstrap", (bootstrap) => finish(undefined, bootstrap));
      const offState = this.on("state", (state) => {
        if (state === "error" || state === "disconnected")
          finish(new Error("The peer connection closed before profiles loaded."));
      });
      const offError = this.on("error", (error) => {
        if (error.retry === false) finish(new Error(error.message));
      });
      const timeout = setTimeout(() => {
        finish(new Error("Timed out loading profiles."));
      }, 30_000);
    });
  }

  async getRuntimeSummaries(): Promise<ProfileRuntimeSummary[]> {
    return this.requireMessenger().request(
      "profiles:runtime-summaries",
      BACKEND,
    );
  }

  async selectProfile(profileKey: string): Promise<RuntimeProfile> {
    const messenger = this.requireMessenger();
    this.profileSubscription?.();
    this.profileSubscription = null;
    const enabled = await messenger.request<{
      profileId: number;
      profileKey: string;
    }>("profile:enable", BACKEND, { profileKey });
    this.currentProfileId = enabled.profileId;
    this.profileSubscription = messenger.subscribeProfile(
      enabled.profileId,
      (publication) => {
        this.emit("profilePublication", publication);
      },
    );
    const snapshot = await messenger.request<any>("profile:snapshot", BACKEND, {
      profileId: enabled.profileId,
    });
    return { profileId: enabled.profileId, key: enabled.profileKey, snapshot };
  }

  async createProfile(
    _input: CreateProfileInput,
  ): Promise<CreateProfileResult> {
    throw new Error(
      "Create profiles on this phone, not through a paired desktop connection.",
    );
  }

  async serverStatus(): Promise<ServerStatus | null> {
    return null;
  }

  async deleteProfile(_profileKey: string): Promise<DeleteProfileResult> {
    throw new Error("Profiles can only be removed on this phone.");
  }

  async importSyncedProfiles(
    _packages: SyncedProfilePackage[],
  ): Promise<SyncedProfileInstallResult> {
    throw new Error("Cached profiles can only be installed on this phone.");
  }

  async importFullInstance(
    _input: InstanceImportInput,
  ): Promise<InstanceImportResult> {
    throw new Error("JNbot instance imports can only be performed on this phone.");
  }

  async requestInstanceTransfer(requestId: string): Promise<InstanceTransferRequestResult> {
    return this.requestTransferAction('REQUEST_INSTANCE_TRANSFER', {
      requestId,
    }, 125_000);
  }

  readInstanceTransferChunk(transferId: string, index: number): Promise<InstanceTransferChunk> {
    return this.requestTransferAction('READ_INSTANCE_TRANSFER_CHUNK', {
      transferId,
      index,
    }, 10_000);
  }

  completeInstanceTransfer(transferId: string) {
    return this.requestTransferAction('COMPLETE_INSTANCE_TRANSFER', { transferId }, 10_000);
  }

  cancelInstanceTransfer(transferId: string) {
    return this.requestTransferAction('CANCEL_INSTANCE_TRANSFER', { transferId }, 10_000);
  }

  private async requestTransferAction<T>(event: string, data: unknown, timeoutMs: number): Promise<T> {
    try {
      return await this.requireMessenger().request<T>('client:action', BACKEND, {
        event,
        data,
      }, { timeoutMs });
    } catch (error) {
      if (!(error instanceof Error) || error.message !== 'Messenger is closed') throw error;
      await this.reconnectTransferMessenger();
      return this.requireMessenger().request<T>('client:action', BACKEND, {
        event,
        data,
      }, { timeoutMs });
    }
  }

  private reconnectTransferMessenger(): Promise<void> {
    this.reconnect();
    return new Promise((resolve, reject) => {
      let offState = () => {};
      let timeout: ReturnType<typeof setTimeout> | null = null;
      const finish = (error?: Error) => {
        if (timeout) clearTimeout(timeout);
        offState();
        if (error) reject(error);
        else resolve();
      };
      timeout = setTimeout(() => finish(new Error('Timed out reconnecting to desktop.')), CONNECT_TIMEOUT_MS);
      offState = this.on('state', (state) => {
        if (state === 'connected') finish();
        if (state === 'error') finish(new Error('The desktop connection could not be restored.'));
      });
    });
  }

  async profileAction<T = unknown>(
    profileId: number,
    event: string,
    data?: unknown,
  ): Promise<T> {
    return this.requireMessenger().request(
      "client:profile-action",
      BACKEND,
      { profileId, event, data },
      llmRequestOptions(event),
    );
  }

  llmAction<T = unknown>(event: string, data?: unknown): Promise<T> {
    return this.requireMessenger().request<T>("client:action", BACKEND, { event, data }, llmRequestOptions(event));
  }
  invoke<T = unknown>(channel: string, data?: unknown): Promise<T> {
    return this.requireMessenger().request("client:invoke", BACKEND, { channel, data });
  }

  async getInstalledPlugins(): Promise<MacroInfo[]> {
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
  async savePluginCode(_pluginId: string, _code: string): Promise<never> {
    throw new Error("Desktop plugins can only be edited on the desktop.");
  }

  async getPublicPlugins(): Promise<MacroInfo[]> {
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
    _packages: (PortablePluginPackage | string)[],
  ): Promise<PluginImportPreview[]> {
    throw new Error("Plugin imports can only be reviewed on this phone.");
  }

  async importPortablePlugins(
    _packages: (PortablePluginPackage | string)[],
    _decisions: PluginImportDecision[],
  ): Promise<PluginImportResult> {
    throw new Error("Plugins can only be installed on this phone.");
  }

  async shareAction<T>(): Promise<T> {
    throw new Error("Share links work with plugins and profiles on this phone.");
  }

  getPluginDescriptor(
    profileId: number,
    plugin: MacroInfo,
    source: "installed" | "profile" = "installed",
  ): Promise<PluginRunDescriptor> {
    return this.profileAction(profileId, "RESOLVE_PLUGIN_RUN_DESCRIPTOR", {
      plugin,
      source,
    });
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
        // BotMessenger batches publications (even when there is just one) so a
        // subscriber receives `[packet]`. Expose each packet to the app; the
        // stores expect a chat/inventory/info packet rather than that wrapper.
        const packets = Array.isArray(data) ? data : [data];
        for (const packet of packets) {
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
    if (!this.messenger) throw new Error("Peer connection is not ready.");
    const payload = { action, data };
    if (returnValue)
      return this.messenger.request<T>("BOT_ACTION", address, payload);
    this.messenger.send("BOT_ACTION", address, payload);
    return undefined;
  }

  botAddress(bot: ActiveBot): Address | null {
    return typeof bot.MESSAGE_ADDRESS === "number"
      ? (bot.MESSAGE_ADDRESS as Address)
      : null;
  }

  sendToAddress(event: string, address: Address, data?: unknown) {
    if (!this.messenger) {
      console.warn("[RemoteJNbotRuntime] Cannot send to address, messenger is not ready.");
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

  private setupSocketListeners() {
    const socket = this.socket;
    if (!socket) return;
    socket.off("OFFER");
    socket.on(
      "OFFER",
      (
        data: { accepted: boolean; offer: string },
        ack?: (response: unknown) => void,
      ) => {
        this.handleOffer(data, ack).catch((error) => {
          if (typeof ack === "function") {
            try {
              ack({
                error: error instanceof Error ? error.message : String(error),
                retry: true,
              });
            } catch {}
          }
          this.handleRemoteError({
            error: "Peer negotiation failed",
            retry: true,
          });
        });
      },
    );
    socket.off("ICE_CANDIDATE");
    socket.on("ICE_CANDIDATE", (data: { candidate: any | null }) => {
      if (!data?.candidate || !this.peer) return;
      if (!this.remoteDescriptionSet) {
        this.pendingCandidates.push(data.candidate);
        return;
      }
      try {
        this.peer
          .addIceCandidate(
            new (getNativeWebRTC().RTCIceCandidate)(data.candidate),
          )
          .catch(() => undefined);
      } catch (error) {
        console.warn("[RemoteJNbotRuntime] addIceCandidate failed", error);
      }
    });
    socket.on("disconnect", () => {
      if (this.stopped) return;
      this.setState("reconnecting");
    });
  }

  private beginNegotiation() {
    const socket = this.socket;
    const credentials = this.credentials;
    if (!socket || !credentials || this.stopped) return;
    // A healthy channel must never be replaced by a delayed reconnect timer.
    if (this.state === "connected" && this.channel?.readyState === "open")
      return;
    if (this.connectTimer) clearTimeout(this.connectTimer);
    this.connectTimer = null;

    this.profileSubscription?.();
    this.profileSubscription = null;
    this.bootstrap = null;
    void this.messenger?.close();
    this.messenger = null;
    this.transport = null;
    this.assignedAddress = null;

    // Closing the previous RTCPeerConnection fires its state-change callback
    // synchronously on iOS. Clear all callbacks first so that intentional replacement
    // cannot queue another reconnect or trigger native crashes on old peers.
    const previousPeer = this.peer;
    const previousChannel = this.channel;
    this.peer = null;
    this.channel = null;
    if (previousPeer) {
      previousPeer.onconnectionstatechange = null;
      previousPeer.ondatachannel = null;
      previousPeer.onicecandidate = null;
      previousPeer.oniceconnectionstatechange = null;
      previousPeer.onsignalingstatechange = null;
    }
    if (previousChannel) {
      previousChannel.onopen = null;
      previousChannel.onclose = null;
      previousChannel.onerror = null;
      previousChannel.onmessage = null;
    }
    try {
      previousChannel?.close();
    } catch {}
    try {
      previousPeer?.close();
    } catch {}

    this.setState("negotiating");
    const peer = new (getNativeWebRTC().RTCPeerConnection)({
      iceServers: ICE_SERVERS,
    });
    this.peer = peer;
    this.remoteDescriptionSet = false;
    this.pendingCandidates = [];
    peer.onicecandidate = ({ candidate }: { candidate: any }) => {
      if (peer !== this.peer || !this.socket?.connected) return;
      try {
        const json = candidate
          ? typeof candidate.toJSON === "function"
            ? candidate.toJSON()
            : candidate
          : null;
        socket.emit("ICE_CANDIDATE", {
          peerId: socket.id,
          candidate: json,
        });
      } catch (error) {
        console.warn("[RemoteJNbotRuntime] onicecandidate failed", error);
      }
    };
    peer.onconnectionstatechange = () => {
      if (peer !== this.peer || this.stopped) return;
      if (["failed", "disconnected", "closed"].includes(peer.connectionState))
        this.queueReconnect();
    };
    peer.oniceconnectionstatechange = () => {
      if (peer !== this.peer || this.stopped) return;
      if (["failed", "disconnected", "closed"].includes(peer.iceConnectionState))
        this.queueReconnect();
    };
    peer.ondatachannel = ({ channel }: { channel: any }) => {
      if (peer === this.peer) this.bindDataChannel(channel);
      else {
        try {
          channel.close();
        } catch {}
      }
    };
    this.connectTimer = setTimeout(() => {
      if (this.state !== "connected")
        this.handleRemoteError({
          error: "Peer connection timed out",
          code: "TIMEOUT",
          retry: true,
        });
    }, CONNECT_TIMEOUT_MS);
    socket.emit("JOIN_ROOM", {
      roomId: credentials.room,
      device: credentials.deviceId,
      password: credentials.token,
      peerId: socket.id,
      version: "1.0.0",
      client: {
        kind: "mobile",
        appVersion: "1.0.0",
        remoteProtocolVersion: REMOTE_PROTOCOL_VERSION,
      },
    });
  }

  private async handleOffer(
    data: { accepted: boolean; offer: string },
    ack?: (response: unknown) => void,
  ) {
    const peer = this.peer;
    const socket = this.socket;
    const credentials = this.credentials;
    if (!data?.accepted || !peer || !socket || !credentials || this.stopped) {
      if (typeof ack === "function") {
        try {
          ack({ accepted: true });
        } catch {}
      }
      return;
    }
    let parsedOffer: unknown;
    try {
      parsedOffer = typeof data.offer === "string" ? JSON.parse(data.offer) : data.offer;
    } catch {
      throw new Error("Invalid remote offer JSON");
    }
    await peer.setRemoteDescription(parsedOffer as any);
    if (this.peer !== peer || this.stopped) return;
    this.remoteDescriptionSet = true;
    const answer = await peer.createAnswer();
    if (this.peer !== peer || this.stopped) return;
    await peer.setLocalDescription(answer);
    if (this.peer !== peer || !this.socket || this.stopped) return;
    this.socket.emit("ANSWER", {
      answer: JSON.stringify(peer.localDescription),
      roomId: credentials.room,
      peerId: this.socket.id,
      deviceId: credentials.deviceId,
      password: credentials.token,
    });
    const candidates = this.pendingCandidates.splice(0);
    for (const candidate of candidates) {
      if (this.peer !== peer) break;
      await peer
        .addIceCandidate(new (getNativeWebRTC().RTCIceCandidate)(candidate))
        .catch(() => undefined);
    }
    if (typeof ack === "function") {
      try {
        ack({ accepted: true });
      } catch {}
    }
  }

  private bindDataChannel(channel: any) {
    this.channel = channel;
    channel.onopen = () => {
      if (channel !== this.channel) return;
      if (this.connectTimer) clearTimeout(this.connectTimer);
      this.connectTimer = null;
      if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
      this.reconnectAttempts = 0;
      this.setState("synchronizing");
    };
    channel.onclose = () => {
      if (channel === this.channel && !this.stopped) this.queueReconnect();
    };
    channel.onerror = () => {
      if (channel !== this.channel) return;
      this.emit("error", {
        message: "The peer data channel failed.",
        retry: true,
      });
      this.queueReconnect();
    };
    channel.onmessage = ({ data }: { data: unknown }) => this.receiveRaw(data);
  }

  private receiveRaw(raw: unknown) {
    if (typeof raw !== "string") return;
    try {
      const [event, data] = JSON.parse(raw) as [string, unknown];
      if (event === "messenger:assigned" && typeof data === "number") {
        this.assignedAddress = data as Address;
        void this.messenger?.close();
        this.transport = new DataChannelTransport((name, payload) =>
          this.sendRaw(name, payload),
        );
        this.messenger = new Messenger(this.assignedAddress, this.transport);
        if (this.currentProfileId !== null) {
          this.profileSubscription = this.messenger.subscribeProfile(
            this.currentProfileId,
            (publication) => {
              this.emit("profilePublication", publication);
            },
          );
        }
        this.messenger.sub(
          "remote:bootstrap",
          this.assignedAddress,
          (bootstrap) => {
            this.bootstrap = bootstrap as RemoteBootstrap;
            this.emit("bootstrap", this.bootstrap);
            this.setState("connected");
          },
        );
        this.messenger.sub("remote:stats", this.assignedAddress, (stats) =>
          this.emit("stats", stats as Stats),
        );
        this.messenger.sub("permissions:updated", this.assignedAddress, () =>
          this.emit("permissionsUpdated", undefined),
        );
        void this.messenger
          .request<RemoteBootstrap>("client:action", BACKEND, {
            event: "GET_BOOTSTRAP",
          })
          .then((bootstrap) => {
            if (this.bootstrap) return;
            if (!bootstrap?.jndata?.serverList) return;
            this.bootstrap = bootstrap;
            this.emit("bootstrap", bootstrap);
            this.setState("connected");
          })
          .catch(() => undefined);
        return;
      }
      if (event === "messenger:frame")
        this.transport?.receive(data as TransportFrame);
    } catch {
      this.emit("error", {
        message: "Received an invalid peer message.",
        retry: true,
      });
    }
  }

  private sendRaw(event: string, data: unknown) {
    if (this.channel?.readyState !== "open")
      throw new Error("Peer connection is not ready.");
    this.channel.send(JSON.stringify([event, data]));
  }

  private requireMessenger() {
    if (!this.messenger) throw new Error("Peer connection is not ready.");
    return this.messenger;
  }

  private handleRemoteError(error: {
    error?: string;
    code?: string;
    retry?: boolean;
  }) {
    const message = error.error ?? "JNbot connection failed.";
    this.emit("error", { message, code: error.code, retry: error.retry });
    if (error.retry === false) this.setState("error");
    else if (!this.stopped) this.queueReconnect();
  }

  private queueReconnect() {
    if (this.stopped || this.reconnectTimer) return;
    this.setState("reconnecting");
    const delay = Math.min(
      1_000 * 2 ** this.reconnectAttempts,
      RECONNECT_MAX_DELAY_MS,
    );
    this.reconnectAttempts += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.reconnect();
    }, delay);
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
