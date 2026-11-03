import {
  appSettingsDraft,
  changedPatches,
  normalizeProxyConfig,
  redactProxyUrl,
  validatePort,
  validateProxyUrl,
} from "./appSettings";

describe("mobile app settings", () => {
  it("validates Minecraft ports", () => {
    expect(validatePort("25565")).toBe(25565);
    expect(validatePort("0")).toBeNull();
    expect(validatePort("65536")).toBeNull();
    expect(validatePort("abc")).toBeNull();
  });

  it("normalizes and validates SOCKS proxy pools", () => {
    expect(normalizeProxyConfig({ enabled: true, urls: [" host:1080 ", "host:1080"] })).toEqual({ enabled: true, urls: ["host:1080"] });
    expect(validateProxyUrl("host:1080")).toBeNull();
    expect(validateProxyUrl("http://host:8080")).toMatch(/SOCKS/);
    expect(redactProxyUrl("socks5://user:secret@host:1080")).not.toContain("secret");
  });

  it("only sends changed fields", () => {
    expect(changedPatches(
      { ip: "old", port: 25565 },
      { ip: "new", port: 25565 },
    )).toEqual([{ key: "ip", value: "new" }]);
  });

  it("does not treat implicit defaults as changes", () => {
    const persisted = appSettingsDraft({});
    expect(persisted.automation.worker_optimize_for_size).toBe(false);
    expect(persisted.bot.render_distance).toBe(12);
    expect(persisted.bot.auto_v4guard).toBe(true);
    expect(persisted.bot.autoResourcePackAccept).toBe(true);
    expect(persisted.bot.reduced_events).toBe(false);
    expect(changedPatches(persisted.bot, appSettingsDraft({}).bot)).toEqual([]);
    expect(changedPatches(persisted.server, appSettingsDraft({}).server)).toEqual([]);
    expect(changedPatches(persisted.automation, appSettingsDraft({}).automation)).toEqual([]);
    expect(changedPatches({ proxy: persisted.proxy }, { proxy: appSettingsDraft({}).proxy })).toEqual([]);
  });

  it("handles worker_optimize_for_size toggle patches", () => {
    const draft = appSettingsDraft({ worker_optimize_for_size: true });
    expect(draft.automation.worker_optimize_for_size).toBe(true);
    expect(
      changedPatches(
        appSettingsDraft({}).automation,
        draft.automation,
      ),
    ).toEqual([{ key: "worker_optimize_for_size", value: true }]);
  });

  it("detects render_distance and kick behavior changes", () => {
    const defaultDraft = appSettingsDraft({});
    const customKick = {
      rules: [{ id: "test", kickMessage: "kicked", action: 0 }],
      defaultAction: 1,
    };
    const updatedDraft = appSettingsDraft({
      render_distance: 4,
      kickBehaviour: customKick,
    });
    expect(updatedDraft.bot.render_distance).toBe(4);
    expect(updatedDraft.bot.kickBehaviour).toEqual(customKick);
    const patches = changedPatches(defaultDraft.bot, updatedDraft.bot);
    expect(patches).toEqual(
      expect.arrayContaining([
        { key: "render_distance", value: 4 },
        { key: "kickBehaviour", value: customKick },
      ]),
    );
  });
});
