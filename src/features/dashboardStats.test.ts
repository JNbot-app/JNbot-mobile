import { compactCount, compactDuration, dashboardStats, getNextReminderInfo } from "./dashboardStats";
import type { Cooldown } from "../store/types";
import { weekIndex } from "../generated/client-contract/statsHistory";

describe("dashboardStats", () => {
  it("aggregates persisted lifetime activity", () => {
    expect(dashboardStats({
      alts: {
        one: { joinCount: 3, lastJoined: null, playTime: 60_000, createdOn: 0 },
        two: { joinCount: 2, lastJoined: null, playTime: 3_600_000, createdOn: 0 },
      },
      scripts: {
        chat: { activeCount: 4, lastActive: null, runTime: 0 },
        macro: { activeCount: 6, lastActive: null, runTime: 0 },
      },
    })).toMatchObject({ botsJoined: 5, scriptsStarted: 10, onlineTime: 3_660_000 });
  });

  it("formats compact counts", () => {
    expect(compactCount(0)).toBe("0");
    expect(compactCount(12)).toBe("12");
    expect(compactCount(999)).toBe("999");
    expect(compactCount(1_200)).toBe("1.2k");
    expect(compactCount(11_307)).toBe("11.3k");
    expect(compactCount(53_937)).toBe("53.9k");
    expect(compactCount(120_000)).toBe("120k");
    expect(compactCount(1_200_000)).toBe("1.2M");
  });

  it("formats compact durations with granularity", () => {
    expect(compactDuration(0)).toBe("0m");
    expect(compactDuration(45 * 60_000)).toBe("45m");
    expect(compactDuration(60 * 60_000)).toBe("1h");
    expect(compactDuration(90 * 60_000)).toBe("1h 30m");
    expect(compactDuration(14 * 3_600_000)).toBe("14h");
    expect(compactDuration(28 * 3_600_000)).toBe("1d 4h");
    expect(compactDuration(240 * 3_600_000)).toBe("10d");
  });

  it("accepts the compact mobile publication without retaining the stats DB", () => {
    expect(dashboardStats({ botsJoined: 7, scriptsStarted: 8, onlineTime: 9 }))
      .toMatchObject({ botsJoined: 7, scriptsStarted: 8, onlineTime: 9 });
  });

  it("aligns weekly history so the last value is the current week", () => {
    const week = weekIndex();
    const { weeks } = dashboardStats({
      botsJoined: 3,
      scriptsStarted: 0,
      onlineTime: 0,
      history: { botsJoined: { week: week - 2, values: [1, 2] } },
    });
    expect(weeks.botsJoined).toEqual([1, 2, 0, 0]);
    expect(weeks.onlineTime).toEqual([]);
  });

  describe("getNextReminderInfo", () => {
    const base: Cooldown = {
      id: "cd-1",
      name: "Weekly Kit",
      pluginId: "plugin-1",
      time: 1_000_000,
      cooldown: 3_600_000,
    };

    it("handles undefined or empty reminders", () => {
      expect(getNextReminderInfo(undefined)).toEqual({ label: "—", ready: false, hasReminders: false });
      expect(getNextReminderInfo([])).toEqual({ label: "—", ready: false, hasReminders: false });
    });

    it("returns Ready when a cooldown has expired", () => {
      const now = 5_000_000; // after 1_000_000 + 3_600_000 = 4_600_000
      expect(getNextReminderInfo([base], now)).toEqual({ label: "Ready", ready: true, hasReminders: true });
    });

    it("formats short countdowns when upcoming", () => {
      const readyAt = base.time + base.cooldown; // 4_600_000
      expect(getNextReminderInfo([base], readyAt - 30_000)).toEqual({ label: "<1m", ready: false, hasReminders: true });
      expect(getNextReminderInfo([base], readyAt - 45 * 60_000)).toEqual({ label: "45m", ready: false, hasReminders: true });
      expect(getNextReminderInfo([base], readyAt - (2 * 3_600_000 + 15 * 60_000))).toEqual({ label: "2h 15m", ready: false, hasReminders: true });
      expect(getNextReminderInfo([base], readyAt - 28 * 3_600_000)).toEqual({ label: "1d 4h", ready: false, hasReminders: true });
    });

    it("picks the earliest upcoming reminder", () => {
      const earlier: Cooldown = {
        id: "cd-2",
        name: "Daily Kit",
        pluginId: "plugin-2",
        time: 1_000_000,
        cooldown: 1_800_000, // ready at 2_800_000
      };
      const now = 1_000_000;
      expect(getNextReminderInfo([base, earlier], now)).toEqual({ label: "30m", ready: false, hasReminders: true });
    });
  });
});


test("schedule countdowns share the cooldown ordering", () => {
  expect(getNextReminderInfo([{ kind: 'schedule', id: 's', name: 'Mining', pluginId: 'miner', nextRunAt: 180000, autoStart: true }], 60000)).toEqual({ label: '2m', ready: false, hasReminders: true });
});
