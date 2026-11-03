import { reminderDueAt } from '../generated/client-contract/cooldowns';
import type { Cooldown, Stats } from "../store/types";
import type { MobileActivityStats } from "../generated/client-contract/mobileClientContract";
import { alignSeries } from "../generated/client-contract/statsHistory";

export type ActivityMetric = "onlineTime" | "botsJoined" | "scriptsStarted";

export type DashboardStats = Record<ActivityMetric, number> & {
  /** Weekly totals per metric, oldest → newest; the last one is the current week. */
  weeks: Record<ActivityMetric, number[]>;
};

const weeklyHistory = (history: MobileActivityStats["history"]): DashboardStats["weeks"] => ({
  onlineTime: alignSeries(history?.onlineTime),
  botsJoined: alignSeries(history?.botsJoined),
  scriptsStarted: alignSeries(history?.scriptsStarted),
});

export function dashboardStats(stats: Stats | MobileActivityStats): DashboardStats {
  const weeks = weeklyHistory(stats.history);
  if ("botsJoined" in stats) {
    return {
      botsJoined: Math.max(0, Number(stats.botsJoined) || 0),
      scriptsStarted: Math.max(0, Number(stats.scriptsStarted) || 0),
      onlineTime: Math.max(0, Number(stats.onlineTime) || 0),
      weeks,
    };
  }
  return {
    weeks,
    botsJoined: Object.values(stats.alts ?? {}).reduce(
      (total, alt) => total + Math.max(0, Number(alt?.joinCount) || 0),
      0,
    ),
    scriptsStarted: Object.values(stats.scripts ?? {}).reduce(
      (total, script) => total + Math.max(0, Number(script?.activeCount) || 0),
      0,
    ),
    onlineTime: Object.values(stats.alts ?? {}).reduce(
      (total, alt) => total + Math.max(0, Number(alt?.playTime) || 0),
      0,
    ),
  };
}

export function compactCount(value: number): string {
  const safe = Math.max(0, Number(value) || 0);
  if (safe < 1_000) return String(safe);
  if (safe < 100_000) {
    const formatted = (safe / 1_000).toFixed(1);
    return formatted.endsWith(".0") ? `${Math.floor(safe / 1_000)}k` : `${formatted}k`;
  }
  if (safe < 1_000_000) {
    return `${Math.round(safe / 1_000)}k`;
  }
  const formatted = (safe / 1_000_000).toFixed(1);
  return formatted.endsWith(".0") ? `${Math.floor(safe / 1_000_000)}M` : `${formatted}M`;
}

export function compactDuration(milliseconds: number): string {
  const safeMs = Math.max(0, Number(milliseconds) || 0);
  const minutes = Math.floor(safeMs / 60_000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  if (hours < 10 && remMinutes > 0) return `${hours}h ${remMinutes}m`;
  if (hours < 24) return `${hours}h`;
  const days = (safeMs / 86_400_000).toFixed(1);
  return `${days.endsWith('.0') ? days.slice(0, -2) : days}d`;
}

export type NextReminderInfo = {
  label: string;
  ready: boolean;
  hasReminders: boolean;
};

export function getNextReminderInfo(
  reminders: Cooldown[] | undefined,
  now: number = Date.now(),
): NextReminderInfo {
  if (!reminders || reminders.length === 0) {
    return { label: "—", ready: false, hasReminders: false };
  }

  const sorted = [...reminders].sort(
    (a, b) => reminderDueAt(a) - reminderDueAt(b),
  );
  const next = sorted[0];
  if (!next) {
    return { label: "—", ready: false, hasReminders: false };
  }

  const readyAt = reminderDueAt(next);
  const diff = readyAt - now;

  if (diff <= 0) {
    return { label: "Ready", ready: true, hasReminders: true };
  }

  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) {
    return { label: "<1m", ready: false, hasReminders: true };
  }
  if (minutes < 60) {
    return { label: `${minutes}m`, ready: false, hasReminders: true };
  }
  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  if (hours < 10 && remMinutes > 0) {
    return { label: `${hours}h ${remMinutes}m`, ready: false, hasReminders: true };
  }
  if (hours < 24) {
    return { label: `${hours}h`, ready: false, hasReminders: true };
  }
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  if (days < 10 && remHours > 0) {
    return { label: `${days}d ${remHours}h`, ready: false, hasReminders: true };
  }
  return { label: `${days}d`, ready: false, hasReminders: true };
}
