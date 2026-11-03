import {
  TAG_COLOR_PALETTE,
  DEFAULT_TAG_COLOR,
  newTagId,
  sanitizeTags,
  tagsEqual,
  updateAltMembershipsInTags,
} from './tagUtils';
import type { AltTag } from '../../store/types';

describe('tagUtils', () => {
  it('generates unique tag IDs', () => {
    const id1 = newTagId();
    const id2 = newTagId();
    expect(id1).toMatch(/^tag_[a-z0-9]+_[a-z0-9]+$/);
    expect(id2).toMatch(/^tag_[a-z0-9]+_[a-z0-9]+$/);
    expect(id1).not.toEqual(id2);
  });

  it('provides color palette and default color', () => {
    expect(TAG_COLOR_PALETTE.length).toBeGreaterThan(5);
    expect(TAG_COLOR_PALETTE).toContain(DEFAULT_TAG_COLOR);
  });

  it('sanitizes tags by trimming names and deduplicating alts', () => {
    const stored: AltTag[] = [
      { id: 'tag1', name: 'Original Name', color: '#1677ff', alts: ['Steve'] },
    ];
    const working: AltTag[] = [
      { id: 'tag1', name: '   ', color: '#1677ff', alts: ['Steve', 'Steve', 'Alex'] },
      { id: 'tag2', name: '  Farm Bot  ', color: '#52c41a', alts: ['Alex', 'Alex'] },
      { id: 'tag3', name: '', color: '#f5222d', alts: [] },
    ];

    const sanitized = sanitizeTags(working, stored);
    expect(sanitized).toEqual([
      { id: 'tag1', name: 'Original Name', color: '#1677ff', alts: ['Steve', 'Alex'] },
      { id: 'tag2', name: 'Farm Bot', color: '#52c41a', alts: ['Alex'] },
      { id: 'tag3', name: 'New tag', color: '#f5222d', alts: [] },
    ]);
  });

  it('correctly tests tag equality', () => {
    const a: AltTag[] = [
      { id: 'tag1', name: 'PVP', color: '#f5222d', alts: ['Steve', 'Alex'] },
    ];
    const b: AltTag[] = [
      { id: 'tag1', name: 'PVP', color: '#f5222d', alts: ['Steve', 'Alex'] },
    ];
    const c: AltTag[] = [
      { id: 'tag1', name: 'PVP', color: '#f5222d', alts: ['Steve'] },
    ];
    const d: AltTag[] = [
      { id: 'tag1', name: 'PVP2', color: '#f5222d', alts: ['Steve', 'Alex'] },
    ];

    expect(tagsEqual(a, b)).toBe(true);
    expect(tagsEqual(a, c)).toBe(false);
    expect(tagsEqual(a, d)).toBe(false);
  });

  it('updates alt memberships across tags', () => {
    const initialTags: AltTag[] = [
      { id: 'tag1', name: 'Mining', color: '#1677ff', alts: ['OldUser', 'Steve'] },
      { id: 'tag2', name: 'PVP', color: '#f5222d', alts: ['Alex'] },
      { id: 'tag3', name: 'AFK', color: '#52c41a', alts: ['OldUser'] },
    ];

    // Rename OldUser -> NewUser and select tag1 and tag2 (deselect tag3)
    const updated = updateAltMembershipsInTags(
      initialTags,
      'NewUser',
      ['tag1', 'tag2'],
      'OldUser',
    );

    expect(updated[0].alts).toEqual(['Steve', 'NewUser']);
    expect(updated[1].alts).toEqual(['Alex', 'NewUser']);
    expect(updated[2].alts).toEqual([]);
  });
});
