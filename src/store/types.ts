// Subset of the desktop app's domain types (app/src/main/src/types.d.ts),
// trimmed to what the mobile UI consumes. Kept structurally compatible so the
// same host payloads deserialize cleanly.

export interface BotInfo {
  botId: number;
  username: string;
  script: string;
  id: string;
  version: string;
  uuid: string | undefined;
  UID?: string;
  host: string;
  port: number;
  status: 'queued' | 'joining' | 'connected' | 'failed';
  joinAt?: number;
  paused: boolean;
  origin?: 'worker' | 'minecraft';
  MESSAGE_ADDRESS?: number;
  RUNTIME_PROFILE_ID?: number;
  RUNTIME_SCRIPT_ID?: number;
}

export type ActiveBot = {
  SCRIPT_NAME: string;
  SCRIPT_ID: string;
  INSTANCE_ID: string;
} & BotInfo;

export type ActiveBotsType = ActiveBot[];

export type ActiveScript = {
  name: string;
  scriptId: string;
  instanceId: number;
  controls?: number;
  origin?: 'worker' | 'minecraft';
  progress?: { current: number; total: number; eta?: number };
  minecraft?: {
    instanceId: string;
    requestedVersion?: string;
    stage?: string;
    status?: string;
    pid?: number;
    clientId?: string;
  };
};

export type ActiveScriptsType = Record<string, ActiveScript>;

export type ActiveScriptAction = {
  actionId?: string;
  id?: string;
  action?: string;
  name?: string;
  scriptId?: string;
  pluginId?: string;
  scriptInstance?: string;
  description?: string;
};

export type ActiveActionsType = Record<string, ActiveScriptAction[]>;

export type ServerAltInfo = {
  premium?: boolean;
  password?: string;
  gkits: { [gamemode: string]: string[] };
  ranks: { [gamemode: string]: string };
};

export interface Alt {
  username: string;
  UID?: string | null;
  email?: string;
}

export type AltWithData = Alt & { data: ServerAltInfo };

export type BotInfoPacket = {
  username?: string;
  position?: { x: number; y: number; z: number };
  gamemode?: string;
  hunger?: number;
  health?: number;
  xp?: number;
  level?: number;
  uuid?: string;
  ping?: number;
};

export type BotMovementPacket = {
  forward: boolean;
  back: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
  sprint: boolean;
  sneak: boolean;
  fly: boolean;
  isPathfinding: boolean;
  yaw: number;
  pitch: number;
};

export interface AltTag {
  id: string;
  name: string;
  color: string;
  alts: string[];
}

export type { ChainNext, ChainOptions, ChainStep } from '../generated/client-contract/chains';
import type { ChainOptions, ChainStep } from '../generated/client-contract/chains';

export type Chain = {
  id: string;
  chains: ChainStep[];
  name?: string;
  /** Legacy nested settings are migrated to the flat scripts[id] slot on open. */
  options?: Partial<ChainOptions> & {
    startWith?: string;
    endsWith?: string;
    ignoreNoRanks?: boolean;
    ignoreNoGkits?: boolean;
  };
};

export type ScriptActionInfo = Pick<MacroInfo, "name" | "pluginId"> & {
  description?: string;
  profile?: true;
};

export type { Reminder as Cooldown } from '../generated/client-contract/cooldowns';
import type { Reminder as Cooldown } from '../generated/client-contract/cooldowns';
import type { Trigger } from '../generated/client-contract/triggers';
import type {
  MobileActivityStats,
  NotificationButton,
  ProfilePluginReference,
} from '../generated/client-contract/mobileClientContract';

export type Reminder = Cooldown;

export interface SettingsObj {
  scripts: { gamemode?: string; chains?: Record<string, Chain> } & Record<string, any>;
  pluginData?: Record<string, { pinned: boolean }>;
  reminders: Cooldown[];
  cooldowns?: Cooldown[];
  triggers: Trigger[];
  altTags: AltTag[];
  altData: Record<string, ServerAltInfo>;
  version: number;
}

export type MacroScriptType = 'script' | 'action' | 'profileUi' | 'botExtension';

export type MacroCode = { code: string } | Record<string, any>;

export type MacroLanguage = 'js' | 'ts' | 'components' | 'recording';

export interface MacroInfo {
  /** Profile-resolved descriptors may expose a script id in addition to pluginId. */
  id?: string;
  name: string;
  description: string;
  pluginId: string;
  editedAt: number | null;
  createdAt: number;
  public: boolean;
  /** Older/profile-provided plugin metadata may omit the language. */
  language?: MacroLanguage;
  downloads?: number;
  scriptType: MacroScriptType;
  folder?: string;
  banner?: string;
  trust?: 'author' | 'verified' | 'trusted' | 'unverified';
  profile?: boolean;
  config?: any;
  security?: {
    publisherName?: string;
    signature?: {
      publisherName?: string;
      signedAt?: number;
      fingerprint?: string;
    };
    fingerprint?: string;
    status?: string;
    importSource?: {
      ownerId?: string;
    };
  };
  theme?: {
    primaryColor?: string;
    [k: string]: any;
  };
}

export interface DeviceObj {
  name: string;
  id: string;
  token: string;
  trusted: boolean;
  status: number; // 0 = CONNECTED, 1 = CONNECTING, 2 = DISCONNECTED
  server: string | null;
}

export type JNbotServerStatus = {
  devices: DeviceObj[];
  peer2peer: {
    status: boolean;
    url?: string;
    room?: string;
  };
};

export interface JNdataDataSection {
  gamemodes: string[];
  kitGamemodes: string[];
  defaultGamemode: string;
  defaultIp: string;
  defaultPort: number;
  ips: string[];
  name: string;
  shortName: string;
  id: string;
  color: string;
  icon: string | null;
  onlineMode?: boolean;
  scripts?: ProfilePluginReference[];
  /** Profile UI plugin reference; rendered on the account screen. */
  profileUiAction?: unknown;
  disallowedPlugins?: string[];
}

export interface JNdata {
  version: number;
  serverList: string[];
  servers: Record<string, any>;
  data: Record<string, JNdataDataSection>;
  versions: string[];
  fullVersions: any[];
}

export interface Stats {
  alts: Record<
    string,
    {
      joinCount: number;
      lastJoined: number | null;
      playTime: number;
      createdOn: number;
    }
  >;
  scripts: Record<
    string,
    { activeCount: number; lastActive: number | null; runTime: number }
  >;
  history?: MobileActivityStats['history'];
  [serverId: string]: any;
}

export type AppSettings = Partial<{
  server: string;
  ip: string;
  port: number;
  theme: string;
  worker_optimize_for_size: boolean;
  [k: string]: unknown;
}>;

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: number;
  type: 'success' | 'error' | 'warning' | 'info';
  buttons?: NotificationButton[];
}
