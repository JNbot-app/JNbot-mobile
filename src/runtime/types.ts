import type { RemoteAccessCapabilities } from "../generated/client-contract/clientPermissions";
import type { Address } from "../generated/client-contract/messaging/Address";
import type { ProfilePublication } from "../generated/client-contract/messaging/Protocol";
export { REMOTE_PROTOCOL_VERSION } from "../generated/client-contract/mobileClientContract";
import type {
  ActiveBot,
  ActiveBotsType,
  ActiveScript,
  ActiveScriptsType,
  Alt,
  AltWithData,
  AppSettings,
  JNdata,
  MacroInfo,
  SettingsObj,
  Stats,
  JNdataDataSection,
} from "../store/types";
import type { PluginMetadata } from "../features/plugins/folders";
import type {
  AppSettingsPatch,
  MobileActivityStats,
  PluginImportDecision,
  PluginImportPreview as GenericPluginImportPreview,
  PluginImportResult,
  InstanceTransferChunk,
  InstanceTransferManifest,
  InstanceTransferRequestResult,
  PortablePluginPackage as GenericPortablePluginPackage,
  SyncedProfilePackage as GenericSyncedProfilePackage,
} from "../generated/client-contract/mobileClientContract";

export type PairingCredentials = {
  room: string;
  deviceId: string;
  token: string;
};

/** Persisted runtime choice. Credentials remain in app storage and are never
 * copied into local-backend storage. */
export type RuntimeTarget =
  | { kind: "local" }
  | { kind: "remote"; credentials: PairingCredentials };

export type RuntimeConnectionState =
  | "idle"
  | "signaling"
  | "negotiating"
  | "synchronizing"
  | "connected"
  | "reconnecting"
  | "error"
  | "disconnected";

export type ProfileMeta = {
  id: string;
  name: string;
  shortName?: string;
  color?: string;
  icon?: string | null;
  custom?: boolean;
};

export type ActiveRuntimeMode = "local" | "remote";

export type SyncedProfileDefinition = {
  id: string;
  predefined: false;
  createdAt: number;
  updatedAt: number;
  data: JNdataDataSection;
  gamemodes: Record<string, unknown>;
  scriptBundles?: unknown[];
  remoteSource?: {
    ownerId: string;
    profileKey: string;
    revision: string;
  };
  [key: string]: unknown;
};

export type SyncedProfilePackage = GenericSyncedProfilePackage<
  SyncedProfileDefinition,
  SettingsObj,
  AppSettings,
  AltWithData[]
>;

export type SyncedProfileInstallResult = {
  installed: Array<{
    ownerId: string;
    sourceProfileKey: string;
    profileKey: string;
    revision: string;
  }>;
  failed: Array<{
    ownerId?: string;
    profileKey?: string;
    error: string;
  }>;
  bootstrap: RemoteBootstrap;
};

export type InstanceImportInput =
  | { type: 'cloud'; userId: string; password: string }
  | { type: 'file'; fileContent: string; password?: string };

export type InstanceImportResult = {
  success: boolean;
  error?: string;
  bootstrap: RemoteBootstrap;
};
export type { InstanceTransferChunk, InstanceTransferManifest, InstanceTransferRequestResult };

export type PortablePluginPackage = GenericPortablePluginPackage<
  MacroInfo,
  unknown,
  unknown
>;
export type PluginImportPreview = GenericPluginImportPreview<PortablePluginPackage>;
export type { PluginImportDecision, PluginImportResult };
export type { AppSettingsPatch };

export type ProfileRuntimeSummary = {
  profileKey: string;
  scripts: number;
  bots: number;
};

export type RemoteBootstrap = {
  protocolVersion?: number;
  capabilities?: string[];
  permissions?: {
    permissionMask: number;
    capabilities?: RemoteAccessCapabilities;
  };
  jndata: JNdata;
  profiles: Array<{
    id: string;
    data?: Partial<ProfileMeta>;
    remoteSource?: SyncedProfileDefinition["remoteSource"];
  }>;
  appSettings: AppSettings & { server?: string };
  shared: { alts?: Alt[]; pluginMetadata?: PluginMetadata };
  stats?: Stats;
};

export type ProfileSnapshot = {
  profileId: number;
  profileKey: string;
  settings: SettingsObj;
  appSettings: AppSettings;
  activeScripts: ActiveScriptsType;
  activeBots: ActiveBotsType;
  activeScriptActions: Record<string, unknown>;
  alts: AltWithData[];
  stats: MobileActivityStats;
  progress: Record<number, unknown>;
  serverStatus: { ips: string[] };
};

export type SerializableOption = {
  id: string;
  label: string;
  type: string;
  tooltip?: string;
  inputType?: "text" | "number" | "password";
  required?: boolean;
  placeholder?: string;
  defaultValue?: unknown;
  options?: Array<{ label: string; value: string | number }>;
  min?: number;
  max?: number;
  step?: number;
  marks?: Record<number, string>;
  clearable?: boolean;
  freeSolo?: boolean;
  multiple?: boolean;
  labelChecked?: string;
  labelUnchecked?: string;
  fields?: Array<{
    key: string;
    label: string;
    type:
      | "input"
      | "switch"
      | "slider"
      | "select"
      | "altSelect"
      | "altsSelect"
      | "tagsSelect";
    inputType?: "text" | "number" | "password";
    placeholder?: string;
    options?: Array<{ label: string; value: string | number }>;
    min?: number;
    max?: number;
    step?: number;
    defaultValue?: unknown;
  }>;
  minItems?: number;
  maxItems?: number;
  addLabel?: string;
  withDimension?: boolean;
  simple?: boolean;
  /** Values for this field are stored one level deeper, keyed by this field. */
  valueByFieldId?: string;
  supported?: boolean;
  unsupportedReason?: string;
};

export type PluginRunDescriptor = {
  info: MacroInfo;
  source: "installed" | "profile";
  allowed: boolean;
  blockedReason?: string;
  sections: Array<{
    id: string;
    name: string;
    description?: string;
    collapsed?: boolean;
    options: SerializableOption[];
  }>;
  values: Record<string, unknown>;
};

export type BotEvent =
  | "chat"
  | "inventory"
  | "info"
  | "movement-state"
  | "chunks"
  | "movement"
  | "force-move"
  | "map-entities"
  | "triggers";
export type BotMessage = { address: Address; bot: ActiveBot };

export type RuntimeEvents = {
  state: RuntimeConnectionState;
  error: { message: string; code?: string; retry?: boolean };
  bootstrap: RemoteBootstrap;
  stats: Stats;
  permissionsUpdated: undefined;
  profilePublication: ProfilePublication;
  botEvent: { botId: number; event: BotEvent; data: unknown };
};

export type StartScriptPayload = {
  script: string;
  arguments?: Record<string, unknown>;
  console?: string;
  scriptOptions?: Record<string, unknown>;
};

export type RuntimeAction =
  | "STOP"
  | "RESTART_ALL"
  | "SCRIPT_CONTROL"
  | "START_SCRIPT"
  | "SETTINGS_UPDATE"
  | "ALT_UPSERT"
  | "ALT_DELETE"
  | "RESOLVE_PLUGIN_RUN_DESCRIPTOR";

export type RuntimeBotAction = {
  bot: ActiveBot;
  action: string;
  data?: unknown[];
  returnValue?: boolean;
};

export type RuntimeProfile = {
  profileId: number;
  key: string;
  snapshot: ProfileSnapshot;
};

export type { CreateProfileInput } from "../generated/client-contract/mobileClientContract";

export type CreateProfileResult = {
  profileKey: string;
  bootstrap: RemoteBootstrap;
};

export type DeleteProfileResult = {
  bootstrap: RemoteBootstrap;
};

export type RuntimePlugin = MacroInfo;
export type RuntimeActiveScript = ActiveScript;
