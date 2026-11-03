import type { MacroInfo } from '../../store/types';

export type PluginMetadata = Record<string, { folder?: string }>;
export type PluginSortOrder = 'date' | 'name';

export type PluginFolderPreferences = {
  extraFolders: string[];
  sortOrder: PluginSortOrder;
};

const STORAGE_KEY = 'jnbot_plugins_ui_v1';
const DEFAULT_PREFERENCES: PluginFolderPreferences = {
  extraFolders: [],
  sortOrder: 'date',
};

async function getStorage() {
  const module = await import('@react-native-async-storage/async-storage');
  return module.default ?? module;
}

export async function loadPluginFolderPreferences(): Promise<PluginFolderPreferences> {
  try {
    const raw = await (await getStorage()).getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const value = JSON.parse(raw) as Partial<PluginFolderPreferences>;
    return {
      extraFolders: Array.isArray(value.extraFolders)
        ? uniqueFolderNames(value.extraFolders.filter((name): name is string => typeof name === 'string'))
        : [],
      sortOrder: value.sortOrder === 'name' ? 'name' : 'date',
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export async function savePluginFolderPreferences(
  preferences: PluginFolderPreferences,
): Promise<void> {
  try {
    await (await getStorage()).setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch (error) {
    console.warn('[PluginFolders] Failed to save preferences:', error);
  }
}

export function folderNames(
  plugins: MacroInfo[],
  metadata: PluginMetadata,
  extraFolders: string[],
): string[] {
  return uniqueFolderNames([
    ...plugins.map((plugin) => metadata[plugin.pluginId]?.folder).filter((folder): folder is string => Boolean(folder)),
    ...extraFolders,
  ]).sort((a, b) => a.localeCompare(b));
}

export function folderCounts(
  plugins: MacroInfo[],
  metadata: PluginMetadata,
): { folders: Record<string, number>; unorganized: number } {
  const folders: Record<string, number> = {};
  let unorganized = 0;
  for (const plugin of plugins) {
    const folder = metadata[plugin.pluginId]?.folder;
    if (folder) folders[folder] = (folders[folder] ?? 0) + 1;
    else unorganized += 1;
  }
  return { folders, unorganized };
}

export function visiblePlugins(
  plugins: MacroInfo[],
  metadata: PluginMetadata,
  folder: string,
  query: string,
  sortOrder: PluginSortOrder,
): MacroInfo[] {
  const needle = query.trim().toLocaleLowerCase();
  return plugins
    .filter((plugin) => {
      const assigned = metadata[plugin.pluginId]?.folder;
      if (folder === '__none__' && assigned) return false;
      if (folder !== '__all__' && folder !== '__none__' && assigned !== folder) return false;
      return !needle || `${plugin.name} ${plugin.description}`.toLocaleLowerCase().includes(needle);
    })
    .sort((a, b) =>
      sortOrder === 'name'
        ? a.name.localeCompare(b.name)
        : (b.editedAt ?? b.createdAt ?? 0) - (a.editedAt ?? a.createdAt ?? 0),
    );
}

export function movePluginMetadata(
  metadata: PluginMetadata,
  pluginId: string,
  folder: string | null,
): PluginMetadata {
  const next = { ...metadata };
  if (folder) next[pluginId] = { ...next[pluginId], folder };
  else delete next[pluginId];
  return next;
}

export function deleteFolderMetadata(
  metadata: PluginMetadata,
  folder: string,
): PluginMetadata {
  return Object.fromEntries(
    Object.entries(metadata).filter(([, value]) => value.folder !== folder),
  );
}

export function normalizeFolderName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').slice(0, 60);
}

function uniqueFolderNames(names: string[]): string[] {
  const seen = new Set<string>();
  return names.filter((name) => {
    const normalized = normalizeFolderName(name);
    const key = normalized.toLocaleLowerCase();
    if (!normalized || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).map(normalizeFolderName);
}
