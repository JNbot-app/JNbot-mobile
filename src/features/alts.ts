import type { AltWithData, ServerAltInfo } from '../store/types';
import { accountAuthenticationError } from './serverAuthentication';

export type AltDraft = { username: string; password: string; premium: boolean; ranks: Record<string, string>; gkits: Record<string, string[]> };

export const countAltRanks = (data?: ServerAltInfo): number =>
  Object.values(data?.ranks ?? {}).filter(Boolean).length;

export const countAltGkits = (data?: ServerAltInfo): number =>
  Object.values(data?.gkits ?? {}).reduce((total, gkits) => total + gkits.length, 0);

export const draftFromAlt = (alt?: AltWithData, onlineMode = false): AltDraft => ({ username: alt?.username ?? '', password: alt?.data.password ?? '', premium: onlineMode || alt?.data.premium === true, ranks: { ...(alt?.data.ranks ?? {}) }, gkits: Object.fromEntries(Object.entries(alt?.data.gkits ?? {}).map(([key, value]) => [key, [...value]])) });

export function validateAltDraft(draft: AltDraft, alts: AltWithData[], originalUsername?: string, onlineMode = false): string | null {
  const username = draft.username.trim();
  if (!/^[A-Za-z0-9_]{3,16}$/.test(username)) return 'Use 3–16 letters, numbers, or underscores.';
  if (alts.some((alt) => alt.username.toLowerCase() === username.toLowerCase() && alt.username.toLowerCase() !== originalUsername?.toLowerCase())) return 'This alt already exists in this profile.';
  const authenticationError = accountAuthenticationError({ ...draft, premium: onlineMode || draft.premium }, onlineMode);
  if (authenticationError) return authenticationError;
  return null;
}

export function altFromDraft(draft: AltDraft, existing?: AltWithData, onlineMode = false): AltWithData {
  const premium = onlineMode || draft.premium;
  const data: ServerAltInfo = { premium, password: draft.password.trim() || undefined, ranks: Object.fromEntries(Object.entries(draft.ranks).filter(([, value]) => value)), gkits: Object.fromEntries(Object.entries(draft.gkits).filter(([, value]) => value.length > 0)) };
  return { username: draft.username.trim(), email: existing?.email, UID: existing?.UID, data };
}
