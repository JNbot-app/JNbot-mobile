import { actions, get, selectProfileReady } from "../store/store";

const mockSnapshot = (profileId = 1, profileKey = "jartex") => ({
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

describe("selectProfileReady selector", () => {
  beforeEach(() => {
    actions.reset();
  });

  it("is false initially when no profile is active", () => {
    expect(selectProfileReady(get())).toBe(false);
  });

  it("is false during profile selection before snapshot is applied", () => {
    actions.beginProfileSelection("jartex");
    expect(get().activeProfileKey).toBe("jartex");
    expect(get().profileReady).toBe(false);
    expect(selectProfileReady(get())).toBe(false);
  });

  it("is true after snapshot is successfully applied", () => {
    actions.beginProfileSelection("jartex");
    actions.applyProfileSnapshot(1, mockSnapshot(1, "jartex"));
    expect(get().profileReady).toBe(true);
    expect(get().activeProfileId).toBe(1);
    expect(selectProfileReady(get())).toBe(true);
  });

  it("becomes false again when profile selection is cleared", () => {
    actions.beginProfileSelection("jartex");
    actions.applyProfileSnapshot(1, mockSnapshot(1, "jartex"));
    expect(selectProfileReady(get())).toBe(true);

    actions.clearProfileSelection();
    expect(selectProfileReady(get())).toBe(false);
  });
});
