import { buildBackgroundNotification } from "./BackgroundNotification";
import type { ActiveScriptsType } from "../store/types";

const script = { name: "Mining", scriptId: "mining", instanceId: 1 };

describe("background notification", () => {
  it("separates connected bots from joining, queued and failed bots", () => {
    const result = buildBackgroundNotification({
      bots: [
        { username: "Miner", status: "connected", paused: false },
        { username: "Builder", status: "joining", paused: false },
        { username: "Waiting", status: "queued", paused: false },
        { username: "Offline", status: "failed", paused: false },
      ],
      scripts: { 1: script }, mode: "local", status: "connected",
    });
    expect(result.message).toBe("1 bot connected · 1 joining · 1 queued · 1 failed · 1 script running");
    expect(result.details).toContain("Miner · connected");
    expect(result.details).toContain("Builder · joining");
    expect(result.details).toContain("Mining · running");
  });

  it("shows script-only sessions and updates progress in the expanded text", () => {
    const input = {
      bots: [], scripts: { 1: { ...script, progress: { current: 2, total: 8 } } },
      mode: "local", status: "connected",
    } satisfies Parameters<typeof buildBackgroundNotification>[0];
    expect(buildBackgroundNotification(input)).toEqual({
      message: "1 script running",
      details: "Local runtime · connected\n\nScripts\nMining · 2/8 (25%)",
    });
    input.scripts[1].progress.current = 4;
    expect(buildBackgroundNotification(input).details).toContain("4/8 (50%)");
  });

  it("shows the runtime state and paused bot status", () => {
    expect(buildBackgroundNotification({
      bots: [{ username: "Miner", status: "connected", paused: true }],
      scripts: {}, mode: "remote", status: "disconnected",
    }).details).toBe("Remote runtime · disconnected\n\nBots\nMiner · connected, paused");
    expect(buildBackgroundNotification({
      bots: [], scripts: {}, mode: "local", status: "connected",
    })).toEqual({
      message: "Local runtime connected",
      details: "Local runtime · connected\nNo active bots or scripts",
    });
  });

  it("bounds the overview while retaining accurate totals", () => {
    const bots = Array.from({ length: 8 }, (_, i) => ({
      username: `Bot${i}`, status: "connected", paused: false,
    } satisfies Parameters<typeof buildBackgroundNotification>[0]["bots"][number]));
    const scripts: ActiveScriptsType = {};
    for (let i = 0; i < 7; i++) scripts[i] = { ...script, name: `Script${i}`, instanceId: i };
    const result = buildBackgroundNotification({ bots, scripts, mode: "local", status: "connected" });
    expect(result.message).toBe("8 bots connected · 7 scripts running");
    expect(result.details).toContain("Bot4 · connected\n+3 more");
    expect(result.details).toContain("Script4 · running\n+2 more");
    expect(result.details).not.toContain("Bot5");
    expect(result.details).not.toContain("Script5");
  });

  it("does not divide by zero when script progress has no known total", () => {
    const result = buildBackgroundNotification({
      bots: [], scripts: { 1: { ...script, progress: { current: 0, total: 0 } } },
      mode: "local", status: "connected",
    });
    expect(result.details).toContain("Mining · running");
    expect(result.details).not.toContain("NaN");
  });
});
