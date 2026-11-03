import type { RemoteCapability } from "../generated/client-contract/clientPermissions";
import { AppState, type AppStateStatus, type NativeEventSubscription } from "react-native";
import type { ActiveBot, AltWithData, MacroInfo, ScriptActionInfo } from "../store/types";
import { chainPluginId } from "../generated/client-contract/chains";
import { actions, get, selectProfileReady } from "../store/store";
import type { JNbotRuntime } from "../runtime/JNbotRuntime";
import type {
  CreateProfileInput,
  AppSettingsPatch,
  CreateProfileResult,
  PluginRunDescriptor,
  ProfileRuntimeSummary,
  RuntimeProfile,
  StartScriptPayload,
  SyncedProfilePackage,
  BotEvent,
} from "../runtime/types";
import type { ProfilePublication } from "../generated/client-contract/messaging/Protocol";
import type {
  AltUpdateRequestPayload,
  BotAction,
  ConsoleSnapshot,
  SettingsPatch,
} from "../generated/client-contract/mobileClientContract";
import type { Address } from "../generated/client-contract/messaging/Address";
import type { ProfileUiRunResponse } from "../features/profileUi";

import type { ImportEntry } from "../features/alts/importTypes";
import type { PluginMetadata } from "../features/plugins/folders";
import { isRecordingDocument } from "../features/plugins/recording";
import { convertImportEntryToAlt } from "../features/alts/importParsers";
import { accountAuthenticationError, isOnlineMode } from "../features/serverAuthentication";
import { normalizePluginRunDescriptor } from "../features/plugins/descriptor";

type BotSubscriptionRecord = {
  bot: ActiveBot;
  event: BotEvent;
  listener: (data: unknown) => void;
  activeUnsubscribe: (() => void) | null;
};

const INITIAL_BOT_ACTIONS: Partial<Record<BotEvent, BotAction>> = {
  chat: "chatPacket",
  inventory: "sendInventoryPacket",
  "movement-state": "movementPacket",
  info: "infoPacket",
};

/**
 * The only API feature screens use to communicate with a JNbot runtime.
 * Local and remote runtimes share this facade, so state and command behavior
 * cannot drift with the transport implementation.
 */
export class JNbotClient {
  can(capability: RemoteCapability): boolean {
    return get().remoteCapabilities?.can(capability) ?? true;
  }

  get permissions() {
    const store = get();
    return {
      mask: store.remotePermissionMask,
      capabilities: store.remoteCapabilities,
      can: (capability: RemoteCapability) =>
        store.remoteCapabilities?.can(capability) ?? true,
    };
  }

  private readonly botSubscriptions = new Set<BotSubscriptionRecord>();
  private appStateSubscription: NativeEventSubscription | null = null;
  private isAppActive =
    AppState.currentState !== "background" && AppState.currentState !== "inactive";

  constructor(readonly runtime: JNbotRuntime) { }

  private ensureAppStateListener() {
    if (this.appStateSubscription) return;
    this.appStateSubscription = AppState.addEventListener(
      "change",
      (nextState: AppStateStatus) => {
        const active = nextState === "active";
        if (this.isAppActive === active) return;
        this.isAppActive = active;

        if (!active) {
          for (const sub of this.botSubscriptions) {
            if (sub.activeUnsubscribe) {
              sub.activeUnsubscribe();
              sub.activeUnsubscribe = null;
            }
          }
        } else {
          for (const sub of this.botSubscriptions) {
            if (!sub.activeUnsubscribe) this.activateBotSubscription(sub);
          }
        }
      },
    );
  }

  private activateBotSubscription(record: BotSubscriptionRecord) {
    let receivedPublication = false;
    const unsubscribe = this.runtime.subscribeBot(
      record.bot,
      record.event,
      (data) => {
        receivedPublication = true;
        record.listener(data);
      },
    );
    record.activeUnsubscribe = unsubscribe;
    const action = INITIAL_BOT_ACTIONS[record.event];
    if (!action) return;
    if (record.event === "inventory") {
      void this.botAction(record.bot, action, undefined, true)
        .then((packet) => {
          if (!receivedPublication && record.activeUnsubscribe === unsubscribe && this.botSubscriptions.has(record) && packet && typeof packet === "object") {
            actions.setBotInventory(record.bot.botId, packet);
            record.listener(packet);
          }
        })
        .catch(() => undefined);
    } else {
      void this.botAction(record.bot, action).catch(() => undefined);
    }
  }

  get isProfileReady() {
    return selectProfileReady(get());
  }

  get profileId(): number {
    const id = get().activeProfileId;
    if (id === null || !selectProfileReady(get()))
      throw new Error("Choose a profile before using JNbot.");
    return id;
  }

  async selectProfile(profileKey: string): Promise<RuntimeProfile> {
    actions.beginProfileSelection(profileKey);
    const generation = get().profileGeneration;
    const result = await this.runtime.selectProfile(profileKey);
    if (get().profileGeneration !== generation) return result;
    actions.applyProfileSnapshot(
      generation,
      result.snapshot as Parameters<typeof actions.applyProfileSnapshot>[1],
    );
    return result;
  }

  applyProfilePublication(publication: ProfilePublication) {
    actions.applyProfilePublication(get().profileGeneration, publication);
  }

  getRuntimeSummaries(): Promise<ProfileRuntimeSummary[]> {
    return this.runtime.getRuntimeSummaries();
  }

  createProfile(input: CreateProfileInput): Promise<CreateProfileResult> {
    return this.runtime.createProfile(input);
  }

  profileAction<T = unknown>(event: string, data?: unknown): Promise<T> {
    return this.runtime.profileAction<T>(this.profileId, event, data);
  }

  exportPortableProfile(): Promise<SyncedProfilePackage> {
    return this.profileAction("EXPORT_PORTABLE_PROFILE");
  }

  async updateSettings(patches: SettingsPatch | SettingsPatch[]) {
    actions.applySettingsPatches(patches);
    return this.profileAction<boolean>("SETTINGS_UPDATE", patches);
  }

  async updateAppSettings(patches: AppSettingsPatch[]) {
    if (!patches.length) return get().appSettings;
    const current = get().appSettings;
    const updated = { ...current };
    for (const patch of patches) {
      (updated as Record<string, unknown>)[patch.key] = patch.value;
    }
    actions.setAppSettings(updated);
    return this.profileAction("APPSETTINGS_UPDATE", patches);
  }

  async startScript(payload: StartScriptPayload) {
    const result = await this.runtime.startScript(this.profileId, payload);
    if (result === false || result === null || (Array.isArray(result) && result.length === 0))
      throw new Error("The script could not be started by this runtime.");
    if (result && typeof result === "object" && !Array.isArray(result)) {
      const response = result as { status?: unknown; error?: unknown };
      if (response.status === "error" || typeof response.error === "string")
        throw new Error(
          typeof response.error === "string"
            ? response.error
            : "The script could not be started by this runtime.",
        );
    }
    return result;
  }

  stopScript(instanceId: number) {
    return this.profileAction("STOP", instanceId);
  }

  async getScriptActions(): Promise<ScriptActionInfo[]> {
    const result = await this.profileAction<unknown>("GET_SCRIPT_ACTIONS");
    if (!Array.isArray(result)) return [];
    return result.filter((action): action is ScriptActionInfo =>
      !!action &&
      typeof action === "object" &&
      typeof action.pluginId === "string" &&
      typeof action.name === "string" &&
      (action.description === undefined || typeof action.description === "string"),
    );
  }

  /** Chains run like plugins; the desktop reads the saved chain and settings. */
  startChain(chainId: string) {
    return this.startScript({
      script: "macro",
      arguments: { macroInfo: { pluginId: chainPluginId(chainId) } },
    });
  }

  stopChain(chainId: string) {
    return this.profileAction("STOP_ALL", chainPluginId(chainId));
  }

  restartScript(instanceId?: number) {
    return this.profileAction("RESTART_ALL", instanceId);
  }

  sendControl(instanceId: number, control: number) {
    return this.profileAction("SCRIPT_CONTROL", { instanceId, control });
  }

  async getPluginDescriptor(
    plugin: MacroInfo,
    source: "installed" | "profile" = "installed",
  ): Promise<PluginRunDescriptor> {
    const result = await this.runtime.getPluginDescriptor(
      this.profileId,
      plugin,
      source,
    );
    const descriptor = normalizePluginRunDescriptor(result, plugin);
    actions.setPluginDescriptor(descriptor);
    return descriptor;
  }

  async getProfileScriptDescriptor(
    profileScript: { id: string; fallback?: MacroInfo },
  ): Promise<PluginRunDescriptor> {
    const result = await this.profileAction<unknown>(
      "RESOLVE_PLUGIN_RUN_DESCRIPTOR",
      { profileScriptId: profileScript.id },
    );
    const fallback = profileScript.fallback ?? {
      pluginId: profileScript.id,
      name: profileScript.id,
      description: "",
      editedAt: null,
      createdAt: 0,
      public: false,
      scriptType: "script" as const,
    };
    const descriptor = normalizePluginRunDescriptor(result, fallback);
    actions.setPluginDescriptor(descriptor);
    return descriptor;
  }

  getLogs(): Promise<ConsoleSnapshot> {
    return this.profileAction("GET_LOGS");
  }

  clearLogs(scriptName?: string): Promise<unknown> {
    return this.profileAction("CLEAR_CONSOLE", scriptName);
  }

  sendToAddress(event: string, address: number, data?: unknown) {
    this.runtime.sendToAddress(event, address as Address, data);
  }

  getInstalledPlugins() {
    return this.runtime.getInstalledPlugins();
  }

  async updatePluginMetadata(metadata: PluginMetadata) {
    const saved = await this.runtime.updatePluginMetadata(metadata);
    actions.setPluginMetadata(saved);
    return saved;
  }

  async getPluginCode(pluginId: string) {
    const { bundle, revision } = await this.runtime.exportPortablePlugin(pluginId);
    if (bundle.info.language !== "js" && bundle.info.language !== "ts")
      throw new Error("Only JavaScript and TypeScript plugins can be reviewed.");
    const code = pluginSource(bundle.code);
    if (code === null) throw new Error("This plugin has no readable source code.");
    return { code, revision, language: bundle.info.language };
  }

  async getRecording(pluginId: string) {
    const { bundle } = await this.runtime.exportPortablePlugin(pluginId);
    if (bundle.info.language !== "recording" || !isRecordingDocument(bundle.code))
      throw new Error("This plugin is not an action recording.");
    return bundle.code;
  }

  async savePluginCode(pluginId: string, code: string, revision: string) {
    const current = await this.getPluginCode(pluginId);
    if (current.revision !== revision)
      throw new Error("This plugin changed since you opened it. Close and reopen the code before saving.");
    const result = await this.runtime.savePluginCode(pluginId, code);
    if (pluginSource(result) !== code)
      throw new Error("The runtime did not confirm the save. Your edits are still here.");
  }

  async deletePlugin(plugin: MacroInfo) {
    const result = await this.profileAction("DELETE_MACRO", plugin);
    actions.setMacros(get().macros.list.filter((item) => item.pluginId !== plugin.pluginId));
    return result;
  }

  getPublicPlugins() {
    return this.runtime.getPublicPlugins();
  }

  async upsertAlt(input: { alt: AltWithData; originalUsername?: string }) {
    const alts = await this.runtime.upsertAlt(this.profileId, input);
    actions.setAlts(alts);
    return alts;
  }

  async deleteAlt(username: string) {
    const alts = await this.runtime.deleteAlt(this.profileId, username);
    actions.setAlts(alts);
    return alts;
  }

  /** Runs the active profile's Profile UI plugin for `username`. */
  runProfileUi(username: string) {
    return this.runtime.invoke<ProfileUiRunResponse>("profile-ui-run", {
      server: get().activeProfileKey,
      username,
    });
  }

  getAltsForProfile(profileKey: string) {
    return this.profileAction<AltWithData[]>("ALTS_OF_PROFILE", { profileKey });
  }

  async importAltsFromProfile(sourceProfileKey: string, usernames: string[]) {
    const result = await this.profileAction<{
      added: number;
      updated: number;
      skipped: Array<{ username: string; reason: string }>;
      alts: AltWithData[];
    }>("IMPORT_ALTS_FROM_PROFILE", { sourceProfileKey, usernames });
    actions.setAlts(result.alts);
    return result;
  }

  async importAltEntries(
    entries: ImportEntry[],
    canImportRanksGkits = false,
  ) {
    let added = 0;
    let updated = 0;
    for (const entry of entries) {
      const username = entry.username.trim();
      const password = entry.password.trim();
      const onlineMode = isOnlineMode(
        get().JNdata?.data?.[get().activeProfileKey ?? ""],
      );
      if (!username || accountAuthenticationError({ ...entry, password }, onlineMode)) continue;
      const current = get().alts.find(
        (alt) => alt.username.toLowerCase() === username.toLowerCase(),
      );
      const targetAlt = convertImportEntryToAlt(
        entry,
        current,
        canImportRanksGkits,
      );
      await this.upsertAlt({
        alt: targetAlt,
        originalUsername: current?.username,
      });
      if (current) updated++;
      else added++;
    }
    return { added, updated, alts: get().alts };
  }

  async applyAltUpdates(updates: AltUpdateRequestPayload["updates"]) {
    for (const [requestedUsername, update] of Object.entries(updates)) {
      const current = get().alts.find(
        (alt) =>
          alt.username.toLowerCase() === requestedUsername.toLowerCase(),
      );
      if (update === null) {
        if (current) await this.deleteAlt(current.username);
        continue;
      }

      const ranks = { ...(current?.data?.ranks ?? {}) };
      for (const [gamemode, rank] of Object.entries(update.ranks ?? {})) {
        if (rank === null) delete ranks[gamemode];
        else ranks[gamemode] = rank;
      }
      const next: AltWithData = {
        ...(current ?? { username: requestedUsername }),
        username: current?.username ?? requestedUsername,
        data: {
          premium: current?.data?.premium,
          password: update.password ?? current?.data?.password,
          ranks,
          gkits: {
            ...(current?.data?.gkits ?? {}),
            ...(update.gkits ?? {}),
          },
        },
      };
      await this.upsertAlt({
        alt: next,
        originalUsername: current?.username,
      });
    }
    return get().alts;
  }

  async joinBot(username: string, version: string) {
    if (!this.isProfileReady)
      throw new Error("Choose a profile before joining a bot.");
    if (!this.can("scripts") || !get().capabilities.includes("scripts"))
      throw new Error("This connection cannot start scripts.");
    if (!this.can("accounts"))
      throw new Error("This connection does not have permission to use accounts.");
    const cleanUsername = username.trim();
    if (!cleanUsername) throw new Error("Choose a username.");
    if (!version) throw new Error("Choose a Minecraft version.");
    await this.updateSettings([
      { path: ["scripts", "chat", "username"], value: cleanUsername },
      { path: ["scripts", "chat", "version"], value: version },
    ]);
    return this.startScript({
      script: "chat",
      arguments: { username: cleanUsername, version },
    });
  }

  subscribeBot(
    bot: ActiveBot,
    event: BotEvent,
    listener: (data: unknown) => void,
  ) {
    this.ensureAppStateListener();

    const record: BotSubscriptionRecord = {
      bot,
      event,
      listener,
      activeUnsubscribe: null,
    };
    this.botSubscriptions.add(record);

    if (this.isAppActive) {
      this.activateBotSubscription(record);
    }

    return () => {
      if (record.activeUnsubscribe) {
        record.activeUnsubscribe();
        record.activeUnsubscribe = null;
      }
      this.botSubscriptions.delete(record);
      if (this.botSubscriptions.size === 0 && this.appStateSubscription) {
        this.appStateSubscription.remove();
        this.appStateSubscription = null;
      }
    };
  }

  destroy() {
    for (const sub of this.botSubscriptions) {
      if (sub.activeUnsubscribe) {
        sub.activeUnsubscribe();
        sub.activeUnsubscribe = null;
      }
    }
    this.botSubscriptions.clear();
    this.appStateSubscription?.remove();
    this.appStateSubscription = null;
  }

  botAction<T = unknown>(
    bot: ActiveBot,
    action: BotAction,
    data?: unknown[],
    returnValue = false,
  ): Promise<T | undefined> {
    return this.runtime.botAction<T>(bot, action, data, returnValue);
  }
}

function pluginSource(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "code" in value && typeof value.code === "string")
    return value.code;
  return null;
}
