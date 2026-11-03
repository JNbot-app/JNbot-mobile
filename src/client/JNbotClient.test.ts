jest.mock("../runtime/pairing", () => ({ saveSelectedProfile: jest.fn() }));

import { AppState } from "react-native";
import { JNbotClient } from "./JNbotClient";
import { actions, get } from "../store/store";
import type { JNbotRuntime } from "../runtime/JNbotRuntime";
import type { MacroInfo } from "../store/types";

describe("JNbotClient", () => {
  beforeEach(() => {
    actions.reset();
    actions.setBootstrap({
      profiles: [],
      JNdata: null,
      sharedAlts: [],
      appSettings: {},
      capabilities: ["scripts"],
    });
    actions.beginProfileSelection("jartex");
    actions.applyProfileSnapshot(1, {
      profileId: 7,
      profileKey: "jartex",
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
  });

  it("persists chat settings before starting a joined bot", async () => {
    const profileAction = jest.fn().mockResolvedValue(true);
    const startScript = jest.fn().mockResolvedValue(true);
    const client = new JNbotClient({
      profileAction,
      startScript,
    } as unknown as JNbotRuntime);

    await client.joinBot("Steve", "1.8.9");

    expect(profileAction).toHaveBeenNthCalledWith(1, 7, "SETTINGS_UPDATE", [
      { path: ["scripts", "chat", "username"], value: "Steve" },
      { path: ["scripts", "chat", "version"], value: "1.8.9" },
    ]);
    expect(startScript).toHaveBeenCalledWith(7, {
      script: "chat",
      arguments: { username: "Steve", version: "1.8.9" },
    });
  });

  it("rejects joins until the connection grants script capability", async () => {
    actions.setBootstrap({
      profiles: [],
      JNdata: null,
      sharedAlts: [],
      appSettings: {},
      capabilities: [],
    });
    const client = new JNbotClient({} as JNbotRuntime);

    await expect(client.joinBot("Steve", "1.8.9")).rejects.toThrow(
      "cannot start scripts",
    );
  });

  it("surfaces a runtime that did not actually start a script", async () => {
    const startScript = jest.fn().mockResolvedValue([]);
    const client = new JNbotClient({ startScript } as unknown as JNbotRuntime);

    await expect(client.startScript({ script: "macro" })).rejects.toThrow(
      "could not be started",
    );
  });

  it("surfaces script-loading errors returned by the runtime", async () => {
    const startScript = jest.fn().mockResolvedValue({ status: "error", error: "Failed to read plugin code" });
    const client = new JNbotClient({ startScript } as unknown as JNbotRuntime);

    await expect(client.startScript({ script: "macro" })).rejects.toThrow(
      "Failed to read plugin code",
    );
  });

  it("loads logs and resolves a descriptor from the original profile payload", async () => {
    const profileAction = jest.fn()
      .mockResolvedValueOnce({ scripts: [], logs: [["line", 0, "Script", "id", 1]] })
      .mockResolvedValueOnce({ info: { pluginId: "profile-id", name: "Profile script" }, source: "profile", allowed: true, sections: [], values: {} });
    const client = new JNbotClient({ profileAction } as unknown as JNbotRuntime);
    await expect(client.getLogs()).resolves.toMatchObject({ logs: [["line", 0, "Script", "id", 1]] });
    const original = { id: "chain", pluginId: "profile-id", source: { kind: "file" }, restrictions: { remote: true } };
    await expect(client.getProfileScriptDescriptor(original)).resolves.toMatchObject({ source: "profile" });
    expect(profileAction).toHaveBeenNthCalledWith(2, 7, "RESOLVE_PLUGIN_RUN_DESCRIPTOR", { profileScriptId: "chain" });
  });

  it("saves app settings as one batch", async () => {
    const profileAction = jest.fn().mockResolvedValue({ ip: "play.example.com", port: 25565 });
    const client = new JNbotClient({ profileAction } as unknown as JNbotRuntime);
    const patches = [
      { key: "ip", value: "play.example.com" },
      { key: "port", value: 25565 },
    ];
    await client.updateAppSettings(patches);
    expect(profileAction).toHaveBeenCalledWith(7, "APPSETTINGS_UPDATE", patches);
  });

  it("loads eligible actions and starts or stops chains through existing runtime events", async () => {
    const profileAction = jest.fn()
      .mockResolvedValueOnce([{ pluginId: "collect", name: "Collect", description: "Collect rewards" }, { broken: true }])
      .mockResolvedValueOnce(true);
    const startScript = jest.fn().mockResolvedValue(true);
    const client = new JNbotClient({ profileAction, startScript } as unknown as JNbotRuntime);
    await expect(client.getScriptActions()).resolves.toEqual([{ pluginId: "collect", name: "Collect", description: "Collect rewards" }]);
    await client.startChain("daily");
    expect(startScript).toHaveBeenCalledWith(7, {
      script: "macro",
      arguments: { macroInfo: { pluginId: "chain:daily" } },
    });
    await client.stopChain("daily");
    expect(profileAction).toHaveBeenLastCalledWith(7, "STOP_ALL", "chain:daily");
  });

  it("routes direct worker responses without translating the event or address", () => {
    const sendToAddress = jest.fn();
    const client = new JNbotClient({ sendToAddress } as unknown as JNbotRuntime);
    client.sendToAddress("popup-buttons-42", 987654, { response: "retry" });
    expect(sendToAddress).toHaveBeenCalledWith("popup-buttons-42", 987654, { response: "retry" });
  });

  it("applies alt changes sequentially and keeps completed state on failure", async () => {
    const upsertAlt = jest.fn()
      .mockResolvedValueOnce([{ username: "Alpha", data: { password: "first", ranks: {}, gkits: {} } }])
      .mockRejectedValueOnce(new Error("host rejected Beta"));
    const client = new JNbotClient({ upsertAlt } as unknown as JNbotRuntime);
    await expect(client.applyAltUpdates({ Alpha: { password: "first" }, Beta: { password: "second" } })).rejects.toThrow("host rejected Beta");
    expect(upsertAlt).toHaveBeenCalledTimes(2);
    expect(get().alts.map((alt) => alt.username)).toEqual(["Alpha"]);
  });

  it("loads and imports alts across profiles in one backend action", async () => {
    const imported = [{ username: "Alpha", data: { password: "pw", ranks: {}, gkits: {} } }];
    const profileAction = jest.fn()
      .mockResolvedValueOnce(imported)
      .mockResolvedValueOnce({ added: 1, updated: 0, skipped: [], alts: imported });
    const client = new JNbotClient({ profileAction } as unknown as JNbotRuntime);
    await expect(client.getAltsForProfile("source")).resolves.toEqual(imported);
    await expect(client.importAltsFromProfile("source", ["Alpha"])).resolves.toMatchObject({ added: 1 });
    expect(profileAction).toHaveBeenNthCalledWith(1, 7, "ALTS_OF_PROFILE", { profileKey: "source" });
    expect(profileAction).toHaveBeenNthCalledWith(2, 7, "IMPORT_ALTS_FROM_PROFILE", { sourceProfileKey: "source", usernames: ["Alpha"] });
    expect(get().alts).toEqual(imported);
  });

  it("imports parsed alt entries and updates store", async () => {
    const upsertAlt = jest.fn().mockImplementation((profileId, input) => {
      return Promise.resolve([input.alt]);
    });
    const client = new JNbotClient({ upsertAlt } as unknown as JNbotRuntime);
    const result = await client.importAltEntries([
      { username: "Player1", password: "pw1", premium: false, UID: null, ranks: {}, gkits: {} },
      { username: "Player2", password: "pw2", premium: true, UID: null, email: "p2@ex.com", ranks: {}, gkits: {} },
    ]);
    expect(result.added).toBe(2);
    expect(upsertAlt).toHaveBeenCalledTimes(2);
  });

  it("pauses subscriptions on background and resubscribes with state update on foreground", () => {
    let appStateCallback: ((state: string) => void) | undefined;
    const removeSub = jest.fn();
    const addEventListenerSpy = jest
      .spyOn(AppState, "addEventListener")
      .mockImplementation((_event, cb) => {
        appStateCallback = cb as (state: string) => void;
        return { remove: removeSub } as any;
      });

    const unsubscribeBackend = jest.fn();
    const subscribeBot = jest.fn().mockReturnValue(unsubscribeBackend);
    const botAction = jest.fn().mockResolvedValue(undefined);
    const client = new JNbotClient({
      subscribeBot,
      botAction,
    } as unknown as JNbotRuntime);

    const dummyBot = { botId: 1, username: "Steve", state: "online" } as any;
    const listener = jest.fn();

    const unsubscribe = client.subscribeBot(dummyBot, "inventory", listener);

    expect(subscribeBot).toHaveBeenCalledTimes(1);
    expect(botAction).toHaveBeenCalledWith(
      dummyBot,
      "sendInventoryPacket",
      undefined,
      true,
    );

    // Background app
    appStateCallback?.("background");
    expect(unsubscribeBackend).toHaveBeenCalledTimes(1);

    // Foreground app
    appStateCallback?.("active");
    expect(subscribeBot).toHaveBeenCalledTimes(2);
    expect(botAction).toHaveBeenCalledWith(
      dummyBot,
      "sendInventoryPacket",
      undefined,
      true,
    );

    // Clean unmount / unsubscribe
    unsubscribe();
    expect(unsubscribeBackend).toHaveBeenCalledTimes(2);
    expect(removeSub).toHaveBeenCalledTimes(1);

    addEventListenerSpy.mockRestore();
  });

  it("delivers the initial inventory returned by the bot action", async () => {
    const packet = { items: [], isInventory: true, inventoryStart: 9 };
    const subscribeBot = jest.fn().mockReturnValue(jest.fn());
    const botAction = jest.fn().mockResolvedValue(packet);
    const client = new JNbotClient({ subscribeBot, botAction } as unknown as JNbotRuntime);
    const bot = { botId: 1, username: "Steve" } as any;
    const listener = jest.fn();

    const unsubscribe = client.subscribeBot(bot, "inventory", listener);
    await Promise.resolve();

    expect(botAction).toHaveBeenCalledWith(bot, "sendInventoryPacket", undefined, true);
    expect(listener).toHaveBeenCalledWith(packet);
    expect(get().botInventories[1]).toEqual(packet);
    unsubscribe();
  });

  it("keeps a newer inventory publication over the initial action response", async () => {
    let publish: ((packet: unknown) => void) | undefined;
    let resolveAction: (packet: unknown) => void = () => undefined;
    const subscribeBot = jest.fn().mockImplementation((_bot, _event, listener) => {
      publish = listener;
      return jest.fn();
    });
    const botAction = jest.fn().mockReturnValue(new Promise((resolve) => { resolveAction = resolve; }));
    const client = new JNbotClient({ subscribeBot, botAction } as unknown as JNbotRuntime);
    const listener = jest.fn();
    const unsubscribe = client.subscribeBot({ botId: 1 } as any, "inventory", listener);

    const newer = { items: [{ name: "diamond" }] };
    publish?.(newer);
    resolveAction({ items: [] });
    await Promise.resolve();

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(newer);
    unsubscribe();
  });

  it("cleans up active subscriptions and listeners when destroyed", () => {
    const removeSub = jest.fn();
    const addEventListenerSpy = jest
      .spyOn(AppState, "addEventListener")
      .mockReturnValue({ remove: removeSub } as any);

    const unsubscribeBackend = jest.fn();
    const subscribeBot = jest.fn().mockReturnValue(unsubscribeBackend);
    const client = new JNbotClient({
      subscribeBot,
      botAction: jest.fn().mockResolvedValue(undefined),
    } as unknown as JNbotRuntime);

    const dummyBot = { botId: 1, username: "Steve", state: "online" } as any;
    client.subscribeBot(dummyBot, "inventory", jest.fn());

    expect(subscribeBot).toHaveBeenCalledTimes(1);

    client.destroy();
    expect(unsubscribeBackend).toHaveBeenCalledTimes(1);
    expect(removeSub).toHaveBeenCalledTimes(1);

    addEventListenerSpy.mockRestore();
  });
});

describe('plugin code review', () => {
  const bundle = (code: unknown, language = 'ts', revision = 'original') => ({
    bundle: { info: { language }, code }, revision,
  });
  const setup = (value = bundle({ code: 'const a = 1;' })) => {
    const exportPortablePlugin = jest.fn().mockResolvedValue(value);
    const savePluginCode = jest.fn().mockImplementation((_id: string, code: string) => ({ code }));
    const client = new JNbotClient({ exportPortablePlugin, savePluginCode } as unknown as JNbotRuntime);
    return { client, exportPortablePlugin, savePluginCode };
  };

  it('reads only installed JS/TS plugin source through the existing export', async () => {
    const { client, exportPortablePlugin } = setup();
    await expect(client.getPluginCode('example')).resolves.toEqual({ code: 'const a = 1;', language: 'ts', revision: 'original' });
    expect(exportPortablePlugin).toHaveBeenCalledWith('example');
    exportPortablePlugin.mockResolvedValue(bundle('let a = 2;', 'js'));
    await expect(client.getPluginCode('example')).resolves.toMatchObject({ code: 'let a = 2;' });
    exportPortablePlugin.mockResolvedValue(bundle({}, 'recording'));
    await expect(client.getPluginCode('example')).rejects.toThrow('Only JavaScript');
    exportPortablePlugin.mockResolvedValue(bundle({ invalid: true }));
    await expect(client.getPluginCode('example')).rejects.toThrow('no readable source');
  });

  it('refuses to overwrite a plugin changed since loading', async () => {
    const { client, savePluginCode } = setup(bundle('new code', 'ts', 'changed'));
    await expect(client.savePluginCode('example', 'my edit', 'original')).rejects.toThrow('changed since');
    expect(savePluginCode).not.toHaveBeenCalled();
  });

  it('accepts empty edits and requires the backend to confirm saved content', async () => {
    const { client, savePluginCode } = setup();
    await expect(client.savePluginCode('example', '', 'original')).resolves.toBeUndefined();
    expect(savePluginCode).toHaveBeenCalledWith('example', '');
    savePluginCode.mockResolvedValue(undefined);
    await expect(client.savePluginCode('example', 'edit', 'original')).rejects.toThrow('did not confirm');
  });

  it('deletes an installed plugin through the profile action and removes it locally', async () => {
    const profileAction = jest.fn().mockResolvedValue(true);
    const client = new JNbotClient({ profileAction } as unknown as JNbotRuntime);
    const plugin = { pluginId: 'example', name: 'Example' } as MacroInfo;
    const other = { pluginId: 'other', name: 'Other' } as MacroInfo;
    actions.setMacros([plugin, other]);

    await client.deletePlugin(plugin);

    expect(profileAction).toHaveBeenCalledWith(7, 'DELETE_MACRO', plugin);
    expect(get().macros.list).toEqual([other]);
  });
});
