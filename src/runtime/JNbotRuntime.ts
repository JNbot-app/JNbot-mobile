import type { LlmStreamMessage } from "../generated/client-contract/llm";
import type { ActiveBot, AltWithData, MacroInfo } from "../store/types";
import type { PluginMetadata } from "../features/plugins/folders";
import type { Address } from "../generated/client-contract/messaging/Address";
import type {
  PairingCredentials,
  PluginRunDescriptor,
  ProfileRuntimeSummary,
  RemoteBootstrap,
  RuntimeConnectionState,
  RuntimeEvents,
  RuntimeProfile,
  CreateProfileInput,
  CreateProfileResult,
  DeleteProfileResult,
  StartScriptPayload,
  SyncedProfileInstallResult,
  SyncedProfilePackage,
  InstanceImportInput,
  InstanceImportResult,
  PortablePluginPackage,
  PluginImportPreview,
  PluginImportDecision,
  PluginImportResult,
  BotEvent,
} from "./types";

export type RuntimeUnsubscribe = () => void;

export type ServerStatus = { version?: string; online?: number; max?: number; favicon?: string };

/** Error message when signing needs a publisher name first; the error carries `fingerprint`. */
export const PUBLISHER_NAME_REQUIRED = "PUBLISHER_NAME_REQUIRED";

export type ShareAction =
  | "SHARE_STATE"
  | "SHARE_CHECK_UPDATES"
  | "SHARE_CREATE"
  | "SHARE_HAS_CHANGES"
  | "SHARE_UPDATE"
  | "SHARE_DELETE"
  | "SHARE_PREVIEW"
  | "SHARE_INSTALL"
  | "SHARE_VISIBILITY"
  | "SHARE_MARKET"
  | "SHARE_REPORT"
  | "GET_PUBLISHER_IDENTITY"
  | "SET_PUBLISHER_NAME";

export interface JNbotRuntime {
  readonly state: RuntimeConnectionState;
  /** Starts the already-configured runtime target. */
  start(): Promise<void>;
  connect(credentials?: PairingCredentials): Promise<void>;
  disconnect(): void;
  reconnect(): void;
  on<K extends keyof RuntimeEvents>(
    event: K,
    listener: (value: RuntimeEvents[K]) => void,
  ): RuntimeUnsubscribe;
  getBootstrap(forceRefresh?: boolean): Promise<RemoteBootstrap>;
  getRuntimeSummaries(): Promise<ProfileRuntimeSummary[]>;
  selectProfile(profileKey: string): Promise<RuntimeProfile>;
  createProfile(input: CreateProfileInput): Promise<CreateProfileResult>;
  /** Pings a Minecraft server from the phone runtime; null where profiles can't be created. */
  serverStatus(host: string, port: number): Promise<ServerStatus | null>;
  deleteProfile(profileKey: string): Promise<DeleteProfileResult>;
  importSyncedProfiles(
    packages: SyncedProfilePackage[],
  ): Promise<SyncedProfileInstallResult>;
  importFullInstance(
    input: InstanceImportInput,
  ): Promise<InstanceImportResult>;
  profileAction<T = unknown>(
    profileId: number,
    event: string,
    data?: unknown,
  ): Promise<T>;
  /** Calls a backend `ipcMain` handle (the desktop renderer's `ipcRenderer.invoke`). */
  invoke<T = unknown>(channel: string, data?: unknown): Promise<T>;
  /** An optional-AI request (`LLM_*`); the phone's own runtime reports AI as not set up. */
  llmAction<T = unknown>(event: string, data?: unknown): Promise<T>;
  /** Live progress of AI requests this client made with a `streamId`. */
  subscribeLlmStream(listener: (message: LlmStreamMessage) => void): RuntimeUnsubscribe;
  getInstalledPlugins(): Promise<MacroInfo[]>;
  updatePluginMetadata(metadata: PluginMetadata): Promise<PluginMetadata>;
  savePluginCode(pluginId: string, code: string): Promise<unknown>;
  getPublicPlugins(): Promise<MacroInfo[]>;
  exportPortablePlugin(pluginId: string): Promise<PortablePluginPackage>;
  previewPluginImports(
    packages: (PortablePluginPackage | string)[],
  ): Promise<PluginImportPreview[]>;
  importPortablePlugins(
    packages: (PortablePluginPackage | string)[],
    decisions: PluginImportDecision[],
  ): Promise<PluginImportResult>;
  /** Share links (create, manage, install) run on this phone's own backend. */
  shareAction<T>(event: ShareAction, data: unknown): Promise<T>;
  getPluginDescriptor(
    profileId: number,
    plugin: MacroInfo,
    source?: "installed" | "profile",
  ): Promise<PluginRunDescriptor>;
  subscribeBot(
    bot: ActiveBot,
    event: BotEvent,
    listener: (data: unknown) => void,
  ): RuntimeUnsubscribe;
  botAction<T = unknown>(
    bot: ActiveBot,
    action: string,
    data?: unknown[],
    returnValue?: boolean,
  ): Promise<T | undefined>;
  botAddress(bot: ActiveBot): Address | null;
  sendToAddress(event: string, address: Address, data?: unknown): void;
  startScript(profileId: number, payload: StartScriptPayload): Promise<unknown>;
  upsertAlt(
    profileId: number,
    input: { alt: AltWithData; originalUsername?: string },
  ): Promise<AltWithData[]>;
  deleteAlt(profileId: number, username: string): Promise<AltWithData[]>;
}
