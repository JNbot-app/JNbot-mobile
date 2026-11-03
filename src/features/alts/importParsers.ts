import type { AltWithData, ServerAltInfo } from '../../store/types';
import type { ImportEntry, ImportFileParseResult } from './importTypes';
import { accountAuthenticationError } from '../serverAuthentication';

export function isValidUsername(username: string): boolean {
  const u = username.trim();
  return u.length >= 3 && u.length <= 24;
}

export function isValidPassword(password: string): boolean {
  const p = password.trim();
  return p.length <= 45;
}

export function extractEntriesFromJson(
  raw: unknown,
  destinationProfileId?: string,
  allProfiles: { id: string }[] = [],
  onlineMode = false,
): ImportFileParseResult {
  let altsArray: unknown[] | null = null;
  let srcProfile: string | null = null;

  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const rawObj = raw as Record<string, unknown>;
    if (Array.isArray(rawObj.alts)) {
      altsArray = rawObj.alts;
      srcProfile = typeof rawObj.profileId === 'string' ? rawObj.profileId : null;
    } else {
      const candidates = [
        rawObj.accounts,
        rawObj.users,
        rawObj.players,
        rawObj.profiles,
        rawObj.data,
      ];
      for (const candidate of candidates) {
        if (Array.isArray(candidate)) {
          altsArray = candidate;
          break;
        }
      }
      if (!altsArray) {
        altsArray = Object.values(rawObj);
      }
      srcProfile = null;
    }
  } else if (Array.isArray(raw)) {
    altsArray = raw;
    srcProfile = null;
  }

  if (!Array.isArray(altsArray) || altsArray.length === 0) {
    throw new Error('No Minecraft accounts found in this JSON file.');
  }

  const lookupKey = srcProfile ?? destinationProfileId;

  const entries: ImportEntry[] = altsArray
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const a = item as Record<string, unknown>;
      const username = String(a.username || a.name || '').trim();
      if (!username) return null;

      let serverData: Partial<ServerAltInfo> & { password?: string } = {};
      if (a.data && typeof a.data === 'object') {
        serverData = a.data as Partial<ServerAltInfo>;
      } else if (lookupKey && a[lookupKey] && typeof a[lookupKey] === 'object') {
        serverData = a[lookupKey] as Partial<ServerAltInfo>;
      } else {
        for (const p of allProfiles) {
          if (a[p.id] && typeof a[p.id] === 'object') {
            serverData = a[p.id] as Partial<ServerAltInfo>;
            if (serverData.password) break;
          }
        }
      }

      const password = String(serverData.password || a.password || '').trim();
      const ranks =
        serverData.ranks && typeof serverData.ranks === 'object'
          ? (serverData.ranks as Record<string, string>)
          : {};
      const gkits =
        serverData.gkits && typeof serverData.gkits === 'object'
          ? (serverData.gkits as Record<string, string[]>)
          : {};

      return {
        username,
        premium:
          serverData.premium === true ||
          (serverData.premium === undefined && a.premium === true),
        UID: typeof a.UID === 'string' ? a.UID : null,
        email: typeof a.email === 'string' ? a.email : undefined,
        password,
        ranks,
        gkits,
      } as ImportEntry;
    })
    .filter((e): e is ImportEntry => {
      if (!e) return false;
      return isValidUsername(e.username) && accountAuthenticationError(e, onlineMode) === null;
    });

  if (entries.length === 0) {
    throw new Error(onlineMode ? 'No valid premium accounts found in this file.' : 'No valid accounts found in this file.');
  }

  return { entries, srcProfile };
}

export function extractEntriesFromText(
  text: string,
  destinationProfileId?: string,
  onlineMode = false,
): ImportFileParseResult {
  const lines = text.split(/\r?\n/);
  const entries: ImportEntry[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || line.startsWith('//')) continue;

    let username = line;
    let password = '';

    if (line.includes(' ')) {
      const parts = line.split(/\s+/);
      username = parts[0] ?? '';
      password = parts.slice(1).join(' ');
    } else if (line.includes(':')) {
      const parts = line.split(':');
      username = parts[0] ?? '';
      password = parts.slice(1).join(':');
    }

    username = username.trim();
    password = password.trim();

    if (isValidUsername(username) && accountAuthenticationError({ premium: false, password }, onlineMode) === null) {
      entries.push({
        username,
        premium: false,
        UID: null,
        email: undefined,
        password,
        ranks: {},
        gkits: {},
      });
    }
  }

  if (entries.length === 0) {
    throw new Error('No valid username and password pairs found.');
  }

  return {
    entries,
    srcProfile: destinationProfileId ?? null,
  };
}

export function parseAltsFileContent(
  content: string,
  destinationProfileId?: string,
  allProfiles: { id: string }[] = [],
  onlineMode = false,
): ImportFileParseResult {
  const trimmed = content.trim();
  if (!trimmed) {
    throw new Error('File is empty.');
  }

  try {
    const parsedJson = JSON.parse(trimmed);
    return extractEntriesFromJson(parsedJson, destinationProfileId, allProfiles, onlineMode);
  } catch (jsonErr) {
    // If not JSON, parse as text lines
    return extractEntriesFromText(trimmed, destinationProfileId, onlineMode);
  }
}

export function convertImportEntryToAlt(
  entry: ImportEntry,
  existingAlt?: AltWithData,
  canImportRanksGkits = false,
): AltWithData {
  const serverData: ServerAltInfo = {
    password: entry.password.trim() || undefined,
    ranks: canImportRanksGkits ? entry.ranks : (existingAlt?.data?.ranks ?? {}),
    gkits: canImportRanksGkits ? entry.gkits : (existingAlt?.data?.gkits ?? {}),
  };
  serverData.premium =
    entry.premium || existingAlt?.data?.premium || undefined;

  return {
    username: entry.username.trim(),
    email: entry.premium ? entry.email?.trim() || existingAlt?.email : existingAlt?.email,
    UID: existingAlt?.UID ?? entry.UID ?? undefined,
    data: serverData,
  };
}
