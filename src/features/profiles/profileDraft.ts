import type { ProfileCreationAdvanced, ProfileCreationSection, ProfilePluginReference } from '../../generated/client-contract/mobileClientContract';
import { parseProfileAdvanced, type ProfilePluginChoice } from '../../generated/client-contract/profileCreation';

export const PROFILE_SECTIONS: { id: ProfileCreationSection; title: string }[] = [
  { id: 'gamemodes', title: 'Gamemodes' }, { id: 'ranks', title: 'Ranks & kits' },
  { id: 'identity', title: 'Look' }, { id: 'connection', title: 'Other addresses' },
  { id: 'scripts', title: 'Dashboard scripts' },
  { id: 'botExtension', title: 'Bot action' }, { id: 'defaults', title: 'Default settings' },
];

const SECTION_FIELDS = {
  identity: ['shortName', 'icon', 'color'], connection: ['ips'],
  gamemodes: ['gamemodes', 'kitGamemodes', 'defaultGamemode', 'joinBehaviours'],
  ranks: ['ranksGkits'], scripts: ['scripts', 'disallowedPlugins'],
  botExtension: ['botExtensionAction'], defaults: ['appSettingsDefaults'],
} satisfies Record<ProfileCreationSection, (keyof ProfileCreationAdvanced)[]>;

export function validateAdvanced(value: ProfileCreationAdvanced, plugins: readonly ProfilePluginChoice[], section?: ProfileCreationSection) {
  const input = section ? Object.fromEntries(SECTION_FIELDS[section].map((key) => [key, value[key]])) : value;
  try { parseProfileAdvanced(input, plugins); return null; }
  catch (error) { return error instanceof Error ? error.message : 'Unable to validate profile options.'; }
}

export function errorSection(message: string): ProfileCreationSection | undefined {
  return PROFILE_SECTIONS.find((section) => message.startsWith(`[${section.id}]`))?.id;
}
export function errorMessage(message: string) { return message.replace(/^\[\w+\]\s*/, ''); }

export function sectionSummary(section: ProfileCreationSection, value: ProfileCreationAdvanced): string | null {
  switch (section) {
    case 'identity': return value.shortName || value.icon || value.color ? 'Customized' : null;
    case 'connection': return value.ips?.length ? `${value.ips.length} additional addresses` : null;
    case 'gamemodes': return value.gamemodes?.length ? `${value.gamemodes.length} gamemodes` : null;
    case 'ranks': {
      const modes = Object.values(value.ranksGkits ?? {});
      const ranks = modes.reduce((n, mode) => n + Object.keys(mode.ranks).length, 0);
      const kits = modes.reduce((n, mode) => n + Object.keys(mode.gkits).length, 0);
      return ranks || kits ? `${ranks} ranks · ${kits} GKits` : null;
    }
    case 'scripts': return value.scripts?.length || value.disallowedPlugins?.length ? `${value.scripts?.length ?? 0} scripts · ${value.disallowedPlugins?.length ?? 0} blocked` : null;
    case 'botExtension': return value.botExtensionAction ? 'Configured' : null;
    case 'defaults': {
      const count = Object.keys(value.appSettingsDefaults ?? {}).length;
      return count ? `${count} overrides` : null;
    }
  }
}

/** Split what people paste ("https://play.x.net:25566/") into host and port. */
export function parseAddress(raw: string): { host: string; port: number } {
  const clean = raw.trim().replace(/^[a-z]+:\/\//i, '').replace(/\/.*$/, '').replace(/:$/, '');
  const match = clean.match(/^(.+?):(\d{1,5})$/);
  const port = match ? Number(match[2]) : 25565;
  return { host: (match ? match[1] : clean).toLowerCase(), port: port >= 1 && port <= 65535 ? port : 25565 };
}

/** "play.jartexnetwork.com" → "Jartexnetwork". */
export function guessServerName(host: string): string {
  const labels = host.split('.').filter(Boolean);
  if (labels.length > 2 && /^(play|mc|join|hub|www|server|srv)$/.test(labels[0])) labels.shift();
  const base = labels[0] ?? '';
  return /^\d+$/.test(base) ? '' : base.charAt(0).toUpperCase() + base.slice(1);
}

export function setGamemodes(value: ProfileCreationAdvanced, input: string[]): ProfileCreationAdvanced {
  // Gamemode ids are alphanumeric; clean what was typed instead of rejecting it.
  const gamemodes = [...new Set(input.map((mode) => mode.replace(/[^a-zA-Z0-9]/g, '')).filter(Boolean))];
  const keys = new Set(gamemodes.map((mode) => mode.toLowerCase()));
  return {
    ...value, gamemodes,
    defaultGamemode: gamemodes.includes(value.defaultGamemode ?? '') ? value.defaultGamemode : gamemodes[0] ?? '',
    kitGamemodes: (value.kitGamemodes ?? []).filter((mode) => gamemodes.includes(mode)),
    joinBehaviours: Object.fromEntries(Object.entries(value.joinBehaviours ?? {}).filter(([key]) => keys.has(key))),
    ranksGkits: Object.fromEntries(Object.entries(value.ranksGkits ?? {}).filter(([key]) => keys.has(key))),
  };
}

export function selectProfilePlugins(current: ProfilePluginReference[], pluginIds: string[]): ProfilePluginReference[] {
  const existing = current.filter((ref) => pluginIds.includes(ref.pluginId));
  const newIds = pluginIds.filter((id) => !existing.some((ref) => ref.pluginId === id));
  return [...existing, ...newIds.map((pluginId) => ({ id: pluginId, pluginId, source: { kind: 'plugin' as const, pluginId } }))]
    .map((ref, index) => ({ ...ref, order: (index + 1) * 10 }));
}
