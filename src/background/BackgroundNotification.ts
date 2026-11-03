import type { ActiveBot, ActiveScriptsType } from "../store/types";
import type { ActiveRuntimeMode, RuntimeConnectionState } from "../runtime/types";

const MAX_ITEMS = 5;

function appendSection(lines: string[], title: string, items: string[]) {
  if (!items.length) return;
  lines.push("", title, ...items.slice(0, MAX_ITEMS));
  if (items.length > MAX_ITEMS) lines.push(`+${items.length - MAX_ITEMS} more`);
}

export function buildBackgroundNotification({
  bots,
  scripts,
  mode,
  status,
}: {
  bots: Pick<ActiveBot, "username" | "status" | "paused">[];
  scripts: ActiveScriptsType;
  mode: ActiveRuntimeMode | null;
  status: RuntimeConnectionState;
}) {
  const runningScripts = Object.values(scripts);
  const counts = { connected: 0, joining: 0, queued: 0, failed: 0 };
  for (const bot of bots) counts[bot.status]++;
  const summary: string[] = [];
  if (counts.connected) {
    summary.push(`${counts.connected} ${counts.connected === 1 ? "bot" : "bots"} connected`);
  }
  for (const state of ["joining", "queued", "failed"] as const) {
    if (counts[state]) summary.push(`${counts[state]} ${state}`);
  }
  if (runningScripts.length) {
    summary.push(`${runningScripts.length} ${runningScripts.length === 1 ? "script" : "scripts"} running`);
  }

  const runtime = mode === "remote" ? "Remote runtime" : "Local runtime";
  const message = summary.length ? summary.join(" · ") : `${runtime} ${status}`;
  const lines = [`${runtime} · ${status}`];
  appendSection(lines, "Bots", bots.map((bot) =>
    `${bot.username || "Bot"} · ${bot.paused ? `${bot.status}, paused` : bot.status}`,
  ));
  appendSection(lines, "Scripts", runningScripts.map((script) => {
    const progress = script.progress;
    if (!progress || progress.total <= 0) return `${script.name} · running`;
    const percent = Math.round(Math.max(0, Math.min(1, progress.current / progress.total)) * 100);
    return `${script.name} · ${progress.current}/${progress.total} (${percent}%)`;
  }));
  if (!bots.length && !runningScripts.length) lines.push("No active bots or scripts");
  return { message, details: lines.join("\n") };
}
