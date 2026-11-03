import { reminderDueAt, repeatInterval } from "../generated/client-contract/cooldowns";
import type { RuntimeConnectionState } from "../runtime/types";
import type { ActiveBot, Cooldown } from "../store/types";
import type { ThemeColors } from "../theme/theme";

// Read by the native widgets (modules/jnbot-widgets, targets/widget). Bump `v` on breaking changes.
const MAX_ITEMS = 8;

export type WidgetBotState = "online" | "paused" | "joining" | "queued" | "failed";

export type WidgetSnapshot = {
  v: 1;
  updatedAt: number;
  profile: string | null;
  live: boolean;
  colors: Record<"bg" | "surface" | "text" | "muted" | "faint" | "primary" | "success" | "warning" | "danger", string>;
  bots: { id: number; name: string; script: string; state: WidgetBotState }[];
  botCount: number;
  online: number;
  /** startAt is 0 when there is no known interval (one-time schedules). */
  cooldowns: { id: string; name: string; startAt: number; dueAt: number }[];
};

const STATE_ORDER: Record<WidgetBotState, number> = { online: 0, paused: 1, joining: 2, queued: 3, failed: 4 };

function botState(bot: Pick<ActiveBot, "status" | "paused">): WidgetBotState {
  if (bot.status !== "connected") return bot.status;
  return bot.paused ? "paused" : "online";
}

function cooldownStart(reminder: Cooldown, dueAt: number) {
  if (reminder.kind !== "schedule") return reminder.time;
  const interval = repeatInterval(reminder.repeat);
  return Number.isFinite(interval) && interval > 0 ? dueAt - interval : 0;
}

export function buildWidgetSnapshot({
  bots,
  reminders,
  profile,
  status,
  colors,
  now = Date.now(),
}: {
  bots: ActiveBot[];
  reminders: Cooldown[];
  profile: string | null;
  status: RuntimeConnectionState;
  colors: ThemeColors;
  now?: number;
}): WidgetSnapshot {
  const widgetBots = bots
    .map((bot) => ({ id: bot.botId, name: bot.username || "Bot", script: bot.SCRIPT_NAME ?? "", state: botState(bot) }))
    .sort((a, b) => STATE_ORDER[a.state] - STATE_ORDER[b.state]);
  const cooldowns = reminders
    .map((reminder) => {
      const dueAt = reminderDueAt(reminder);
      return { id: reminder.id, name: reminder.name, startAt: cooldownStart(reminder, dueAt), dueAt };
    })
    .filter((cooldown) => Number.isSafeInteger(cooldown.dueAt))
    .sort((a, b) => a.dueAt - b.dueAt);

  return {
    v: 1,
    updatedAt: now,
    profile,
    live: status === "connected",
    colors: {
      bg: colors.bgElevated,
      surface: colors.surfaceAlt,
      text: colors.text,
      muted: colors.textMuted,
      faint: colors.textFaint,
      primary: colors.primary,
      success: colors.online,
      warning: colors.paused,
      danger: colors.danger,
    },
    bots: widgetBots.slice(0, MAX_ITEMS),
    botCount: widgetBots.length,
    online: widgetBots.filter((bot) => bot.state === "online").length,
    cooldowns: cooldowns.slice(0, MAX_ITEMS),
  };
}
