import type { AltTag } from '../../store/types';

export const TAG_COLOR_PALETTE = [
  '#f5222d',
  '#fa541c',
  '#fa8c16',
  '#faad14',
  '#a0d911',
  '#52c41a',
  '#13c2c2',
  '#1677ff',
  '#2f54eb',
  '#722ed1',
  '#eb2f96',
  '#8c8c8c',
];

export const DEFAULT_TAG_COLOR = TAG_COLOR_PALETTE[7];

export const newTagId = (): string =>
  `tag_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

/**
 * Sanitises the working tag list before persisting:
 *  - tags with a blank name fall back to the matching stored name (if any),
 *    otherwise "New tag" — guaranteeing at least one character.
 *  - alt lists are de-duplicated while preserving order.
 */
export const sanitizeTags = (working: AltTag[], stored: AltTag[]): AltTag[] => {
  return working.map((t) => {
    const name = t.name.trim();
    if (name.length > 0) return { ...t, name, alts: Array.from(new Set(t.alts)) };
    const fallback = stored.find((s) => s.id === t.id)?.name.trim() || 'New tag';
    return { ...t, name: fallback, alts: Array.from(new Set(t.alts)) };
  });
};

export const tagsEqual = (a: AltTag[], b: AltTag[]): boolean => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    if (x.id !== y.id || x.name !== y.name || x.color !== y.color) return false;
    if (x.alts.length !== y.alts.length) return false;
    for (let j = 0; j < x.alts.length; j++) {
      if (x.alts[j] !== y.alts[j]) return false;
    }
  }
  return true;
};

/**
 * Updates alt membership across tags when an alt is added or edited.
 */
export const updateAltMembershipsInTags = (
  tags: AltTag[],
  newUsername: string,
  selectedTagIds: string[],
  originalUsername?: string,
): AltTag[] => {
  const selectedSet = new Set(selectedTagIds);
  const cleanNew = newUsername.trim();
  const cleanOrig = originalUsername?.trim();

  return tags.map((tag) => {
    const isSelected = selectedSet.has(tag.id);
    let nextAlts = tag.alts.filter((u) => {
      if (cleanOrig && u.toLowerCase() === cleanOrig.toLowerCase()) return false;
      if (u.toLowerCase() === cleanNew.toLowerCase()) return false;
      return true;
    });

    if (isSelected && cleanNew) {
      nextAlts.push(cleanNew);
    }

    return {
      ...tag,
      alts: nextAlts,
    };
  });
};
