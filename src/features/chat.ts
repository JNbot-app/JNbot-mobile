import { create } from "zustand";

export interface ChatClick {
  action: "run_command" | "suggest_command" | "open_url" | "copy_to_clipboard" | "change_page";
  value: string;
}

export interface ChatPart {
  text: string;
  click?: ChatClick;
  hover?: string;
}

/** Plain ANSI string, or an object with parts when the line has click/hover events. */
export type ChatLine = string | { message: string; parts: ChatPart[] };

export function toChatLine(value: unknown): ChatLine {
  if (typeof value === "string") return value;
  const line = value as { message?: unknown; parts?: unknown } | null;
  if (line?.message === undefined) return String(value ?? "");
  return Array.isArray(line.parts)
    ? { message: String(line.message), parts: line.parts as ChatPart[] }
    : String(line.message);
}

export const chatLineText = (line: ChatLine) =>
  typeof line === "string" ? line : line.message;

const TOKEN_RE = /[A-Za-z0-9:,._*\-/]*$/;
const HISTORY_LIMIT = 50;

/** Replaces the word being typed with a tab-completion match, like the desktop chat bar. */
export function applyCompletion(query: string, match: string): string {
  const parts = query.split(" ");
  parts[parts.length - 1] = parts[parts.length - 1].replace(TOKEN_RE, "") + match;
  return parts.join(" ");
}

/** Normalizes a `tabComplete` result, which is either strings or `{ match }` objects. */
export function completionMatches(result: unknown): string[] {
  if (!Array.isArray(result)) return [];
  return result
    .map((item) => (typeof item === "string" ? item : (item as { match?: unknown } | null)?.match))
    .filter((match): match is string => typeof match === "string" && match.length > 0);
}

/** Messages sent from this device this session, newest first. */
export const useChatHistory = create<string[]>(() => []);

export function rememberChatMessage(message: string) {
  useChatHistory.setState(
    (history) => [message, ...history.filter((item) => item !== message)].slice(0, HISTORY_LIMIT),
    true,
  );
}
