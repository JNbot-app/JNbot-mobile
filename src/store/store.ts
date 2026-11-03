import {
  remoteAccessCapabilities,
  type RemoteAccessCapabilities,
  type RemoteCapability,
} from "../generated/client-contract/clientPermissions";
import { create } from "zustand";
import type {
  ActiveActionsType,
  ActiveBot,
  ActiveBotsType,
  ActiveScript,
  ActiveScriptsType,
  Alt,
  AltWithData,
  BotInfoPacket,
  BotMovementPacket,
  AppNotification,
  AppSettings,
  JNbotServerStatus,
  JNdata,
  MacroInfo,
  SettingsObj,
} from "./types";
import type {
  PluginRunDescriptor,
  ProfileMeta,
  ProfileRuntimeSummary,
} from "../runtime/types";
import type { ProfilePublication } from "../generated/client-contract/messaging/Protocol";
import type { ProfileSnapshot } from "../generated/client-contract/mobileClientContract";
import type {
  AltUpdateRequestPayload,
  ConsoleLogEntry,
  NotificationPayload,
  MicrosoftDeviceCodePayload,
  MobileActivityStats,
  OptionErrorPayload,
  ScriptButtonPopupPayload,
  ScriptDialogPayload,
  ScriptPromptPayload,
  SettingsPatch,
  SnackbarPayload,
} from "../generated/client-contract/mobileClientContract";
import { dashboardStats, type DashboardStats } from "../features/dashboardStats";
import type { Stats } from "./types";
import type { PluginMetadata } from "../features/plugins/folders";
import { toChatLine, type ChatLine } from "../features/chat";
import { Themes, applyTheme, getTheme, subscribeTheme } from "../theme/theme";

export type NormalizedLog = {
  id: string;
  message: string;
  level: 0 | 1 | 2 | 3;
  scriptName: string;
  scriptId: string;
  timestamp: number;
};

export type ToastMessage = {
  id: string;
  title: string;
  type: "success" | "error" | "warning" | "info";
};

export type ScriptUiRequest =
  | { kind: "prompt"; id: string; profileId: number; data: ScriptPromptPayload }
  | { kind: "dialog"; id: string; profileId: number; data: ScriptDialogPayload }
  | { kind: "buttons"; id: string; profileId: number; data: ScriptButtonPopupPayload }
  | { kind: "alt-update"; id: string; profileId: number; data: AltUpdateRequestPayload };

/**
 * Central app state. Mirrors the relevant slices of the desktop renderer's
 * zustand store. Inbound host events feed it (see hooks/useMessager.ts);
 * components subscribe with narrow selectors to avoid extra re-renders.
 */
export interface AppState {
  // connection
  connectionState: string;
  connectedAt: number | null;
  lastError: string | null;

  // permission-filtered remote bootstrap
  profiles: ProfileMeta[];
  runtimeSummaries: Record<string, ProfileRuntimeSummary>;
  capabilities: string[];
  remotePermissionMask: number | null;
  remoteCapabilities: RemoteAccessCapabilities | null;
  activeProfileKey: string | null;
  activeProfileId: number | null;
  profileGeneration: number;
  profileReady: boolean;

  // live data from host
  activeBots: ActiveBotsType;
  activeScripts: ActiveScriptsType;
  activeScriptActions: ActiveActionsType;
  alts: AltWithData[];
  sharedAlts: Alt[];
  pluginMetadata: PluginMetadata;
  settings: SettingsObj;
  appSettings: AppSettings;
  JNdata: JNdata | null;
  devices: JNbotServerStatus;
  stats: DashboardStats;
  macros: { loaded: boolean; list: MacroInfo[]; market: MacroInfo[] | null };
  notifications: AppNotification[];
  unread: number;
  logs: NormalizedLog[];
  toasts: ToastMessage[];
  uiRequests: ScriptUiRequest[];
  optionErrors: Record<string, Record<string, string>>;
  pluginDescriptors: Record<string, PluginRunDescriptor>;
  microsoftLogin: (MicrosoftDeviceCodePayload & { receivedAt: number }) | null;
  botChats: Record<number, ChatLine[]>;
  botInventories: Record<number, any>;
  botInfo: Record<number, BotInfoPacket>;
  botMovement: Record<number, BotMovementPacket>;
  theme: Themes;
}

export function applySettingsPatchToObj(
  settings: SettingsObj,
  patch: SettingsPatch,
): SettingsObj {
  if (!patch?.path || patch.path.length === 0) return settings;
  const clone = { ...settings };
  let current: any = clone;
  for (let i = 0; i < patch.path.length - 1; i++) {
    const key = patch.path[i];
    current[key] =
      current[key] && typeof current[key] === "object" && !Array.isArray(current[key])
        ? { ...current[key] }
        : {};
    current = current[key];
  }
  const lastKey = patch.path[patch.path.length - 1];
  if (patch.remove) delete current[lastKey];
  else current[lastKey] = patch.value;
  return clone;
}

export function applySettingsPatchesToObj(
  settings: SettingsObj,
  patches: SettingsPatch | SettingsPatch[],
): SettingsObj {
  const patchArray = Array.isArray(patches) ? patches : [patches];
  return patchArray.reduce(
    (acc, patch) => applySettingsPatchToObj(acc, patch),
    settings,
  );
}

const initialSettings: SettingsObj = {
  scripts: { gamemode: undefined },
  reminders: [],
  triggers: [],
  altTags: [],
  altData: {},
  version: 3,
};

const initialState: AppState = {
  connectionState: "idle",
  connectedAt: null,
  lastError: null,
  profiles: [],
  runtimeSummaries: {},
  capabilities: [],
  remotePermissionMask: null,
  remoteCapabilities: null,
  activeProfileKey: null,
  activeProfileId: null,
  profileGeneration: 0,
  profileReady: false,
  activeBots: [],
  activeScripts: {},
  activeScriptActions: {},
  alts: [],
  sharedAlts: [],
  pluginMetadata: {},
  settings: initialSettings,
  appSettings: {},
  JNdata: null,
  devices: { devices: [], peer2peer: { status: false } },
  stats: dashboardStats({ botsJoined: 0, scriptsStarted: 0, onlineTime: 0 }),
  macros: { loaded: false, list: [], market: null },
  notifications: [],
  unread: 0,
  logs: [],
  toasts: [],
  uiRequests: [],
  optionErrors: {},
  pluginDescriptors: {},
  microsoftLogin: null,
  botChats: {},
  botInventories: {},
  botInfo: {},
  botMovement: {},
  theme: getTheme(),
};

export const useStore = create<AppState>()(() => initialState);

export const set = useStore.setState;
export const get = useStore.getState;

// Keep Zustand store synchronized with theme engine changes
subscribeTheme((theme) => {
  if (get().theme !== theme) {
    set({ theme });
  }
});

export const isConnectedWorkerBot = (
  bot: ActiveBotsType[number] | undefined,
): boolean =>
  !!bot &&
  bot.status === "connected" &&
  bot.origin !== "minecraft" &&
  typeof bot.MESSAGE_ADDRESS === "number";

export const isBotAssignedToScript = (
  bot: ActiveBot | undefined,
  script: ActiveScript | undefined | null,
): boolean => {
  if (!bot || !script) return false;
  if (bot.RUNTIME_SCRIPT_ID !== undefined && bot.RUNTIME_SCRIPT_ID !== null) {
    return bot.RUNTIME_SCRIPT_ID === script.instanceId;
  }
  if (bot.INSTANCE_ID) {
    return bot.INSTANCE_ID === String(script.instanceId);
  }
  return Boolean(bot.SCRIPT_ID && bot.SCRIPT_ID === script.scriptId);
};

/** Re-derive active-profile alts from shared identities + per-server altData. */
export const mergeAlts = (
  sharedAlts: Alt[],
  altData: SettingsObj["altData"] | undefined,
): AltWithData[] => {
  const data = altData ?? {};
  return sharedAlts
    .filter((alt) => alt?.username && data[alt.username])
    .map((alt) => ({ ...alt, data: data[alt.username]! }));
};

const scopedDefaults = () => ({
  activeProfileId: null,
  profileReady: false,
  settings: initialSettings,
  activeBots: [] as ActiveBotsType,
  activeScripts: {} as ActiveScriptsType,
  activeScriptActions: {} as ActiveActionsType,
  alts: [] as AltWithData[],
  botChats: {} as Record<number, ChatLine[]>,
  botInventories: {} as Record<number, any>,
  botInfo: {} as Record<number, BotInfoPacket>,
  botMovement: {} as Record<number, BotMovementPacket>,
  pluginDescriptors: {} as Record<string, PluginRunDescriptor>,
  microsoftLogin: null as AppState["microsoftLogin"],
  logs: [] as NormalizedLog[],
  toasts: [] as ToastMessage[],
  uiRequests: [] as ScriptUiRequest[],
  optionErrors: {} as Record<string, Record<string, string>>,
});

const withActiveBots = (state: AppState, activeBots: ActiveBotsType) => {
  const activeAddresses = new Map(activeBots.map((bot) => [bot.botId, bot.MESSAGE_ADDRESS]));
  const previousAddresses = new Map(state.activeBots.map((bot) => [bot.botId, bot.MESSAGE_ADDRESS]));
  const keep = <T>(records: Record<number, T>) =>
    Object.fromEntries(
      Object.entries(records).filter(([id]) =>
        activeAddresses.has(Number(id)) &&
        activeAddresses.get(Number(id)) === previousAddresses.get(Number(id)),
      ),
    ) as Record<number, T>;
  return {
    activeBots,
    botChats: keep(state.botChats),
    botInventories: keep(state.botInventories),
    botInfo: keep(state.botInfo),
    botMovement: keep(state.botMovement),
  };
};

const isSameInventory = (a: any, b: any): boolean => {
  if (a === b) return true;
  if (!a || !b) return false;
  if (
    a.selected !== b.selected ||
    a.selectedItem?.name !== b.selectedItem?.name ||
    a.selectedItem?.count !== b.selectedItem?.count ||
    a.selectedItem?.displayName !== b.selectedItem?.displayName ||
    a.selectedItem?.display?.name !== b.selectedItem?.display?.name ||
    a.title !== b.title ||
    a.inventoryStart !== b.inventoryStart ||
    a.isInventory !== b.isInventory
  ) {
    return false;
  }
  const itemsA = a.items;
  const itemsB = b.items;
  if (itemsA === itemsB) return true;
  if (!Array.isArray(itemsA) || !Array.isArray(itemsB) || itemsA.length !== itemsB.length)
    return false;
  for (let i = 0; i < itemsA.length; i++) {
    const itemA = itemsA[i];
    const itemB = itemsB[i];
    if (itemA === itemB) continue;
    if (!itemA || !itemB) return false;
    if (
      itemA.name !== itemB.name ||
      itemA.count !== itemB.count ||
      itemA.slot !== itemB.slot ||
      itemA.displayName !== itemB.displayName
    ) {
      return false;
    }
  }
  return true;
};

// ── Mutators (called by the messager when host events arrive) ────────────────

export const actions = {
  setConnectionState: (s: string) =>
    set((st) => ({
      connectionState: s,
      connectedAt:
        s === "connected" ? st.connectedAt ?? Date.now() : st.connectedAt,
    })),
  setLastError: (lastError: string | null) => set({ lastError }),
  setBootstrap: (input: {
    profiles: ProfileMeta[];
    JNdata: JNdata | null;
    sharedAlts: Alt[];
    pluginMetadata?: PluginMetadata;
    appSettings: AppSettings;
    capabilities?: string[];
    permissions?: {
      permissionMask: number;
      capabilities?: RemoteAccessCapabilities;
    };
  }) => {
    const permissionMask = input.permissions?.permissionMask;
    const remoteCaps =
      typeof permissionMask === "number"
        ? remoteAccessCapabilities(permissionMask)
        : null;
    return set({
      profiles: input.profiles,
      JNdata: input.JNdata,
      sharedAlts: input.sharedAlts,
      pluginMetadata: input.pluginMetadata ?? {},
      appSettings: input.appSettings,
      capabilities: input.capabilities ?? [],
      remotePermissionMask:
        typeof permissionMask === "number" ? permissionMask : null,
      remoteCapabilities: remoteCaps,
    });
  },
  setRuntimeSummaries: (summaries: ProfileRuntimeSummary[]) =>
    set({
      runtimeSummaries: Object.fromEntries(
        summaries.map((summary) => [summary.profileKey, summary]),
      ),
    }),
  beginProfileSelection: (key: string) =>
    set((st) => ({
      ...scopedDefaults(),
      activeProfileKey: key,
      profileGeneration: st.profileGeneration + 1,
    })),
  clearProfileSelection: () =>
    set((st) => ({
      ...scopedDefaults(),
      activeProfileKey: null,
      profileGeneration: st.profileGeneration + 1,
    })),
  applyProfileSnapshot: (
    generation: number,
    snapshot: ProfileSnapshot<
      SettingsObj,
      AppSettings,
      ActiveScriptsType,
      ActiveBotsType,
      ActiveActionsType,
      AltWithData[],
      MobileActivityStats
    >,
  ) =>
    set((st) =>
      generation !== st.profileGeneration
        ? st
        : {
          activeProfileId: snapshot.profileId,
          activeProfileKey: snapshot.profileKey,
          profileReady: true,
          settings: snapshot.settings,
          appSettings: {
            ...snapshot.appSettings,
            server: snapshot.profileKey,
          },
          alts: snapshot.alts && snapshot.alts.length > 0
            ? snapshot.alts
            : mergeAlts(st.sharedAlts, snapshot.settings.altData),
          activeScripts: snapshot.activeScripts,
          ...withActiveBots(st, snapshot.activeBots),
          activeScriptActions: snapshot.activeScriptActions,
          stats: snapshot.stats ? dashboardStats(snapshot.stats) : st.stats,
        },
    ),
  applyProfilePublication: (
    generation: number,
    publication: ProfilePublication,
  ) =>
    set((st) => {
      if (
        generation !== st.profileGeneration ||
        publication.profileId !== st.activeProfileId
      )
        return st;
      switch (publication.event) {
        case "settings": {
          const nextSettings = publication.data as SettingsObj;
          return {
            settings: nextSettings,
            alts: mergeAlts(st.sharedAlts, nextSettings.altData),
          };
        }
        case "appSettings":
          return {
            appSettings: {
              ...(publication.data as AppSettings),
              server: st.activeProfileKey ?? undefined,
            },
          };
        case "activeScripts":
          return { activeScripts: publication.data as ActiveScriptsType };
        case "activeBots":
          return withActiveBots(st, publication.data as ActiveBotsType);
        case "alts": {
          const alts = (publication.data as AltWithData[]) ?? [];
          const nextAltData = Object.fromEntries(alts.map((a) => [a.username, a.data]));
          const nextSharedAlts = [...st.sharedAlts];
          for (const alt of alts) {
            const idx = nextSharedAlts.findIndex(
              (a) => a.username.toLowerCase() === alt.username.toLowerCase(),
            );
            const base: Alt = {
              username: alt.username,
              UID: alt.UID,
              email: alt.email,
            };
            if (idx >= 0) nextSharedAlts[idx] = { ...nextSharedAlts[idx], ...base };
            else nextSharedAlts.push(base);
          }
          return {
            alts,
            settings: { ...st.settings, altData: nextAltData },
            sharedAlts: nextSharedAlts,
          };
        }
        case "ACTIVE_ACTION_SCRIPT":
          return { activeScriptActions: publication.data as ActiveActionsType };
        case "PROGRESS_UPDATE": {
          const data = publication.data as
            | Record<string | number, { current: number; total: number; eta?: number }>
            | { instanceId: number; progress: { current: number; total: number; eta?: number } };
          if (!data || typeof data !== "object") return st;
          const nextActiveScripts = { ...st.activeScripts };
          let changed = false;
          if ("instanceId" in data && "progress" in data) {
            const script = nextActiveScripts[String(data.instanceId)];
            if (script) {
              nextActiveScripts[String(data.instanceId)] = { ...script, progress: data.progress };
              changed = true;
            }
          } else {
            for (const [key, progress] of Object.entries(data)) {
              const script = nextActiveScripts[key];
              if (script && progress && typeof progress === "object") {
                nextActiveScripts[key] = {
                  ...script,
                  progress: progress as { current: number; total: number; eta?: number },
                };
                changed = true;
              }
            }
          }
          return changed ? { activeScripts: nextActiveScripts } : st;
        }
        case "SERVER_STATUS": {
          const data = publication.data as { ips?: string[] };
          if (!data?.ips || !st.JNdata || !st.activeProfileKey) return st;
          const profileSection = st.JNdata.data?.[st.activeProfileKey];
          if (!profileSection) return st;
          return {
            JNdata: {
              ...st.JNdata,
              data: {
                ...st.JNdata.data,
                [st.activeProfileKey]: {
                  ...profileSection,
                  ips: data.ips,
                },
              },
            },
          };
        }
        case "mobileActivity":
          return { stats: dashboardStats(publication.data as Stats | MobileActivityStats) };
        default:
          return st;
      }
    }),
  setActiveBots: (activeBots: ActiveBotsType) =>
    set((st) => withActiveBots(st, activeBots)),
  setActiveScripts: (activeScripts: ActiveScriptsType) =>
    set({ activeScripts }),
  setActiveScriptActions: (activeScriptActions: ActiveActionsType) =>
    set({ activeScriptActions }),
  setSettings: (settings: SettingsObj) =>
    set((st) => ({
      settings,
      alts: mergeAlts(st.sharedAlts, settings.altData),
    })),
  setAlts: (alts: AltWithData[]) =>
    set((st) => {
      const nextAltData = Object.fromEntries(alts.map((a) => [a.username, a.data]));
      const activeUsernames = new Set(alts.map((a) => a.username.toLowerCase()));
      const nextSharedAlts = [...st.sharedAlts];
      for (const alt of alts) {
        const idx = nextSharedAlts.findIndex(
          (a) => a.username.toLowerCase() === alt.username.toLowerCase(),
        );
        const base: Alt = {
          username: alt.username,
          UID: alt.UID,
          email: alt.email,
        };
        if (idx >= 0) nextSharedAlts[idx] = { ...nextSharedAlts[idx], ...base };
        else nextSharedAlts.push(base);
      }
      const updatedTags = (st.settings.altTags ?? []).map((tag) => ({
        ...tag,
        alts: tag.alts.filter((u) => activeUsernames.has(u.toLowerCase())),
      }));
      return {
        alts,
        settings: {
          ...st.settings,
          altData: nextAltData,
          altTags: updatedTags,
        },
        sharedAlts: nextSharedAlts,
      };
    }),
  setShared: (shared: { alts?: Alt[]; pluginMetadata?: PluginMetadata }) =>
    set((st) => {
      const sharedAlts = Array.isArray(shared.alts)
        ? shared.alts
        : st.sharedAlts;
      const alts = mergeAlts(sharedAlts, st.settings.altData);
      return {
        sharedAlts,
        alts,
        pluginMetadata: shared.pluginMetadata ?? st.pluginMetadata,
      };
    }),
  setPluginMetadata: (pluginMetadata: PluginMetadata) => set({ pluginMetadata }),
  setTheme: (theme: Themes) => {
    applyTheme(theme);
    set({ theme });
  },
  setAppSettings: (appSettings: AppSettings) => set({ appSettings }),
  setJNdata: (JNdata: JNdata) => set({ JNdata }),
  setDevices: (devices: JNbotServerStatus) => set({ devices }),
  setStats: (stats: Stats | MobileActivityStats) => set({ stats: dashboardStats(stats) }),
  setMacros: (list: MacroInfo[]) =>
    set((st) => ({ macros: { ...st.macros, loaded: true, list } })),
  setMarketMacros: (market: MacroInfo[]) =>
    set((st) => ({ macros: { ...st.macros, market } })),
  addNotification: (n: Omit<AppNotification, "id" | "timestamp">) =>
    set((st) => ({
      notifications: [
        {
          ...n,
          id: Math.random().toString(36).slice(2),
          timestamp: Date.now(),
        },
        ...st.notifications,
      ].slice(0, 100),
      unread: st.unread + 1,
    })),
  addHostNotification: (payload: NotificationPayload) => {
    if (!payload?.title) return;
    const type = normalizeSeverity(payload.type);
    actions.addNotification({
      title: payload.title,
      message: payload.message ?? "",
      type,
      buttons: payload.buttons,
    });
  },
  removeNotification: (id: string) =>
    set((st) => ({
      notifications: st.notifications.filter((item) => item.id !== id),
    })),
  clearNotifications: () => set({ notifications: [], unread: 0 }),
  setLogs: (entries: ConsoleLogEntry[]) =>
    set({ logs: normalizeLogs(Array.isArray(entries) ? entries.slice(-1000) : []) }),
  appendLogs: (entries: ConsoleLogEntry[]) =>
    set((st) => {
      const next = [
        ...st.logs,
        ...normalizeLogs(Array.isArray(entries) ? entries.slice(-1000) : []),
      ];
      const seen = new Set<string>();
      return {
        logs: next
          .filter((entry) => {
            if (seen.has(entry.id)) return false;
            seen.add(entry.id);
            return true;
          })
          .slice(-1000),
      };
    }),
  clearLogs: (scriptName?: string) =>
    set((st) => ({
      logs: scriptName
        ? st.logs.filter((entry) => entry.scriptName !== scriptName)
        : [],
    })),
  enqueueToast: (payload: SnackbarPayload | ToastMessage) => {
    const title = payload.title?.trim();
    if (!title) return;
    set((st) => ({
      toasts: [
        ...st.toasts,
        {
          id: "id" in payload ? payload.id : createId("toast"),
          title,
          type: normalizeSeverity(
            "type" in payload ? payload.type : payload.variant,
          ),
        },
      ].slice(-4),
    }));
  },
  dismissToast: (id: string) =>
    set((st) => ({ toasts: st.toasts.filter((item) => item.id !== id) })),
  enqueueUiRequest: (request: ScriptUiRequest) =>
    set((st) =>
      st.uiRequests.some(
        (item) => item.kind === request.kind && item.id === request.id,
      )
        ? st
        : { uiRequests: [...st.uiRequests, request] },
    ),
  dismissUiRequest: (kind: ScriptUiRequest["kind"], id: string) =>
    set((st) => ({
      uiRequests: st.uiRequests.filter(
        (item) => item.kind !== kind || item.id !== id,
      ),
    })),
  setOptionError: (payload: OptionErrorPayload) => {
    const key = payload.pluginId || payload.scriptName;
    if (!key || !payload.field || !payload.message) return false;
    if (get().optionErrors[key]?.[payload.field] === payload.message) return false;
    set((st) => ({
      optionErrors: {
        ...st.optionErrors,
        [key]: {
          ...(st.optionErrors[key] ?? {}),
          [payload.field]: payload.message,
        },
      },
    }));
    return true;
  },
  clearOptionError: (pluginId: string, field?: string) =>
    set((st) => {
      if (!st.optionErrors[pluginId] || (field && !(field in st.optionErrors[pluginId]))) return st;
      if (!field) {
        const next = { ...st.optionErrors };
        delete next[pluginId];
        return { optionErrors: next };
      }
      const fields = { ...(st.optionErrors[pluginId] ?? {}) };
      delete fields[field];
      if (Object.keys(fields).length === 0) {
        const next = { ...st.optionErrors };
        delete next[pluginId];
        return { optionErrors: next };
      }
      return {
        optionErrors: { ...st.optionErrors, [pluginId]: fields },
      };
    }),
  applySettingsPatches: (patches: SettingsPatch | SettingsPatch[]) =>
    set((st) => {
      const nextSettings = applySettingsPatchesToObj(st.settings, patches);
      const patchArray = Array.isArray(patches) ? patches : [patches];
      let nextDescriptors = st.pluginDescriptors;
      let altDataTouched = false;
      for (const patch of patchArray) {
        if (patch.path && patch.path[0] === "altData") {
          altDataTouched = true;
        }
        if (patch.path && patch.path[0] === "scripts" && patch.path.length === 3) {
          const pluginId = patch.path[1];
          const optionId = patch.path[2];
          const descriptor = nextDescriptors[pluginId];
          if (descriptor) {
            nextDescriptors = {
              ...nextDescriptors,
              [pluginId]: {
                ...descriptor,
                values: {
                  ...descriptor.values,
                  ...(patch.remove
                    ? Object.fromEntries(
                      Object.entries(descriptor.values).filter(([id]) => id !== optionId),
                    )
                    : { [optionId]: patch.value }),
                },
              },
            };
          }
        }
      }
      return {
        settings: nextSettings,
        pluginDescriptors: nextDescriptors,
        alts: altDataTouched ? mergeAlts(st.sharedAlts, nextSettings.altData) : st.alts,
      };
    }),
  updatePluginOption: (pluginId: string, optionId: string, value: unknown) =>
    actions.applySettingsPatches({
      path: ["scripts", pluginId, optionId],
      value,
    }),
  setPluginDescriptor: (descriptor: PluginRunDescriptor) =>
    set((st) => {
      const existingSettings = st.settings.scripts?.[descriptor.info.pluginId] ?? {};
      const mergedDescriptor = {
        ...descriptor,
        values: {
          ...descriptor.values,
          ...existingSettings,
        },
      };
      return {
        pluginDescriptors: {
          ...st.pluginDescriptors,
          [descriptor.info.pluginId]: mergedDescriptor,
        },
      };
    }),
  showMicrosoftLogin: (payload: MicrosoftDeviceCodePayload) =>
    set({ microsoftLogin: { ...payload, receivedAt: Date.now() } }),
  clearMicrosoftLogin: () => set({ microsoftLogin: null }),
  setBotChat: (botId: number, data: unknown) =>
    set((st) => {
      const previous = st.botChats[botId] ?? [];
      const payload = data as { messages?: unknown; message?: unknown };
      const next = Array.isArray(payload?.messages)
        ? payload.messages.map(toChatLine)
        : payload?.message !== undefined
          ? [...previous, toChatLine(payload)]
          : previous;
      return { botChats: { ...st.botChats, [botId]: next.slice(-80) } };
    }),
  setBotInventory: (botId: number, inventory: unknown) =>
    set((st) => {
      if (isSameInventory(st.botInventories[botId], inventory)) return st;
      return { botInventories: { ...st.botInventories, [botId]: inventory } };
    }),
  setBotInfo: (botId: number, info: BotInfoPacket) =>
    set((st) => ({ botInfo: { ...st.botInfo, [botId]: info } })),
  setBotMovement: (botId: number, movement: BotMovementPacket) =>
    set((st) => ({ botMovement: { ...st.botMovement, [botId]: movement } })),
  clearUnread: () => set({ unread: 0 }),
  reset: () => set(initialState),
};

const createId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const normalizeSeverity = (
  value: unknown,
): "success" | "error" | "warning" | "info" =>
  value === "success" || value === "error" || value === "warning"
    ? value
    : "info";

function logMessageId(timestamp: number, scriptId: string, level: number, text: string): string {
  let first = 2166136261;
  let second = 2654435761;
  for (let index = 0; index < text.length; index++) {
    const char = text.charCodeAt(index);
    first = Math.imul(first ^ char, 16777619);
    second = Math.imul(second ^ char, 2246822507);
  }
  return `${timestamp}:${scriptId}:${level}:${text.length}:${first >>> 0}:${second >>> 0}`;
}

export const normalizeLogs = (entries: ConsoleLogEntry[]): NormalizedLog[] => {
  const occurrences = new Map<string, number>();
  return (Array.isArray(entries) ? entries : []).flatMap((entry) => {
    if (!Array.isArray(entry)) return [];
    const [message, rawLevel, scriptName, scriptId, rawTimestamp] = entry;
    const text = typeof message === "string" ? message : JSON.stringify(message);
    const timestamp = Number(rawTimestamp) || Date.now();
    const level =
      rawLevel === 1 || rawLevel === 2 || rawLevel === 3 ? rawLevel : 0;
    const messageId = logMessageId(timestamp, String(scriptId), level, text);
    const occurrence = occurrences.get(messageId) ?? 0;
    occurrences.set(messageId, occurrence + 1);
    return [
      {
        id: `${messageId}:${occurrence}`,
        message: text,
        level,
        scriptName: String(scriptName ?? ""),
        scriptId: String(scriptId ?? ""),
        timestamp,
      },
    ];
  });
};

export default useStore;

export const selectProfileReady = (state: AppState) =>
  state.profileReady && state.activeProfileId !== null;
export const selectConnectedBots = (state: AppState) =>
  state.activeBots.filter(isConnectedWorkerBot);
export const selectConnectedBotById = (botId: number) => (state: AppState) => {
  const bot = state.activeBots.find((candidate) => candidate.botId === botId);
  return isConnectedWorkerBot(bot) ? bot : null;
};

export const selectRemotePermissionMask = (state: AppState): number | null =>
  state.remotePermissionMask;
export const selectCanUseActiveBots = (state: AppState): boolean =>
  state.remoteCapabilities?.canUseActiveBots ?? true;
export const selectCanUsePlugins = (state: AppState): boolean =>
  state.remoteCapabilities?.canUsePlugins ?? true;
export const selectCanUseAccounts = (state: AppState): boolean =>
  state.remoteCapabilities?.canUseAccounts ?? true;
export const selectCanUseScripts = (state: AppState): boolean =>
  state.remoteCapabilities?.canUseScripts ?? true;
export const selectCanChangeGlobalSettings = (state: AppState): boolean =>
  state.remoteCapabilities?.canChangeGlobalSettings ?? true;
export const selectCanManageProfiles = (state: AppState): boolean =>
  state.remoteCapabilities?.canManageProfiles ?? true;
export const selectCanManageAccess = (state: AppState): boolean =>
  state.remoteCapabilities?.canManageAccess ?? true;
export const selectCanUseHostTools = (state: AppState): boolean =>
  state.remoteCapabilities?.canUseHostTools ?? true;
export const selectCanUseCapability = (capability: RemoteCapability) =>
  (state: AppState): boolean =>
    state.remoteCapabilities?.can(capability) ?? true;
