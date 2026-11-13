import type { AppSettingsPatch } from "../runtime/types";

export type ProxyConfig = { enabled: boolean; urls: string[] };

export enum KickBehaviorOptions {
  RETRY = 0,
  PAUSE = 1,
  SKIP = 2,
}

export interface KickBehaviorRule {
  id: string;
  kickMessage: string;
  action: KickBehaviorOptions;
}

export interface KickBehaviorConfig {
  rules: KickBehaviorRule[];
  defaultAction: KickBehaviorOptions;
}

export const defaultKickBehaviorConfig: KickBehaviorConfig = {
  rules: [
    {
      id: "0",
      kickMessage: "https://v4g.to",
      action: KickBehaviorOptions.PAUSE,
    },
    {
      id: "1",
      kickMessage: "we're receiving too many connections, please try to connect again in a few",
      action: KickBehaviorOptions.PAUSE,
    },
    {
      id: "2",
      kickMessage: "wrong password",
      action: KickBehaviorOptions.SKIP,
    },
    {
      id: "3",
      kickMessage: "You are already connected to this proxy",
      action: KickBehaviorOptions.PAUSE,
    },
    {
      id: "4",
      kickMessage: "You are already logged on to this server",
      action: KickBehaviorOptions.PAUSE,
    },
  ],
  defaultAction: KickBehaviorOptions.RETRY,
};

export function normalizeKickBehaviorConfig(value: unknown): KickBehaviorConfig {
  if (!value || typeof value !== "object") {
    return defaultKickBehaviorConfig;
  }
  const raw = value as Partial<KickBehaviorConfig>;
  const defaultAction =
    typeof raw.defaultAction === "number" && (raw.defaultAction in KickBehaviorOptions)
      ? (raw.defaultAction as KickBehaviorOptions)
      : KickBehaviorOptions.RETRY;
  const rawRules = Array.isArray(raw.rules) ? raw.rules : null;
  const rules = rawRules
    ? rawRules
        .filter((r) => Boolean(r && typeof r === "object"))
        .map((r, index) => {
          const item = r as unknown as Record<string, unknown>;
          return {
            id: String(item.id ?? index),
            kickMessage: String(item.kickMessage ?? ""),
            action:
              typeof item.action === "number" && (item.action in KickBehaviorOptions)
                ? (item.action as KickBehaviorOptions)
                : KickBehaviorOptions.RETRY,
          };
        })
    : defaultKickBehaviorConfig.rules;
  return { rules, defaultAction };
}

export type AppSettingsDraft = {
  bot: Record<string, unknown>;
  server: Record<string, unknown>;
  automation: Record<string, unknown>;
  proxy: ProxyConfig;
};

const PROTOCOL = /^([a-z][a-z0-9+.-]*):\/\//i;

export function normalizeProxyConfig(value: unknown): ProxyConfig {
  const raw = value && typeof value === "object"
    ? value as { enabled?: unknown; urls?: unknown; url?: unknown }
    : {};
  const candidates = Array.isArray(raw.urls)
    ? raw.urls
    : typeof raw.url === "string"
      ? [raw.url]
      : [];
  return {
    enabled: raw.enabled === true,
    urls: [...new Set(candidates.map(String).map((url) => url.trim()).filter(Boolean))],
  };
}

export function appSettingsDraft(
  settings: Record<string, unknown>,
): AppSettingsDraft {
  const bot: Record<string, unknown> = {
    version: String(settings.version ?? "1.8.9"),
    ip: String(settings.ip ?? ""),
    port: Number(settings.port ?? 25565),
    serverIpRotation: settings.serverIpRotation === true,
    retryOnLoginFail: settings.retryOnLoginFail !== false,
    joinServerTimeout: Number(settings.joinServerTimeout ?? 10000),
    auto_v4guard: settings.auto_v4guard !== false,
    autoResourcePackAccept: settings.autoResourcePackAccept !== false,
    render_distance: Number(settings.render_distance ?? 12),
    reduced_events: settings.reduced_events === true,
    captcha_prompt: settings.captcha_prompt === true,
    kickBehaviour: normalizeKickBehaviorConfig(settings.kickBehaviour),
  };

  return {
    bot,
    server: bot,
    automation: {
      join_delay: Number(settings.join_delay ?? 2500),
      delay_between_actions: Number(settings.delay_between_actions ?? 250),
      worker_optimize_for_size: settings.worker_optimize_for_size === true,
    },
    proxy: normalizeProxyConfig(settings.proxy),
  };
}

export function validateProxyUrl(input: string): string | null {
  const raw = input.trim();
  if (!raw) return "Enter a proxy address.";
  const protocol = (raw.match(PROTOCOL)?.[1] ?? "socks5").toLowerCase();
  if (!["socks", "socks4", "socks4a", "socks5", "socks5h"].includes(protocol))
    return "Only SOCKS4 and SOCKS5 proxies are supported.";
  try {
    const parsed = new URL(PROTOCOL.test(raw) ? raw : `socks5://${raw}`);
    if (!parsed.hostname || !parsed.port) return "Include a proxy host and port.";
  } catch {
    return "This proxy address is not valid.";
  }
  return null;
}

export function redactProxyUrl(input: string): string {
  return input
    .replace(/(\/\/[^:/@\s]+:)[^@/\s]+@/, "$1••••••@")
    .replace(/^([^:/@\s]+:)[^@/\s]+@/, "$1••••••@");
}

export function validatePort(input: string): number | null {
  const value = Number(input);
  return Number.isInteger(value) && value >= 1 && value <= 65535 ? value : null;
}

export function changedPatches(
  current: Record<string, unknown>,
  next: Record<string, unknown>,
): AppSettingsPatch[] {
  return Object.entries(next)
    .filter(([key, value]) => JSON.stringify(current[key]) !== JSON.stringify(value))
    .map(([key, value]) => ({ key, value }));
}
