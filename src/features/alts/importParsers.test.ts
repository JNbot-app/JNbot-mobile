import {
  convertImportEntryToAlt,
  extractEntriesFromJson,
  extractEntriesFromText,
  parseAltsFileContent,
} from './importParsers';
import type { ImportEntry } from './importTypes';
import type { AltWithData } from '../../store/types';

describe('importParsers', () => {
  describe('extractEntriesFromJson', () => {
    it('parses modern export with profileId and alts array', () => {
      const json = {
        version: 1,
        profileId: 'hypixel',
        alts: [
          {
            username: 'Steve',
            premium: false,
            data: { password: 'secretpassword', ranks: { skyblock: 'MVP' }, gkits: { skyblock: ['weekly'] } },
          },
          {
            username: 'Alex',
            premium: true,
            email: 'alex@example.com',
            data: { password: 'alexpassword' },
          },
        ],
      };

      const result = extractEntriesFromJson(json, 'hypixel');
      expect(result.srcProfile).toBe('hypixel');
      expect(result.entries).toHaveLength(2);
      expect(result.entries[0]).toEqual({
        username: 'Steve',
        premium: false,
        UID: null,
        email: undefined,
        password: 'secretpassword',
        ranks: { skyblock: 'MVP' },
        gkits: { skyblock: ['weekly'] },
      });
      expect(result.entries[1].username).toBe('Alex');
      expect(result.entries[1].email).toBe('alex@example.com');
    });

    it('parses legacy nested profile object and fallback bare array', () => {
      const bareArray = [
        {
          username: 'Gamer123',
          hypixel: { password: 'pass12345' },
        },
      ];

      const result = extractEntriesFromJson(bareArray, 'hypixel');
      expect(result.srcProfile).toBeNull();
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].username).toBe('Gamer123');
      expect(result.entries[0].password).toBe('pass12345');
    });

    it('filters out invalid usernames and overlong passwords', () => {
      const invalidJson = {
        alts: [
          { username: 'ab', password: 'validpass' }, // too short username
          { username: 'ValidUser', password: 'x'.repeat(46) }, // too long password
          { username: 'ValidUser2', password: 'goodpassword' },
        ],
      };

      const result = extractEntriesFromJson(invalidJson);
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].username).toBe('ValidUser2');
    });

    it('accepts passwordless premium entries only for premium servers', () => {
      const json = { alts: [
        { username: 'PremiumOne', premium: true },
        { username: 'CrackedOne', premium: false, password: 'secret' },
      ] };
      const result = extractEntriesFromJson(json, undefined, [], true);
      expect(result.entries).toEqual([expect.objectContaining({ username: 'PremiumOne', password: '' })]);
    });

    it('imports offline accounts with blank passwords and premium accounts without email', () => {
      const result = extractEntriesFromJson({ alts: [{ username: 'PremiumOne', premium: true }, { username: 'CrackedOne' }] });
      expect(result.entries).toHaveLength(2);
      expect(result.entries.every((entry) => entry.password === '')).toBe(true);
    });

    it('throws error on empty or invalid structure', () => {
      expect(() => extractEntriesFromJson({})).toThrow(/No Minecraft accounts found/);
      expect(() => extractEntriesFromJson({ alts: [] })).toThrow(/No Minecraft accounts found/);
    });
  });

  describe('extractEntriesFromText', () => {
    it('parses space-separated lines', () => {
      const text = `
        Steve pass12345
        Alex secretAlex
      `;
      const result = extractEntriesFromText(text, 'destinationProfile');
      expect(result.entries).toHaveLength(2);
      expect(result.entries[0].username).toBe('Steve');
      expect(result.entries[0].password).toBe('pass12345');
      expect(result.entries[1].username).toBe('Alex');
      expect(result.entries[1].password).toBe('secretAlex');
    });

    it('parses colon-separated lines and ignores comments', () => {
      const text = `
        # This is a comment
        // Another comment
        Steve:mypassword
        User99:strongpass123
      `;
      const result = extractEntriesFromText(text);
      expect(result.entries).toHaveLength(2);
      expect(result.entries[0].username).toBe('Steve');
      expect(result.entries[0].password).toBe('mypassword');
      expect(result.entries[1].username).toBe('User99');
    });

    it('throws when no valid lines exist', () => {
      expect(() => extractEntriesFromText('# comment\n')).toThrow(/No valid username and password pairs found/);
    });
  });

  describe('parseAltsFileContent', () => {
    it('automatically identifies JSON content', () => {
      const content = JSON.stringify({
        alts: [{ username: 'PlayerOne', password: 'passOne123' }],
      });
      const result = parseAltsFileContent(content);
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].username).toBe('PlayerOne');
    });

    it('falls back to text parser when not valid JSON', () => {
      const content = 'PlayerTwo passTwo123\nPlayerThree passThree123';
      const result = parseAltsFileContent(content);
      expect(result.entries).toHaveLength(2);
    });

    it('throws on empty content', () => {
      expect(() => parseAltsFileContent('   ')).toThrow(/File is empty/);
    });
  });

  describe('convertImportEntryToAlt', () => {
    const entry: ImportEntry = {
      username: 'Steve',
      premium: false,
      UID: null,
      email: undefined,
      password: 'mypassword',
      ranks: { skyblock: 'VIP' },
      gkits: { skyblock: ['weekly'] },
    };

    it('converts new entry with ranks/gkits when allowed', () => {
      const alt = convertImportEntryToAlt(entry, undefined, true);
      expect(alt.username).toBe('Steve');
      expect(alt.data.password).toBe('mypassword');
      expect(alt.data.ranks).toEqual({ skyblock: 'VIP' });
      expect(alt.data.gkits).toEqual({ skyblock: ['weekly'] });
    });

    it('omits ranks/gkits when canImportRanksGkits is false', () => {
      const alt = convertImportEntryToAlt(entry, undefined, false);
      expect(alt.username).toBe('Steve');
      expect(alt.data.password).toBe('mypassword');
      expect(alt.data.ranks).toEqual({});
      expect(alt.data.gkits).toEqual({});
    });

    it('preserves existing UID and ranks when updating existing alt', () => {
      const existing: AltWithData = {
        username: 'Steve',
        UID: 'uid-1234',
        data: {
          password: 'oldpass',
          ranks: { survival: 'LEGEND' },
          gkits: {},
        },
      };

      const updated = convertImportEntryToAlt(entry, existing, false);
      expect(updated.UID).toBe('uid-1234');
      expect(updated.data.password).toBe('mypassword');
      expect(updated.data.ranks).toEqual({ survival: 'LEGEND' });
    });
  });
});
