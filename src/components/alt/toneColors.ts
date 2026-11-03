import type { ProfileUiTone } from '../../generated/client-contract/profileUiSchema';

/**
 * Hex colors used for tone accents, rank badges, and KPI icons.
 * Aligned with the desktop client tone system.
 */
export const TONE_TO_HEX: Record<ProfileUiTone, string> = {
  amber: '#FDAC41',
  emerald: '#30D158',
  rose: '#FF375F',
  indigo: '#5E5CE6',
  sky: '#0A84FF',
  purple: '#BF5AF2',
  slate: '#8E8E93',
  red: '#FF453A',
  cyan: '#64D2FF',
};

/**
 * Soft translucent background tints for tags/badges.
 */
export const TONE_TO_BG: Record<ProfileUiTone, string> = {
  amber: 'rgba(253, 172, 65, 0.15)',
  emerald: 'rgba(48, 209, 88, 0.15)',
  rose: 'rgba(255, 55, 95, 0.15)',
  indigo: 'rgba(94, 92, 230, 0.15)',
  sky: 'rgba(10, 132, 255, 0.15)',
  purple: 'rgba(191, 90, 242, 0.15)',
  slate: 'rgba(142, 142, 147, 0.15)',
  red: 'rgba(255, 69, 58, 0.15)',
  cyan: 'rgba(100, 210, 255, 0.15)',
};
