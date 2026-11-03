jest.mock('@sentry/react-native', () => ({ captureException: jest.fn() }));
jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
  MaterialIcons: () => null,
}));
jest.mock('../NativeIcon', () => ({ NativeIcon: () => null }));
jest.mock('expo-image', () => ({ Image: () => null }));
jest.mock('expo-symbols', () => ({ SymbolView: () => null }));

import { getAuthorInfo, SOURCE_LABELS } from './PluginBadges';
import { getPluginIconConfig } from './PluginHeader';
import { resolveOptionValue } from './optionHelpers';
import type { MacroInfo } from '../../store/types';
import type { ProfileScriptInfo } from '../../hooks/useProfileScriptInfos';
import type { SerializableOption } from '../../runtime/types';

describe('Plugin details & metadata helpers', () => {
  it('extracts author and security info from MacroInfo', () => {
    const plugin: MacroInfo = {
      pluginId: 'auto-fisher',
      name: 'Auto Fisher',
      description: 'Automatically catches fish',
      createdAt: 1700000000000,
      editedAt: 1700100000000,
      public: true,
      scriptType: 'script',
      language: 'ts',
      security: {
        publisherName: 'Alice',
        status: 'trusted',
        fingerprint: '1234567890ABCDEF',
        importSource: { ownerId: 'owner_xyz' },
      },
    };

    const info = getAuthorInfo(plugin);
    expect(info.author).toBe('Alice');
    expect(info.securityStatus).toBe('trusted');
    expect(info.fingerprint).toBe('1234567890ABCDEF');
    expect(info.importOwner).toBe('owner_xyz');
  });

  it('extracts author and signature info from ProfileScriptInfo fallback', () => {
    const plugin: MacroInfo = {
      pluginId: 'profile-auto',
      name: 'Profile Auto',
      description: 'Test profile script',
      createdAt: 1700000000000,
      editedAt: null,
      public: false,
      scriptType: 'script',
    };

    const profileScript: ProfileScriptInfo = {
      id: 'script-123',
      pluginId: 'profile-auto',
      name: 'Profile Auto',
      description: 'Test profile script',
      source: { kind: 'url' },
      signature: {
        publisherName: 'Bob',
        signedAt: 1700050000000,
        fingerprint: 'FEDCBA0987654321',
      },
    } as any;

    const info = getAuthorInfo(plugin, profileScript);
    expect(info.author).toBe('Bob');
    expect(info.signedAt).toBe(1700050000000);
    expect(info.fingerprint).toBe('FEDCBA0987654321');
  });

  it('maps source kinds to human readable labels', () => {
    expect(SOURCE_LABELS.plugin).toBe('Local plugin');
    expect(SOURCE_LABELS.bundled).toBe('File on disk');
    expect(SOURCE_LABELS.url).toBe('From URL');
  });

  it('provides correct icon configs by script type and language', () => {
    const actionPlugin: MacroInfo = {
      pluginId: 'action-1',
      name: 'Fast Action',
      description: '',
      createdAt: 0,
      editedAt: null,
      public: false,
      scriptType: 'action',
    };
    expect(getPluginIconConfig(actionPlugin).sf).toBe('bolt.fill');

    const recordingPlugin: MacroInfo = {
      pluginId: 'rec-1',
      name: 'Recording Macro',
      description: '',
      createdAt: 0,
      editedAt: null,
      public: false,
      scriptType: 'script',
      language: 'recording',
    };
    expect(getPluginIconConfig(recordingPlugin).sf).toBe('video.fill');

    const tsPlugin: MacroInfo = {
      pluginId: 'ts-1',
      name: 'TS Macro',
      description: '',
      createdAt: 0,
      editedAt: null,
      public: false,
      scriptType: 'script',
      language: 'ts',
    };
    expect(getPluginIconConfig(tsPlugin).sf).toBe('chevron.left.forwardslash.chevron.right');
    expect(getPluginIconConfig(tsPlugin).color).toBe('#0A84FF');

    const jsPlugin: MacroInfo = {
      pluginId: 'js-1',
      name: 'JS Macro',
      description: '',
      createdAt: 0,
      editedAt: null,
      public: false,
      scriptType: 'script',
      language: 'js',
    };
    expect(getPluginIconConfig(jsPlugin).sf).toBe('chevron.left.forwardslash.chevron.right');
    expect(getPluginIconConfig(jsPlugin).color).toBe('#FFD60A');

    const defaultPlugin: MacroInfo = {
      pluginId: 'def-1',
      name: 'Default Macro',
      description: '',
      createdAt: 0,
      editedAt: null,
      public: false,
      scriptType: 'script',
    };
    expect(getPluginIconConfig(defaultPlugin).sf).toBe('puzzlepiece.extension.fill');
  });

  it('resolves direct and dependent option values', () => {
    const options: SerializableOption[] = [
      { id: 'mode', label: 'Mode', type: 'select', defaultValue: 'mining' },
      {
        id: 'speed',
        label: 'Speed',
        type: 'slider',
        defaultValue: 5,
        valueByFieldId: 'mode',
      },
    ];

    const values = {
      mode: 'combat',
      speed: { combat: 10, mining: 5 },
    };

    expect(resolveOptionValue(options[0], options, values)).toBe('combat');
    expect(resolveOptionValue(options[1], options, values)).toBe(10);
  });
});
