import { darkPalette } from "../theme/theme";
import type { ActiveBot, Cooldown } from "../store/types";
import { buildWidgetSnapshot } from "./widgetSnapshot";

const now = 1_000_000_000_000;
const bot = (botId: number, status: ActiveBot["status"], paused = false) =>
  ({ botId, username: `bot${botId}`, SCRIPT_NAME: "Mining", status, paused }) as ActiveBot;

describe("buildWidgetSnapshot", () => {
  it("orders bots by state and counts online ones", () => {
    const snapshot = buildWidgetSnapshot({
      bots: [bot(1, "queued"), bot(2, "connected", true), bot(3, "connected")],
      reminders: [],
      profile: "Main",
      status: "connected",
      colors: darkPalette,
      now,
    });
    expect(snapshot.bots.map((b) => [b.id, b.state])).toEqual([[3, "online"], [2, "paused"], [1, "queued"]]);
    expect(snapshot).toMatchObject({ online: 1, botCount: 3, live: true, profile: "Main", updatedAt: now });
  });

  it("sorts cooldowns by due time and derives their start", () => {
    const reminders = [
      { id: "s", name: "Weekly", pluginId: "p", kind: "schedule", nextRunAt: now + 5_000, repeat: { every: 1, unit: "hour" } },
      { id: "o", name: "Once", pluginId: "p", kind: "schedule", nextRunAt: now + 9_000 },
      { id: "c", name: "Kit", pluginId: "p", cooldown: 2_000, time: now },
    ] as Cooldown[];
    const snapshot = buildWidgetSnapshot({ bots: [], reminders, profile: null, status: "idle", colors: darkPalette, now });
    expect(snapshot.cooldowns).toEqual([
      { id: "c", name: "Kit", startAt: now, dueAt: now + 2_000 },
      { id: "s", name: "Weekly", startAt: now + 5_000 - 3_600_000, dueAt: now + 5_000 },
      { id: "o", name: "Once", startAt: 0, dueAt: now + 9_000 },
    ]);
    expect(snapshot.live).toBe(false);
  });
});
