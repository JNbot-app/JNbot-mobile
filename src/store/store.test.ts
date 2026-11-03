import {
  actions,
  applySettingsPatchesToObj,
  get,
  isBotAssignedToScript,
  normalizeLogs,
  selectCanChangeGlobalSettings,
  selectCanManageAccess,
  selectCanManageProfiles,
  selectCanUseAccounts,
  selectCanUseActiveBots,
  selectCanUseCapability,
  selectCanUseHostTools,
  selectCanUsePlugins,
  selectCanUseScripts,
  selectRemotePermissionMask,
} from "./store";
import { RemotePermission } from "../generated/client-contract/clientPermissions";
import type { ConsoleLogEntry } from "../generated/client-contract/mobileClientContract";

const snapshot = (profileId = 1, profileKey = "jartex") => ({
  profileId,
  profileKey,
  settings: {
    scripts: {},
    reminders: [],
    triggers: [],
    altTags: [],
    altData: {},
    version: 2,
  },
  appSettings: {},
  activeScripts: {},
  activeBots: [],
  activeScriptActions: {},
  alts: [],
  stats: { botsJoined: 0, scriptsStarted: 0, onlineTime: 0 },
  progress: {},
  serverStatus: { ips: [] },
});

describe("inventory store", () => {
  beforeEach(() => actions.reset());

  it("updates when the held item changes without a slot change", () => {
    const items = [null];
    const empty = { items, selectedItem: null };
    const holding = { items, selectedItem: { name: "stone", count: 3 } };

    actions.setBotInventory(1, empty);
    actions.setBotInventory(1, holding);
    expect(get().botInventories[1]).toEqual(holding);

    actions.setBotInventory(1, empty);
    expect(get().botInventories[1]).toEqual(empty);
  });

  it("clears bot tab state when an id belongs to a different bot address", () => {
    const bot = { botId: 1, MESSAGE_ADDRESS: 101, username: "Steve" } as any;
    actions.setActiveBots([bot]);
    actions.setBotInventory(1, { items: [{ name: "stone" }] });
    actions.setBotMovement(1, { yaw: 1 } as any);

    actions.setActiveBots([{ ...bot, username: "Steve2" }]);
    expect(get().botInventories[1]).toBeDefined();

    actions.setActiveBots([{ ...bot, MESSAGE_ADDRESS: 202 }]);

    expect(get().botInventories[1]).toBeUndefined();
    expect(get().botMovement[1]).toBeUndefined();
  });
});

describe("profile lifecycle store", () => {
  beforeEach(() => actions.reset());

  it("ignores late snapshots after a second profile switch", () => {
    actions.beginProfileSelection("one");
    actions.beginProfileSelection("two");
    actions.applyProfileSnapshot(1, snapshot(1, "one"));

    expect(get().activeProfileKey).toBe("two");
    expect(get().profileReady).toBe(false);
  });

  it("invalidates an in-flight snapshot when profile access is cleared", () => {
    actions.beginProfileSelection("jartex");
    actions.clearProfileSelection();
    actions.applyProfileSnapshot(1, snapshot());

    expect(get().activeProfileKey).toBeNull();
    expect(get().profileReady).toBe(false);
  });

  it("drops telemetry for bots that leave the active profile", () => {
    actions.beginProfileSelection("jartex");
    actions.applyProfileSnapshot(1, {
      ...snapshot(),
      activeBots: [
        {
          botId: 3,
          username: "Steve",
          script: "chat",
          id: "3",
          version: "1.8.9",
          host: "test",
          port: 25565,
          status: "connected",
          paused: false,
          SCRIPT_NAME: "chat",
          SCRIPT_ID: "chat",
          INSTANCE_ID: "3",
        },
      ] as any,
    });
    actions.setBotChat(3, { message: "hello" });
    actions.applyProfilePublication(1, {
      profileId: 1,
      event: "activeBots",
      data: [],
    });

    expect(get().activeBots).toEqual([]);
    expect(get().botChats).toEqual({});
  });

  it("updates dashboard stats from a mobile activity publication", () => {
    actions.beginProfileSelection("jartex");
    actions.applyProfileSnapshot(1, snapshot());

    actions.applyProfilePublication(1, {
      profileId: 1,
      event: "mobileActivity",
      data: { botsJoined: 7, scriptsStarted: 8, onlineTime: 9 },
    });

    expect(get().stats).toMatchObject({ botsJoined: 7, scriptsStarted: 8, onlineTime: 9 });
  });

  it("normalizes, deduplicates, and filters console history", () => {
    const packets = [["hello", 2, "Join", "join", 123]] as any;
    expect(normalizeLogs(packets)[0]).toMatchObject({ message: "hello", level: 2, scriptName: "Join", scriptId: "join", timestamp: 123 });
    expect(normalizeLogs([[{ items: [1, "[truncated]"] }, 0, "Join", "join", 124] as any])[0].message)
      .toBe('{"items":[1,"[truncated]"]}');
    expect(normalizeLogs([[['ready', { health: 20 }], 0, 'Join', 'join', 124] as any])[0].message)
      .toBe('["ready",{"health":20}]');
    expect(normalizeLogs([["x".repeat(8_000), 0, "Join", "join", 125] as any])[0].id.length)
      .toBeLessThan(100);
    actions.setLogs(packets);
    actions.appendLogs(packets);
    expect(get().logs).toHaveLength(1);
    actions.clearLogs("Join");
    expect(get().logs).toEqual([]);
  });

  it("keeps repeated messages in a snapshot with unique row ids", () => {
    const entry: ConsoleLogEntry =
      ["", 0, "Join", "join", 123];
    actions.setLogs([entry, entry, [{ health: 20 }, 0, "Join", "join", 123]]);

    expect(get().logs.map((log) => log.message)).toEqual(["", "", '{"health":20}']);
    expect(new Set(get().logs.map((log) => log.id)).size).toBe(3);

    actions.appendLogs([entry, entry, [{ health: 20 }, 0, "Join", "join", 123]]);
    expect(get().logs).toHaveLength(3);
  });

  it("keeps request order, deduplicates ids, and clears stale profile UI", () => {
    actions.beginProfileSelection("jartex");
    actions.applyProfileSnapshot(1, snapshot());
    const request = { kind: "dialog", id: "one", profileId: 1, data: { id: "one", title: "First", buttons: [], messageAddress: 10 } } as any;
    actions.enqueueUiRequest(request);
    actions.enqueueUiRequest(request);
    actions.enqueueUiRequest({ ...request, id: "two", data: { ...request.data, id: "two" } });
    expect(get().uiRequests.map((item) => item.id)).toEqual(["one", "two"]);
    actions.beginProfileSelection("other");
    expect(get().uiRequests).toEqual([]);
    expect(get().logs).toEqual([]);
  });

  describe("isBotAssignedToScript", () => {
    const script = {
      instanceId: 1,
      scriptId: "chat",
      name: "chat",
    };

    it("matches bot when RUNTIME_SCRIPT_ID equals script instanceId", () => {
      const bot = {
        botId: 1,
        username: "Zola",
        RUNTIME_SCRIPT_ID: 1,
        INSTANCE_ID: "",
        SCRIPT_ID: "chat",
      } as any;
      expect(isBotAssignedToScript(bot, script)).toBe(true);
    });

    it("matches bot when INSTANCE_ID equals script instanceId string", () => {
      const bot = {
        botId: 1,
        username: "Zola",
        INSTANCE_ID: "1",
        SCRIPT_ID: "chat",
      } as any;
      expect(isBotAssignedToScript(bot, script)).toBe(true);
    });

    it("does not match when RUNTIME_SCRIPT_ID belongs to a different instance", () => {
      const bot = {
        botId: 1,
        username: "Zola",
        RUNTIME_SCRIPT_ID: 2,
        INSTANCE_ID: "2",
        SCRIPT_ID: "chat",
      } as any;
      expect(isBotAssignedToScript(bot, script)).toBe(false);
    });

    it("returns false if bot or script is missing", () => {
      expect(isBotAssignedToScript(undefined, script)).toBe(false);
      expect(isBotAssignedToScript({} as any, null)).toBe(false);
    });
  });

  it("removes settings fields for delete patches", () => {
    const next = applySettingsPatchesToObj(
      {
        scripts: {
          chains: { one: { id: "one", chains: [] } },
          one: { name: "One" },
        },
        reminders: [],
        triggers: [],
        altTags: [],
        altData: {},
        version: 3,
      },
      [
        { path: ["scripts", "chains", "one"], remove: true },
        { path: ["scripts", "one"], remove: true },
      ],
    );
    expect(next.scripts.chains).toEqual({});
    expect(next.scripts.one).toBeUndefined();
  });

  describe("alts and settings synchronization", () => {
    it("synchronizes settings.altData and sharedAlts when setAlts is called", () => {
      actions.setBootstrap({
        profiles: [],
        JNdata: null,
        sharedAlts: [{ username: "OldUser" }],
        appSettings: {},
      });
      actions.setSettings({
        scripts: {},
        reminders: [],
        triggers: [],
        altTags: [{ id: "tag1", name: "Miners", color: "#fff", alts: ["Steve", "Alex", "RemovedUser"] }],
        altData: {},
        version: 2,
      });

      actions.setAlts([
        {
          username: "Steve",
          data: { password: "pass1", ranks: { pvp: "VIP" }, gkits: {} },
        },
        {
          username: "Alex",
          data: { premium: true, password: "pass2", ranks: {}, gkits: {} },
        },
      ]);

      const state = get();
      expect(state.alts).toHaveLength(2);
      expect(state.settings.altData).toEqual({
        Steve: { password: "pass1", ranks: { pvp: "VIP" }, gkits: {} },
        Alex: { premium: true, password: "pass2", ranks: {}, gkits: {} },
      });
      expect(state.sharedAlts).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ username: "Steve" }),
          expect.objectContaining({ username: "Alex" }),
        ]),
      );
      expect(state.settings.altTags[0].alts).toEqual(["Steve", "Alex"]);
    });

    it("re-derives alts when setShared or setSettings is called", () => {
      actions.setBootstrap({
        profiles: [],
        JNdata: null,
        sharedAlts: [{ username: "Steve" }, { username: "Alex" }],
        appSettings: {},
      });
      actions.setSettings({
        scripts: {},
        reminders: [],
        triggers: [],
        altTags: [],
        altData: {
          Steve: { password: "123", ranks: {}, gkits: {} },
        },
        version: 2,
      });

      expect(get().alts).toHaveLength(1);
      expect(get().alts[0].username).toBe("Steve");

      actions.setShared({
        alts: [{ username: "Steve" }, { username: "Alex" }, { username: "Zola" }],
      });
      expect(get().alts).toHaveLength(1);

      actions.setSettings({
        scripts: {},
        reminders: [],
        triggers: [],
        altTags: [],
        altData: {
          Steve: { password: "123", ranks: {}, gkits: {} },
          Zola: { password: "456", ranks: {}, gkits: {} },
        },
        version: 2,
      });
      expect(get().alts).toHaveLength(2);
      expect(get().alts.map((a) => a.username)).toEqual(["Steve", "Zola"]);
    });

    it("recomputes alts when settings or alts publication is received", () => {
      actions.beginProfileSelection("jartex");
      actions.applyProfileSnapshot(1, {
        ...snapshot(1, "jartex"),
        settings: {
          scripts: {},
          reminders: [],
          triggers: [],
          altTags: [],
          altData: {},
          version: 2,
        },
      });
      actions.setShared({
        alts: [{ username: "Steve" }],
      });

      actions.applyProfilePublication(1, {
        profileId: 1,
        event: "settings",
        data: {
          scripts: {},
          reminders: [],
          triggers: [],
          altTags: [],
          altData: {
            Steve: { password: "abc", ranks: {}, gkits: {} },
          },
          version: 2,
        },
      });

      expect(get().alts).toHaveLength(1);
      expect(get().alts[0].username).toBe("Steve");
      expect(get().alts[0].data.password).toBe("abc");
    });

    it("updates script progress on PROGRESS_UPDATE publication", () => {
      actions.beginProfileSelection("jartex");
      actions.applyProfileSnapshot(1, {
        ...snapshot(1, "jartex"),
        activeScripts: {
          "1": {
            instanceId: 1,
            scriptId: "miner",
            name: "miner",
            progress: { current: 0, total: 100 },
          } as any,
        },
      });

      actions.applyProfilePublication(1, {
        profileId: 1,
        event: "PROGRESS_UPDATE",
        data: {
          "1": { current: 45, total: 100, eta: 50 },
        },
      });

      expect(get().activeScripts["1"].progress).toEqual({
        current: 45,
        total: 100,
        eta: 50,
      });
    });

    it("resets settings to initialSettings during beginProfileSelection", () => {
      actions.setSettings({
        scripts: { test: { opt: 1 } },
        reminders: [{ id: "rem1", name: "Mining", pluginId: "miner", cooldown: 60000, time: 0 }],
        triggers: [],
        altTags: [],
        altData: { User1: { password: "1", ranks: {}, gkits: {} } },
        version: 2,
      });

      actions.beginProfileSelection("new-profile");
      expect(get().settings.reminders).toEqual([]);
      expect(get().settings.altData).toEqual({});
      expect(get().alts).toEqual([]);
    });
  });

  describe("remote permissions and selectors", () => {
    beforeEach(() => actions.reset());

    it("defaults all capabilities to true when remote permissions are unset", () => {
      const state = get();
      expect(selectRemotePermissionMask(state)).toBeNull();
      expect(selectCanUseAccounts(state)).toBe(true);
      expect(selectCanUseScripts(state)).toBe(true);
      expect(selectCanUseActiveBots(state)).toBe(true);
      expect(selectCanUsePlugins(state)).toBe(true);
      expect(selectCanChangeGlobalSettings(state)).toBe(true);
      expect(selectCanManageProfiles(state)).toBe(true);
      expect(selectCanManageAccess(state)).toBe(true);
      expect(selectCanUseHostTools(state)).toBe(true);
      expect(selectCanUseCapability("accounts")(state)).toBe(true);
    });

    it("computes capabilities accurately when setBootstrap provides permissionMask", () => {
      // Allow only USE_ACCOUNTS and USE_SCRIPTS
      const mask = RemotePermission.USE_ACCOUNTS | RemotePermission.USE_SCRIPTS;
      actions.setBootstrap({
        profiles: [],
        JNdata: { servers: {}, accounts: [] } as any,
        sharedAlts: [],
        appSettings: {} as any,
        permissions: { permissionMask: mask },
      });

      const state = get();
      expect(selectRemotePermissionMask(state)).toBe(mask);
      expect(selectCanUseAccounts(state)).toBe(true);
      expect(selectCanUseScripts(state)).toBe(true);
      expect(selectCanUseActiveBots(state)).toBe(false);
      expect(selectCanUsePlugins(state)).toBe(false);
      expect(selectCanChangeGlobalSettings(state)).toBe(false);
      expect(selectCanManageProfiles(state)).toBe(false);
      expect(selectCanManageAccess(state)).toBe(false);
      expect(selectCanUseHostTools(state)).toBe(false);
      expect(selectCanUseCapability("accounts")(state)).toBe(true);
      expect(selectCanUseCapability("plugins")(state)).toBe(false);
    });

    it("resets permission mask and capabilities on actions.reset()", () => {
      actions.setBootstrap({
        profiles: [],
        JNdata: { servers: {}, accounts: [] } as any,
        sharedAlts: [],
        appSettings: {} as any,
        permissions: { permissionMask: RemotePermission.USE_ACCOUNTS },
      });

      expect(get().remotePermissionMask).toBe(RemotePermission.USE_ACCOUNTS);
      expect(selectCanUsePlugins(get())).toBe(false);

      actions.reset();

      expect(get().remotePermissionMask).toBeNull();
      expect(get().remoteCapabilities).toBeNull();
      expect(selectCanUsePlugins(get())).toBe(true);
    });
  });
});

describe("plugin option errors", () => {
  beforeEach(() => actions.reset());

  it("reports an unchanged field error only once until it is cleared", () => {
    const error = { pluginId: "plugin-1", field: "account", message: "This field is required" };

    expect(actions.setOptionError(error)).toBe(true);
    const errors = get().optionErrors;
    expect(actions.setOptionError(error)).toBe(false);
    expect(get().optionErrors).toBe(errors);

    actions.clearOptionError("plugin-1", "account");
    expect(actions.setOptionError(error)).toBe(true);
  });
});
