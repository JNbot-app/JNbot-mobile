import {
  deleteFolderMetadata,
  folderNames,
  movePluginMetadata,
  normalizeFolderName,
  visiblePlugins,
} from './folders';
import type { MacroInfo } from '../../store/types';

const plugin = (pluginId: string, name: string, editedAt: number): MacroInfo => ({
  pluginId,
  name,
  description: `${name} description`,
  editedAt,
  createdAt: editedAt,
  public: false,
  scriptType: 'script',
});

describe('plugin folders', () => {
  const plugins = [plugin('a', 'Alpha', 10), plugin('b', 'Beta', 30), plugin('c', 'Charlie', 20)];
  const metadata = { a: { folder: 'Mining' }, c: { folder: 'Tools' } };

  it('merges stored and assigned folder names without case-insensitive duplicates', () => {
    expect(folderNames(plugins, metadata, ['Empty', 'mining'])).toEqual(['Empty', 'Mining', 'Tools']);
  });

  it('filters by folder and sorts by most recently edited by default', () => {
    expect(visiblePlugins(plugins, metadata, '__all__', '', 'date').map((item) => item.pluginId))
      .toEqual(['b', 'c', 'a']);
    expect(visiblePlugins(plugins, metadata, '__none__', '', 'date').map((item) => item.pluginId))
      .toEqual(['b']);
    expect(visiblePlugins(plugins, metadata, 'Mining', '', 'date').map((item) => item.pluginId))
      .toEqual(['a']);
  });

  it('moves plugins and deleting a folder leaves its plugins unorganized', () => {
    const moved = movePluginMetadata(metadata, 'b', 'Mining');
    expect(moved.b.folder).toBe('Mining');
    expect(movePluginMetadata(moved, 'b', null).b).toBeUndefined();
    expect(deleteFolderMetadata(moved, 'Mining')).toEqual({ c: { folder: 'Tools' } });
  });

  it('normalizes whitespace and bounds folder names', () => {
    expect(normalizeFolderName('  My   folder  ')).toBe('My folder');
    expect(normalizeFolderName('x'.repeat(80))).toHaveLength(60);
  });
});
