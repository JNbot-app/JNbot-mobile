import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState, AppStateStatus, Linking } from "react-native";
import { actions, get } from "../store/store";
import type { MacroInfo, Stats } from "../store/types";
import type { JNbotRuntime, ServerStatus, ShareAction } from "../runtime/JNbotRuntime";
import { RemoteJNbotRuntime } from "../runtime/RemoteJNbotRuntime";
import { LocalJNbotRuntime } from "../runtime/LocalJNbotRuntime";
import { importInstanceTransfer, type InstanceTransferStage } from "../runtime/instanceTransfer";
import { JNbotClient } from "../client/JNbotClient";
import { EmbeddedNodeBridge } from "../runtime/EmbeddedNodeBridge";
import {
  clearPairing,
  clearRuntimeTarget,
  loadRuntimeTarget,
  loadLocalSelectedProfile,
  loadSelectedProfile,
  parsePairingUrl,
  saveRuntimeTarget,
  saveSelectedProfile,
  saveLocalSelectedProfile,
} from "../runtime/pairing";
import type {
  CreateProfileInput,
  ActiveRuntimeMode,
  PairingCredentials,
  RemoteBootstrap,
  RuntimeConnectionState,
  RuntimeTarget,
  PortablePluginPackage,
  PluginImportPreview,
  PluginImportDecision,
  PluginImportResult,
  InstanceImportInput,
  InstanceImportResult,
} from "../runtime/types";
import type { ProfilePublication } from "../generated/client-contract/messaging/Protocol";
import type { ShareState } from "../generated/client-contract/share";
import { useShares } from "../features/shareStore";
import type {
  AltUpdateRequestPayload,
  BotKickedPayload,
  ConsoleLogEntry,
  NotificationPayload,
  MicrosoftDeviceCodePayload,
  OptionErrorPayload,
  ScriptButtonPopupPayload,
  ScriptDialogPayload,
  ScriptPromptPayload,
  SnackbarPayload,
} from "../generated/client-contract/mobileClientContract";

type ConnectionContextValue = {
  client: JNbotClient | null;
  status: RuntimeConnectionState;
  ready: boolean;
  hasTarget: boolean;
  target: RuntimeTarget | null;
  mode: ActiveRuntimeMode | null;
  lastError: string | null;
  connect: (credentials: PairingCredentials) => Promise<void>;
  connectFromUrl: (url: string) => Promise<void>;
  useLocal: () => Promise<void>;
  reconnect: () => void;
  disconnect: () => Promise<void>;
  selectProfile: (profileKey: string) => Promise<void>;
  /** Installs a profile share (e.g. an official server) and selects it. */
  installMarketplaceProfile: (shareId: string) => Promise<void>;
  switchToPhone: () => Promise<void>;
  createProfile: (input: CreateProfileInput) => Promise<void>;
  serverStatus: (host: string, port: number) => Promise<ServerStatus | null>;
  deleteProfile: (profileKey: string) => Promise<void>;
  previewPortablePlugins: (
    packages: (PortablePluginPackage | string)[],
  ) => Promise<PluginImportPreview[]>;
  importPortablePlugins: (
    packages: (PortablePluginPackage | string)[],
    decisions: PluginImportDecision[],
  ) => Promise<PluginImportResult>;
  /** Runs a share-link action on the phone runtime; installs refresh plugins and profiles. */
  shareAction: <T>(event: ShareAction, data: unknown) => Promise<T>;
  importFullInstance: (input: InstanceImportInput) => Promise<void>;
  importDesktopInstance: (pairingUrl: string, onStage: (stage: InstanceTransferStage, percent?: number) => void) => Promise<void>;
  syncState: () => Promise<void>;
};

const ConnectionContext = createContext<ConnectionContextValue | null>(null);

function profileMetadata(bootstrap: RemoteBootstrap) {
  const custom = new Map(
    bootstrap.profiles.map((profile) => [profile.id, profile]),
  );
  return bootstrap.jndata.serverList.map((id) => {
    const data = bootstrap.jndata.data[id];
    const user = custom.get(id);
    return {
      id,
      name: user?.data?.name ?? data?.name ?? id,
      shortName: user?.data?.shortName ?? data?.shortName,
      color: data?.color,
      icon: data?.icon,
      custom: custom.has(id),
    };
  });
}

export function ConnectionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const runtimeRef = useRef<JNbotRuntime | null>(null);
  const clientRef = useRef<JNbotClient | null>(null);
  const unsubscribersRef = useRef<Array<() => void>>([]);
  const modeRef = useRef<ActiveRuntimeMode | null>(null);
  const [client, setClient] = useState<JNbotClient | null>(null);
  const [status, setStatus] = useState<RuntimeConnectionState>("idle");
  const [ready, setReady] = useState(false);
  const [hasTarget, setHasTarget] = useState(false);
  const [target, setTarget] = useState<RuntimeTarget | null>(null);
  const [mode, setMode] = useState<ActiveRuntimeMode | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  const teardown = useCallback(() => {
    unsubscribersRef.current.forEach((unsubscribe) => unsubscribe());
    unsubscribersRef.current = [];
    clientRef.current?.destroy();
    runtimeRef.current?.disconnect();
    runtimeRef.current = null;
    clientRef.current = null;
    setClient(null);
  }, []);

  const selectProfile = useCallback(async (profileKey: string) => {
    const activeClient = clientRef.current;
    if (!activeClient) throw new Error("Connect to JNbot first.");
    const selected = await activeClient.selectProfile(profileKey);
    if (modeRef.current === "remote") {
      await saveSelectedProfile(selected.key);
    } else {
      await saveLocalSelectedProfile(selected.key);
    }
  }, []);

  const hydrateBootstrap = useCallback(
    async (
      bootstrap: RemoteBootstrap,
      selectSaved = true,
      selectedOverride?: string | null,
    ) => {
      actions.setBootstrap({
        profiles: profileMetadata(bootstrap),
        JNdata: bootstrap.jndata,
        sharedAlts: bootstrap.shared.alts ?? [],
        pluginMetadata: bootstrap.shared.pluginMetadata ?? {},
        appSettings: bootstrap.appSettings,
        capabilities: bootstrap.capabilities ?? [],
        permissions: bootstrap.permissions,
        // Stats come from the profile snapshot and live `mobileActivity`
        // updates; the bootstrap's account-filtered totals would briefly differ.
      });
      const activeRuntime = runtimeRef.current;
      if (!activeRuntime) return;
      const savedPromise = selectedOverride !== undefined
        ? Promise.resolve(selectedOverride)
        : modeRef.current === "remote"
          ? loadSelectedProfile()
          : loadLocalSelectedProfile();
      const [saved, summaries, plugins] = await Promise.all([
        selectSaved ? savedPromise : Promise.resolve(null),
        activeRuntime.getRuntimeSummaries().catch(() => []),
        activeRuntime.getInstalledPlugins().catch(() => [] as MacroInfo[]),
      ]);
      actions.setRuntimeSummaries(summaries);
      actions.setMacros(plugins);
      const available = bootstrap.jndata.serverList;
      const currentSelected = get().activeProfileKey;
      const target = currentSelected ?? saved;
      const selected = target && available.includes(target) ? target : null;
      if (selected) {
        if (get().profileReady && get().activeProfileKey === selected) {
          try {
            const result = await activeRuntime.selectProfile(selected);
            actions.applyProfileSnapshot(
              get().profileGeneration,
              result.snapshot as any,
            );
          } catch (err) {
            console.warn("[ConnectionProvider] failed to resync profile snapshot", err);
          }
        } else {
          await selectProfile(selected);
        }
      } else if (available.length > 0) {
        actions.clearProfileSelection();
      }
    },
    [selectProfile],
  );

  const start = useCallback(
    async (
      nextTarget: RuntimeTarget,
      nextMode: ActiveRuntimeMode = nextTarget.kind,
      selectedOverride?: string | null,
    ) => {
      teardown();
      // A target switch must never leave the previous target's profile selected
      // while the new runtime is still loading its own profile catalog.
      actions.reset();
      modeRef.current = nextMode;
      setMode(nextMode);
      const nextRuntime =
        nextTarget.kind === "local"
          ? new LocalJNbotRuntime()
          : new RemoteJNbotRuntime(nextTarget.credentials);
      runtimeRef.current = nextRuntime;
      const nextClient = new JNbotClient(nextRuntime);
      clientRef.current = nextClient;
      setClient(nextClient);
      const bind = <K extends Parameters<JNbotRuntime["on"]>[0]>(
        event: K,
        listener: any,
      ) => {
        unsubscribersRef.current.push(nextRuntime.on(event as any, listener));
      };
      bind("state", (next: RuntimeConnectionState) => {
        const visibleState = next === "connected" ? "synchronizing" : next;
        setStatus(visibleState);
        actions.setConnectionState(visibleState);
      });
      bind("error", (error: { message: string }) => {
        setLastError(error.message);
        actions.setLastError(error.message);
      });
      let initializing = true;
      let bootstrapHydration = Promise.resolve();
      bind("bootstrap", (bootstrap: RemoteBootstrap) => {
        if (!initializing) {
          bootstrapHydration = bootstrapHydration.then(() => hydrateBootstrap(bootstrap));
          void bootstrapHydration.then(() => {
            if (runtimeRef.current !== nextRuntime) return;
            setStatus("connected");
            actions.setConnectionState("connected");
            setLastError(null);
          }).catch((error) => {
            if (runtimeRef.current !== nextRuntime) return;
            const message = error instanceof Error ? error.message : String(error);
            setStatus("error");
            setLastError(message);
            actions.setLastError(message);
          });
        }
      });
      // The host follows this notification with a fresh permission-filtered
      // bootstrap. `hydrateBootstrap` then chooses a still-authorized profile.
      bind("permissionsUpdated", async () => {
        const activeRuntime = runtimeRef.current;
        const currentSelected = get().activeProfileKey;
        if (activeRuntime && currentSelected && get().profileReady) {
          try {
            const result = await activeRuntime.selectProfile(currentSelected);
            actions.applyProfileSnapshot(
              get().profileGeneration,
              result.snapshot as any,
            );
          } catch (err) {
            console.warn("[ConnectionProvider] failed to resync profile snapshot on permission update", err);
          }
        }
      });
      bind("stats", (stats: Stats) => actions.setStats(stats));
      bind("profilePublication", (publication: any) => {
        nextClient.applyProfilePublication(publication);
        handleProfileUiPublication(publication);
      });
      bind("botEvent", ({ botId, event, data }: any) => {
        if (event === "chat") actions.setBotChat(botId, data);
        if (event === "inventory") actions.setBotInventory(botId, data);
        if (event === "info") actions.setBotInfo(botId, data);
        if (event === "movement-state") actions.setBotMovement(botId, data);
      });
      setStatus("signaling");
      actions.setConnectionState("signaling");
      try {
        const ready = (async () => {
          await nextRuntime.start();
          return nextRuntime.getBootstrap();
        })();
        const bootstrap = await ready;
        initializing = false;
        await hydrateBootstrap(bootstrap, true, selectedOverride);
        if (runtimeRef.current === nextRuntime) {
          setStatus("connected");
          actions.setConnectionState("connected");
          setLastError(null);
        }
      } catch (error) {
        initializing = false;
        if (runtimeRef.current === nextRuntime && nextTarget.kind === "local")
          nextRuntime.disconnect();
        console.error("[ConnectionProvider] runtime start failed", error);
        const message = error instanceof Error ? error.message : String(error);
        setLastError(message);
        setStatus("error");
        actions.setLastError(message);
        actions.setConnectionState("error");
        throw error;
      }
    },
    [hydrateBootstrap, teardown],
  );

  const connect = useCallback(
    async (credentials: PairingCredentials) => {
      const nextTarget: RuntimeTarget = { kind: "remote", credentials };
      await saveRuntimeTarget(nextTarget);
      setTarget(nextTarget);
      setHasTarget(true);
      setLastError(null);
      await start(nextTarget, "remote");
    },
    [start],
  );

  const connectFromUrl = useCallback(
    async (url: string) => {
      // Notification and share links are handled by Expo Router, not runtime pairing.
      if (url === "jnbot://dashboard" || url.startsWith("jnbot://share/")) return;
      await connect(parsePairingUrl(url));
    },
    [connect],
  );

  const useLocal = useCallback(async () => {
    const nextTarget: RuntimeTarget = { kind: "local" };
    await saveRuntimeTarget(nextTarget);
    setTarget(nextTarget);
    setHasTarget(true);
    setLastError(null);
    await start(nextTarget, "local");
  }, [start]);

  const switchToPhone = useCallback(async () => {
    if (modeRef.current === "local") return;
    setLastError(null);
    await start({ kind: "local" }, "local");
  }, [start]);


  const reconnect = useCallback(() => {
    if (target?.kind !== "remote" || modeRef.current === "remote") {
      runtimeRef.current?.reconnect();
      return;
    }
    void (async () => {
      try {
        setLastError(null);
        await start(target, "remote");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setLastError(message);
        actions.setLastError(message);
      }
    })();
  }, [start, target]);

  const createProfile = useCallback(
    async (input: CreateProfileInput) => {
      if (modeRef.current === "remote") await start({ kind: "local" }, "local");
      const activeRuntime = runtimeRef.current;
      if (!activeRuntime)
        throw new Error("The local runtime is not ready yet.");
      const created = await activeRuntime.createProfile(input);
      await hydrateBootstrap(created.bootstrap, false);
      await selectProfile(created.profileKey);
    },
    [hydrateBootstrap, selectProfile, start],
  );

  const serverStatus = useCallback(
    async (host: string, port: number) =>
      (await runtimeRef.current?.serverStatus(host, port)) ?? null,
    [],
  );

  const deleteProfile = useCallback(
    async (profileKey: string) => {
      if (modeRef.current !== "local")
        throw new Error("Profiles can only be removed from this phone.");
      const activeRuntime = runtimeRef.current;
      if (!activeRuntime)
        throw new Error("The phone runtime is not ready yet.");
      const deleted = await activeRuntime.deleteProfile(profileKey);
      await hydrateBootstrap(deleted.bootstrap, false);
    },
    [hydrateBootstrap],
  );

  const previewPortablePlugins = useCallback(
    async (packages: (PortablePluginPackage | string)[]) => {
      if (modeRef.current === "remote") await start({ kind: "local" }, "local");
      const activeRuntime = runtimeRef.current;
      if (!activeRuntime)
        throw new Error("The phone runtime is not ready yet.");
      return activeRuntime.previewPluginImports(packages);
    },
    [start],
  );

  const importPortablePlugins = useCallback(
    async (
      packages: (PortablePluginPackage | string)[],
      decisions: PluginImportDecision[],
    ) => {
      if (modeRef.current === "remote") await start({ kind: "local" }, "local");
      const activeRuntime = runtimeRef.current;
      if (!activeRuntime)
        throw new Error("The phone runtime is not ready yet.");
      const result = await activeRuntime.importPortablePlugins(packages, decisions);
      actions.setMacros(await activeRuntime.getInstalledPlugins());
      return result;
    },
    [start],
  );

  const shareAction = useCallback(
    async <T,>(event: ShareAction, data: unknown): Promise<T> => {
      if (modeRef.current === "remote") {
        // Browsing and installing move to the phone like plugin imports; managing shares needs it already.
        if (!["SHARE_PREVIEW", "SHARE_INSTALL", "SHARE_MARKET", "SHARE_REPORT"].includes(event))
          throw new Error("Switch to this phone to share plugins and profiles.");
        await start({ kind: "local" }, "local");
      }
      const activeRuntime = runtimeRef.current;
      if (!activeRuntime)
        throw new Error("The phone runtime is not ready yet.");
      const result = await activeRuntime.shareAction<T>(event, data);
      if (event === "SHARE_INSTALL") {
        useShares.setState((result as { state: ShareState }).state);
        actions.setMacros(await activeRuntime.getInstalledPlugins());
        await hydrateBootstrap(await activeRuntime.getBootstrap(true), false);
      }
      return result;
    },
    [start, hydrateBootstrap],
  );

  const installMarketplaceProfile = useCallback(
    async (shareId: string) => {
      const { localRef } = await shareAction<{ localRef: string }>("SHARE_INSTALL", { id: shareId, decisions: [] });
      await selectProfile(localRef);
    },
    [selectProfile, shareAction],
  );

  /** Moves the app onto the phone runtime that just imported an instance. */
  const finishImport = useCallback(
    async (activeRuntime: JNbotRuntime, result: InstanceImportResult) => {
      const localTarget: RuntimeTarget = { kind: "local" };
      await saveRuntimeTarget(localTarget);
      setTarget(localTarget);
      setHasTarget(true);
      const preferredProfile =
        result.bootstrap.appSettings?.server ||
        result.bootstrap.jndata?.serverList?.[0] ||
        null;
      await hydrateBootstrap(result.bootstrap, true, preferredProfile);
      useShares.setState(await activeRuntime.shareAction<ShareState>("SHARE_STATE", undefined));
      if (preferredProfile) await selectProfile(preferredProfile);
    },
    [hydrateBootstrap, selectProfile],
  );

  const importFullInstance = useCallback(
    async (input: InstanceImportInput) => {
      if (modeRef.current === "remote") await start({ kind: "local" }, "local");
      const activeRuntime = runtimeRef.current;
      if (!activeRuntime)
        throw new Error("The phone runtime is not ready yet.");
      await finishImport(activeRuntime, await activeRuntime.importFullInstance(input));
    },
    [finishImport, start],
  );

  const importDesktopInstance = useCallback(
    async (pairingUrl: string, onStage: (stage: InstanceTransferStage, percent?: number) => void) => {
      if (modeRef.current !== "local") await start({ kind: "local" }, "local");
      const activeRuntime = runtimeRef.current;
      if (!(activeRuntime instanceof LocalJNbotRuntime))
        throw new Error("The phone runtime is not ready yet.");
      await finishImport(activeRuntime, await importInstanceTransfer(pairingUrl, activeRuntime, onStage));
    },
    [finishImport, start],
  );

  const disconnect = useCallback(async () => {
    teardown();
    await clearPairing();
    await clearRuntimeTarget();
    setTarget(null);
    modeRef.current = null;
    setMode(null);
    setHasTarget(false);
    setStatus("disconnected");
    actions.reset();
  }, [teardown]);

  const syncState = useCallback(async () => {
    const activeRuntime = runtimeRef.current;
    if (!activeRuntime) return;
    if (activeRuntime.state !== "connected") {
      activeRuntime.reconnect();
      return;
    }
    try {
      const bootstrap = await activeRuntime.getBootstrap(true);
      await hydrateBootstrap(bootstrap, true);
    } catch (error) {
      console.warn("[ConnectionProvider] syncState failed, attempting reconnect", error);
      activeRuntime.reconnect();
    }
  }, [hydrateBootstrap]);

  useEffect(() => {
    let cancelled = false;
    void loadRuntimeTarget().then(async (savedTarget) => {
      if (cancelled) return;
      if (savedTarget) {
        setTarget(savedTarget);
        setHasTarget(true);
        // Storage readiness should not be held hostage by native runtime
        // startup. The app shell can render its connection/profile state while
        // the embedded runtime negotiates in the background.
        if (!cancelled) setReady(true);
        try {
          await start(savedTarget, savedTarget.kind);
        } catch (error) {
          setLastError(error instanceof Error ? error.message : String(error));
        }
      }
      if (!cancelled) setReady(true);
    });
    void Linking.getInitialURL().then((url) => {
      if (!url || cancelled) return;
      void connectFromUrl(url).catch((error) =>
        setLastError(error instanceof Error ? error.message : String(error)),
      );
    });
    const linkSubscription = Linking.addEventListener("url", ({ url }) => {
      void connectFromUrl(url).catch((error) =>
        setLastError(error instanceof Error ? error.message : String(error)),
      );
    });
    const appStateSubscription = AppState.addEventListener(
      "change",
      (next: AppStateStatus) => {
        if (next === "active") {
          const currentRuntime = runtimeRef.current;
          if (!currentRuntime) return;
          if (
            currentRuntime.state === "reconnecting" ||
            currentRuntime.state === "disconnected" ||
            currentRuntime.state === "error"
          ) {
            currentRuntime.reconnect();
          } else if (currentRuntime.state === "connected") {
            if (modeRef.current === "local") {
              void new EmbeddedNodeBridge().requestStorage<boolean>("refresh").then((changed) => {
                if (changed) return new EmbeddedNodeBridge().requestStorage("select", { mode: "dropbox" }).then(() => start({ kind: "local" }, "local"));
                return syncState();
              }).catch((error) => setLastError(error instanceof Error ? error.message : String(error)));
            } else void syncState();
          }
        } else if (next === "background" && modeRef.current === "local") {
          void new EmbeddedNodeBridge().requestStorage<{ lastError?: string }>("flush").then((result) => {
            if (result?.lastError) setLastError(result.lastError);
          }).catch((error) => setLastError(error instanceof Error ? error.message : String(error)));
        }
      },
    );
    return () => {
      cancelled = true;
      linkSubscription.remove();
      appStateSubscription.remove();
      teardown();
    };
  }, [connectFromUrl, start, syncState, teardown]);

  const value = useMemo<ConnectionContextValue>(
    () => ({
      client,
      status,
      ready,
      hasTarget,
      target,
      mode,
      lastError,
      connect,
      connectFromUrl,
      useLocal,
      reconnect,
      disconnect,
      selectProfile,
      installMarketplaceProfile,
      switchToPhone,
      createProfile,
      serverStatus,
      deleteProfile,
      previewPortablePlugins,
      importPortablePlugins,
      shareAction,
      importFullInstance,
      importDesktopInstance,
      syncState,
    }),
    [
      client,
      status,
      ready,
      hasTarget,
      target,
      mode,
      lastError,
      connect,
      connectFromUrl,
      useLocal,
      reconnect,
      disconnect,
      selectProfile,
      installMarketplaceProfile,
      switchToPhone,
      createProfile,
      serverStatus,
      deleteProfile,
      previewPortablePlugins,
      importPortablePlugins,
      shareAction,
      importFullInstance,
      importDesktopInstance,
      syncState,
    ],
  );

  return (
    <ConnectionContext.Provider value={value}>
      {children}
    </ConnectionContext.Provider>
  );
}

export function useConnection() {
  const context = useContext(ConnectionContext);
  if (!context)
    throw new Error("useConnection must be used inside ConnectionProvider.");
  return context;
}

export function useClient() {
  return useConnection().client;
}

function handleProfileUiPublication(publication: ProfilePublication) {
  const profileId = publication.profileId;
  if (get().activeProfileId !== profileId) return;
  switch (publication.event) {
    case "LOGS":
      actions.appendLogs(publication.data as ConsoleLogEntry[]);
      return;
    case "snackbar":
      actions.enqueueToast(publication.data as SnackbarPayload);
      return;
    case "notification":
      actions.addHostNotification(publication.data as NotificationPayload);
      return;
    case "bot-kicked": {
      const data = publication.data as BotKickedPayload;
      const title = `${data.username} got kicked`;
      actions.enqueueToast({ title, variant: "error" });
      actions.addNotification({
        title,
        message: data.reason,
        type: "error",
        buttons: [{ label: "Open bot", action: "openBot", botId: data.botId }],
      });
      return;
    }
    case "macro-prompt": {
      const data = publication.data as ScriptPromptPayload;
      if (!data?.promptID || typeof data.messageAddress !== "number") return;
      actions.enqueueUiRequest({
        kind: "prompt",
        id: data.promptID,
        profileId,
        data,
      });
      return;
    }
    case "DIALOG": {
      const data = publication.data as ScriptDialogPayload;
      if (data?.id === undefined || typeof data.messageAddress !== "number")
        return;
      actions.enqueueUiRequest({
        kind: "dialog",
        id: String(data.id),
        profileId,
        data,
      });
      return;
    }
    case "popup-buttons": {
      const data = publication.data as ScriptButtonPopupPayload;
      if (
        data?.popupID === undefined ||
        typeof data.messageAddress !== "number"
      )
        return;
      actions.enqueueUiRequest({
        kind: "buttons",
        id: String(data.popupID),
        profileId,
        data,
      });
      return;
    }
    case "altUpdateRequest": {
      const data = publication.data as AltUpdateRequestPayload;
      if (!data?.updates || Object.keys(data.updates).length === 0) return;
      actions.enqueueUiRequest({
        kind: "alt-update",
        id: data.id || `alt-update-${Date.now()}`,
        profileId,
        data,
      });
      return;
    }
    case "option-error": {
      const data = publication.data as OptionErrorPayload;
      actions.setOptionError(data);
      return;
    }
    case "MC_MICROSOFT_DEVICE_CODE":
      actions.showMicrosoftLogin(publication.data as MicrosoftDeviceCodePayload);
      return;
  }
}
