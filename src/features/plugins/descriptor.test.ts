import { normalizePluginRunDescriptor } from './descriptor';
import type { MacroInfo } from '../../store/types';

const fallback: MacroInfo = {
  pluginId: 'profile-script',
  name: 'Profile script',
  description: '',
  editedAt: null,
  createdAt: 0,
  public: false,
  scriptType: 'script',
};

describe('normalizePluginRunDescriptor', () => {
  it('turns legacy partial sections into a safe descriptor', () => {
    expect(normalizePluginRunDescriptor({
      info: { name: 'Resolved script' },
      allowed: true,
      sections: [
        { id: 'general', name: 'General' },
        undefined,
        { name: 'Advanced', options: [{ id: 'delay', label: 'Delay', type: 'number' }] },
      ],
    }, fallback)).toMatchObject({
      info: { pluginId: 'profile-script', name: 'Resolved script' },
      allowed: true,
      sections: [
        { id: 'general', name: 'General', options: [] },
        { id: 'section-2', name: 'Advanced', options: [{ id: 'delay' }] },
      ],
      values: {},
    });
  });

  it('returns a total empty descriptor for malformed resolver output', () => {
    const descriptor = normalizePluginRunDescriptor(undefined, fallback);
    expect(descriptor.sections).toEqual([]);
    expect(descriptor.values).toEqual({});
    expect(descriptor.allowed).toBe(false);
    expect(descriptor.blockedReason).toBe('This script returned invalid configuration data.');
  });

  it('normalizes legacy choice arrays and missing dependent choices', () => {
    const descriptor = normalizePluginRunDescriptor({
      sections: [{
        name: 'Kits',
        options: [
          { id: 'keyTypes', label: 'Key types', type: 'multiSelect', options: ['vote,10'] },
          { id: 'kits', label: 'Kits', type: 'multiSelect', valueByFieldId: 'gamemode' },
        ],
      }],
      values: { kits: { skyblockdream: ['once kit'] } },
    }, fallback);

    expect(descriptor.sections[0].options).toMatchObject([
      { id: 'keyTypes', options: [{ label: 'vote,10', value: 'vote,10' }] },
      { id: 'kits', options: [] },
    ]);
    expect(descriptor.values).toEqual({ kits: { skyblockdream: ['once kit'] } });
  });
});
