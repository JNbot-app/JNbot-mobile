import { countAltGkits, countAltRanks } from '../../features/alts';
import { TONE_TO_HEX, TONE_TO_BG } from './toneColors';
import type { ServerAltInfo } from '../../store/types';

describe('Alt Overview helpers & tone colors', () => {
  it('maps semantic tones to hex and translucent bg colors', () => {
    expect(TONE_TO_HEX.emerald).toBe('#30D158');
    expect(TONE_TO_HEX.amber).toBe('#FDAC41');
    expect(TONE_TO_HEX.indigo).toBe('#5E5CE6');
    expect(TONE_TO_BG.emerald).toContain('rgba(48, 209, 88');
    expect(TONE_TO_BG.amber).toContain('rgba(253, 172, 65');
  });

  it('correctly counts ranks and gkits across gamemodes', () => {
    const data: ServerAltInfo = {
      password: 'secretPassword',
      ranks: {
        skyblock: 'Hero',
        factions: 'Overlord',
        survival: '',
      },
      gkits: {
        skyblock: ['Viking', 'Paladin'],
        factions: ['Warlord'],
        survival: [],
      },
    };

    expect(countAltRanks(data)).toBe(2);
    expect(countAltGkits(data)).toBe(3);
  });

  it('handles empty or undefined alt data gracefully', () => {
    expect(countAltRanks(undefined)).toBe(0);
    expect(countAltGkits(undefined)).toBe(0);

    const emptyData: ServerAltInfo = {
      ranks: {},
      gkits: {},
    };
    expect(countAltRanks(emptyData)).toBe(0);
    expect(countAltGkits(emptyData)).toBe(0);
  });
});
