import { altFromDraft, countAltGkits, countAltRanks, draftFromAlt, validateAltDraft } from './alts';
import type { AltWithData } from '../store/types';

const alt = (username: string): AltWithData => ({ username, data: { ranks: {}, gkits: {} } });

describe('alt drafts', () => {
  it('counts ranks and gkits across every gamemode', () => {
    expect(countAltRanks({ ranks: { skyblockdream: 'VIP', prison: 'MVP', empty: '' }, gkits: {} })).toBe(2);
    expect(countAltGkits({ ranks: {}, gkits: { skyblockdream: ['weekly', 'monthly'], prison: ['starter'] } })).toBe(3);
  });

  it('validates account credentials and case-insensitive duplicates', () => {
    expect(validateAltDraft({ username: 'ab', password: 'password', premium: false, ranks: {}, gkits: {} }, [])).toMatch(/3–16/);
    expect(validateAltDraft({ username: 'Alpha', password: '', premium: false, ranks: {}, gkits: {} }, [])).toBeNull();
    expect(validateAltDraft({ username: 'Alpha', password: 'password', premium: true, ranks: {}, gkits: {} }, [])).toBeNull();
    expect(validateAltDraft({ username: 'Alpha', password: '', premium: false, ranks: {}, gkits: {} }, [], undefined, true)).toBeNull();
    expect(draftFromAlt(undefined, true).premium).toBe(true);
    expect(validateAltDraft({ username: 'alpha', password: 'password', premium: false, ranks: {}, gkits: {} }, [alt('Alpha')])).toMatch(/already exists/);
  });

  it('forces premium identity for premium servers without clearing saved passwords', () => {
    const source: AltWithData = { username: 'Alpha', data: { password: 'secret', ranks: {}, gkits: {} } };
    const result = altFromDraft(draftFromAlt(source), source, true);
    expect(result).toMatchObject({ data: { premium: true, password: 'secret' } });
  });

  it('keeps profile data when serializing an edit', () => {
    const source: AltWithData = { username: 'Alpha', email: 'a@example.com', data: { premium: true, password: 'secret', ranks: { skyblock: 'VIP' }, gkits: { skyblock: ['weekly'] } } };
    expect(altFromDraft(draftFromAlt(source), source)).toEqual(source);
  });

  it('preserves legacy email when switching an account to cracked', () => {
    const source: AltWithData = { username: 'Alpha', email: 'a@example.com', data: { premium: true, ranks: {}, gkits: {} } };
    expect(altFromDraft({ ...draftFromAlt(source), premium: false }, source).email).toBe(source.email);
  });

  it('handles a thousand-account list without changing validation semantics', () => {
    const alts = Array.from({ length: 1000 }, (_, index) => alt(`User${index}`));
    expect(validateAltDraft({ username: 'User999', password: 'password', premium: false, ranks: {}, gkits: {} }, alts)).toMatch(/already exists/);
    expect(validateAltDraft({ username: 'NewUser', password: 'password', premium: false, ranks: {}, gkits: {} }, alts)).toBeNull();
  });
});
