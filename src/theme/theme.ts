import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';

export const THEME_STORAGE_KEY = 'jnbot_app_theme';

async function getAsyncStorage() {
  try {
    const mod = await import('@react-native-async-storage/async-storage');
    return mod.default ?? mod;
  } catch {
    return null;
  }
}

export enum Themes {
  LIGHT = 'light',
  DARK = 'dark',
  OBSIDIAN = 'obsidian',
  NIGHT = 'night',
  GOLD = 'gold',
  SCULK = 'sculk',
  BASALT = 'basalt',
}

export type ThemeColors = {
  bg: string;
  bgElevated: string;
  surface: string;
  surfaceAlt: string;
  surfaceHover: string;
  border: string;
  borderSubtle: string;

  text: string;
  textMuted: string;
  textFaint: string;

  primary: string;
  primaryPressed: string;
  primaryDim: string;
  primarySoft: string;
  primaryOn: string;
  accent: string;

  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  info: string;
  infoSoft: string;

  online: string;
  offline: string;
  paused: string;
  overlay: string;
};

export const darkPalette: ThemeColors = {
  bg: '#08090A',
  bgElevated: '#121315',
  surface: '#1A1B1E',
  surfaceAlt: '#232429',
  surfaceHover: '#2C2D32',
  border: '#34353A',
  borderSubtle: '#292A2F',

  text: '#F5F5F7',
  textMuted: '#B0B0B7',
  textFaint: '#92929A',

  primary: '#FF7A45',
  primaryPressed: '#E96836',
  primaryDim: '#C94F27',
  primarySoft: 'rgba(255,122,69,0.14)',
  primaryOn: '#1B0B05',
  accent: '#FFD2C1',

  success: '#30D158',
  successSoft: 'rgba(48,209,88,0.13)',
  warning: '#FFB340',
  warningSoft: 'rgba(255,179,64,0.14)',
  danger: '#FF453A',
  dangerSoft: 'rgba(255,69,58,0.14)',
  info: '#64D2FF',
  infoSoft: 'rgba(100,210,255,0.14)',

  online: '#30D158',
  offline: '#92929A',
  paused: '#FFB340',
  overlay: 'rgba(0,0,0,0.72)',
};

export const lightPalette: ThemeColors = {
  bg: '#F2F3F7',
  bgElevated: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceAlt: '#EAECEF',
  surfaceHover: '#E0E3E8',
  border: '#D4D7E2',
  borderSubtle: '#E5E8EF',

  text: '#111215',
  textMuted: '#5F6368',
  textFaint: '#8C9099',

  primary: '#E65100',
  primaryPressed: '#C24212',
  primaryDim: '#A6360E',
  primarySoft: 'rgba(230,81,0,0.12)',
  primaryOn: '#FFFFFF',
  accent: '#FFD9CC',

  success: '#18A957',
  successSoft: 'rgba(24,169,87,0.12)',
  warning: '#D97706',
  warningSoft: 'rgba(217,119,6,0.12)',
  danger: '#DC2626',
  dangerSoft: 'rgba(220,38,38,0.12)',
  info: '#0284C7',
  infoSoft: 'rgba(2,132,199,0.12)',

  online: '#18A957',
  offline: '#8C9099',
  paused: '#D97706',
  overlay: 'rgba(0,0,0,0.45)',
};

export const goldPalette: ThemeColors = {
  bg: '#0B0B0D',
  bgElevated: '#131317',
  surface: '#16161B',
  surfaceAlt: '#202027',
  surfaceHover: '#2A2A33',
  border: '#383842',
  borderSubtle: '#26262E',

  text: '#F3F3F4',
  textMuted: '#A8A8B2',
  textFaint: '#7E7E8A',

  primary: '#F5B50A',
  primaryPressed: '#D99E08',
  primaryDim: '#BF8904',
  primarySoft: 'rgba(245,181,10,0.14)',
  primaryOn: '#1A1300',
  accent: '#FFE899',

  success: '#5BD28A',
  successSoft: 'rgba(91,210,138,0.13)',
  warning: '#F5B50A',
  warningSoft: 'rgba(245,181,10,0.14)',
  danger: '#EF6262',
  dangerSoft: 'rgba(239,98,98,0.14)',
  info: '#64D2FF',
  infoSoft: 'rgba(100,210,255,0.14)',

  online: '#5BD28A',
  offline: '#7E7E8A',
  paused: '#F5B50A',
  overlay: 'rgba(0,0,0,0.72)',
};

export const obsidianPalette: ThemeColors = {
  bg: '#0C0D10',
  bgElevated: '#16171D',
  surface: '#16171D',
  surfaceAlt: '#1F2027',
  surfaceHover: '#2B2D36',
  border: '#2B2D36',
  borderSubtle: '#1F2027',

  text: '#F5F5F5',
  textMuted: '#A7ADC0',
  textFaint: '#6F7585',

  primary: '#7F5AF0',
  primaryPressed: '#6A4AE5',
  primaryDim: '#6143BD',
  primarySoft: 'rgba(127,90,240,0.16)',
  primaryOn: '#FFFFFF',
  accent: '#D4C5FF',

  success: '#3FBF8C',
  successSoft: 'rgba(63,191,140,0.14)',
  warning: '#F5C64A',
  warningSoft: 'rgba(245,198,74,0.14)',
  danger: '#FF6B6B',
  dangerSoft: 'rgba(255,107,107,0.14)',
  info: '#4096FF',
  infoSoft: 'rgba(64,150,255,0.14)',

  online: '#3FBF8C',
  offline: '#6F7585',
  paused: '#F5C64A',
  overlay: 'rgba(0,0,0,0.75)',
};

export const sculkPalette: ThemeColors = {
  bg: '#090B0C',
  bgElevated: '#1C2122',
  surface: '#15191A',
  surfaceAlt: '#1C2122',
  surfaceHover: '#252B2C',
  border: '#2A3031',
  borderSubtle: '#202627',

  text: '#F1F3F3',
  textMuted: '#A2ABAD',
  textFaint: '#737E80',

  primary: '#665CFF',
  primaryPressed: '#554CE5',
  primaryDim: '#483EDB',
  primarySoft: 'rgba(102,92,255,0.14)',
  primaryOn: '#FFFFFF',
  accent: '#817AFF',

  success: '#61C995',
  successSoft: 'rgba(97,201,149,0.14)',
  warning: '#D9AD63',
  warningSoft: 'rgba(217,173,99,0.14)',
  danger: '#E27676',
  dangerSoft: 'rgba(226,118,118,0.14)',
  info: '#817AFF',
  infoSoft: 'rgba(129,122,255,0.14)',

  online: '#61C995',
  offline: '#737E80',
  paused: '#D9AD63',
  overlay: 'rgba(0,0,0,0.75)',
};

export const nightPalette: ThemeColors = {
  bg: '#000000',
  bgElevated: '#0A0A0A',
  surface: '#121212',
  surfaceAlt: '#1C1C1C',
  surfaceHover: '#282828',
  border: '#303030',
  borderSubtle: '#222222',

  text: '#FFFFFF',
  textMuted: '#A1A1AA',
  textFaint: '#71717A',

  primary: '#E4E4E7',
  primaryPressed: '#D4D4D8',
  primaryDim: '#A1A1AA',
  primarySoft: 'rgba(255,255,255,0.12)',
  primaryOn: '#09090B',
  accent: '#FFFFFF',

  success: '#22C55E',
  successSoft: 'rgba(34,197,94,0.14)',
  warning: '#EAB308',
  warningSoft: 'rgba(234,179,8,0.14)',
  danger: '#EF4444',
  dangerSoft: 'rgba(239,68,68,0.14)',
  info: '#38BDF8',
  infoSoft: 'rgba(56,189,248,0.14)',

  online: '#22C55E',
  offline: '#71717A',
  paused: '#EAB308',
  overlay: 'rgba(0,0,0,0.85)',
};

export const basaltPalette: ThemeColors = {
  bg: '#121314',
  bgElevated: '#202122',
  surface: '#191A1B',
  surfaceAlt: '#202122',
  surfaceHover: '#272829',
  border: '#2E2F30',
  borderSubtle: '#242526',

  text: '#CCCCCC',
  textMuted: '#9D9D9D',
  textFaint: '#6F6F6F',

  primary: '#6B6F73',
  primaryPressed: '#5A5E62',
  primaryDim: '#4A4E52',
  primarySoft: 'rgba(107,111,115,0.14)',
  primaryOn: '#FFFFFF',
  accent: '#A8ACB0',

  success: '#3FB56B',
  successSoft: 'rgba(63,181,107,0.14)',
  warning: '#E0A43A',
  warningSoft: 'rgba(224,164,58,0.14)',
  danger: '#EF5B5B',
  dangerSoft: 'rgba(239,91,91,0.14)',
  info: '#8FA3BF',
  infoSoft: 'rgba(143,163,191,0.14)',

  online: '#3FB56B',
  offline: '#6E6E6E',
  paused: '#E0A43A',
  overlay: 'rgba(0,0,0,0.8)',
};

export const themePalettes: Record<Themes, ThemeColors> = {
  [Themes.DARK]: darkPalette,
  [Themes.LIGHT]: lightPalette,
  [Themes.GOLD]: goldPalette,
  [Themes.OBSIDIAN]: obsidianPalette,
  [Themes.SCULK]: sculkPalette,
  [Themes.NIGHT]: nightPalette,
  [Themes.BASALT]: basaltPalette,
};

export interface ThemeMeta {
  id: Themes;
  name: string;
  description: string;
  primaryColor: string;
  surfaceColor: string;
  bgColor: string;
  isDark: boolean;
}

export const THEMES_META: ThemeMeta[] = [
  {
    id: Themes.DARK,
    name: 'Dark (Default)',
    description: 'Calm pocket operations console with warm coral accents',
    primaryColor: darkPalette.primary,
    surfaceColor: darkPalette.surface,
    bgColor: darkPalette.bg,
    isDark: true,
  },
  {
    id: Themes.LIGHT,
    name: 'Light',
    description: 'Clean high-contrast theme crafted for mobile readability',
    primaryColor: lightPalette.primary,
    surfaceColor: lightPalette.surface,
    bgColor: lightPalette.bg,
    isDark: false,
  },
  {
    id: Themes.GOLD,
    name: 'Gold',
    description: 'Default JNbot color palette with rich gold accents',
    primaryColor: goldPalette.primary,
    surfaceColor: goldPalette.surface,
    bgColor: goldPalette.bg,
    isDark: true,
  },
  {
    id: Themes.OBSIDIAN,
    name: 'Obsidian',
    description: 'Deep dark surfaces with vibrant purple highlights',
    primaryColor: obsidianPalette.primary,
    surfaceColor: obsidianPalette.surface,
    bgColor: obsidianPalette.bg,
    isDark: true,
  },
  {
    id: Themes.SCULK,
    name: 'Sculk',
    description: 'Charcoal surfaces with restrained violet accent',
    primaryColor: sculkPalette.primary,
    surfaceColor: sculkPalette.surface,
    bgColor: sculkPalette.bg,
    isDark: true,
  },
  {
    id: Themes.NIGHT,
    name: 'Night',
    description: 'Pure AMOLED black with high-contrast monochrome silver',
    primaryColor: nightPalette.primary,
    surfaceColor: nightPalette.surface,
    bgColor: nightPalette.bg,
    isDark: true,
  },
  {
    id: Themes.BASALT,
    name: 'Basalt',
    description: 'Soft charcoal surfaces with a muted neutral gray accent',
    primaryColor: basaltPalette.primary,
    surfaceColor: basaltPalette.surface,
    bgColor: basaltPalette.bg,
    isDark: true,
  },
];

export function getAvailableThemes(): ThemeMeta[] {
  return THEMES_META;
}

export function isDarkTheme(theme: Themes = currentTheme): boolean {
  return theme !== Themes.LIGHT;
}

// Global mutable colors object imported throughout the app
export const colors: ThemeColors = { ...darkPalette };

let currentTheme: Themes = Themes.DARK;

export function getTheme(): Themes {
  return currentTheme;
}

type ThemeListener = (theme: Themes) => void;
const listeners = new Set<ThemeListener>();

export function subscribeTheme(listener: ThemeListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const isNeutral = (clean: string) => clean === '#ffffff' || clean === '#fff' || clean === '#000000' || clean === '#000';

// First token wins when palettes reuse one value (e.g. gold primary === warning),
// so the semantic token declared first (primary) is preferred over later ones.
function addPaletteColors(map: Map<string, keyof ThemeColors>, palette: ThemeColors) {
  for (const [token, color] of Object.entries(palette)) {
    const clean = color.toLowerCase().trim();
    if (!isNeutral(clean) && !map.has(clean)) map.set(clean, token as keyof ThemeColors);
  }
  return map;
}

const buildPaletteColorMap = (palette: ThemeColors) => addPaletteColors(new Map(), palette);

const darkColorMap = buildPaletteColorMap(darkPalette);
const allPalettesColorMap = new Map<string, keyof ThemeColors>(darkColorMap);
for (const palette of Object.values(themePalettes)) addPaletteColors(allPalettesColorMap, palette);

let activeColorMap = darkColorMap;

function findTokenForValue(val: string): keyof ThemeColors | null {
  const first = val.charCodeAt(0);
  if (first !== 35 && !val.startsWith('rgb')) {
    return null;
  }
  const clean = val.toLowerCase().trim();
  if (isNeutral(clean)) return null;
  return activeColorMap.get(clean) ?? darkColorMap.get(clean) ?? allPalettesColorMap.get(clean) ?? null;
}

type PropMapping = { prop: string; token: keyof ThemeColors };
interface RegisteredSheet {
  target: Record<string, any>;
  ruleMap: Map<string, PropMapping[]>;
}

const registeredSheets: RegisteredSheet[] = [];

// Intercept StyleSheet.create so styles dynamically adapt across theme switches
const originalStyleSheetCreate = StyleSheet.create;

(StyleSheet as any).create = function <T extends StyleSheet.NamedStyles<T>>(styles: T): T {
  const result = originalStyleSheetCreate(styles);
  let ruleMap: Map<string, PropMapping[]> | null = null;

  for (const ruleKey of Object.keys(styles)) {
    const rule = (styles as any)[ruleKey];
    if (rule && typeof rule === 'object') {
      let propList: PropMapping[] | null = null;
      for (const prop of Object.keys(rule)) {
        const val = rule[prop];
        if (typeof val === 'string') {
          const token = findTokenForValue(val);
          if (token) {
            if (!propList) propList = [];
            propList.push({ prop, token });
          }
        }
      }
      if (propList) {
        if (!ruleMap) ruleMap = new Map();
        ruleMap.set(ruleKey, propList);
      }
    }
  }

  if (ruleMap) {
    registeredSheets.push({ target: result as any, ruleMap });
    // If a theme other than DARK is currently active, immediately align this newly created sheet
    if (currentTheme !== Themes.DARK) {
      const palette = themePalettes[currentTheme] ?? darkPalette;
      for (const [ruleKey, propMappings] of ruleMap) {
        const rule = (result as any)[ruleKey];
        if (rule) {
          const newRule = { ...rule };
          for (const m of propMappings) {
            newRule[m.prop] = palette[m.token];
          }
          (result as any)[ruleKey] = newRule;
        }
      }
    }
  }

  return result;
};

export function applyTheme(nextTheme: Themes, persist = true): void {
  const validTheme = Object.values(Themes).includes(nextTheme) ? nextTheme : Themes.DARK;
  const nextPalette = themePalettes[validTheme] ?? darkPalette;

  currentTheme = validTheme;
  Object.assign(colors, nextPalette);
  activeColorMap = buildPaletteColorMap(nextPalette);

  // Update registered style sheet rule objects so new references trigger React Native view diffs
  for (const sheet of registeredSheets) {
    for (const [ruleKey, propMappings] of sheet.ruleMap) {
      const rule = sheet.target[ruleKey];
      if (rule) {
        const newRule = { ...rule };
        for (const m of propMappings) {
          newRule[m.prop] = nextPalette[m.token];
        }
        sheet.target[ruleKey] = newRule;
      }
    }
  }

  if (persist) {
    void getAsyncStorage().then((storage) => {
      storage?.setItem(THEME_STORAGE_KEY, validTheme).catch(() => undefined);
    });
  }

  listeners.forEach((listener) => {
    try {
      listener(validTheme);
    } catch {
      // ignore subscriber errors
    }
  });
}

export async function loadSavedTheme(): Promise<Themes> {
  try {
    const storage = await getAsyncStorage();
    const saved = await storage?.getItem(THEME_STORAGE_KEY);
    if (saved && Object.values(Themes).includes(saved as Themes)) {
      applyTheme(saved as Themes, false);
      return saved as Themes;
    }
  } catch {
    // fallback to default
  }
  applyTheme(Themes.GOLD, false);
  return Themes.GOLD;
}

export function useTheme() {
  const [theme, setLocalTheme] = useState<Themes>(currentTheme);

  useEffect(() => {
    return subscribeTheme((nextTheme) => {
      setLocalTheme(nextTheme);
    });
  }, []);

  return {
    theme,
    colors,
    isDark: isDarkTheme(theme),
    setTheme: applyTheme,
  };
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 40,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 14,
  xl: 18,
  pill: 999,
} as const;

export const font = {
  size: {
    xs: 12,
    caption: 13,
    sm: 14,
    base: 15,
    md: 16,
    lg: 17,
    xl: 22,
    xxl: 34,
  },
  weight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
} as const;

/** Fixed colors that must not follow the theme (text on photos, native-looking shadows). */
export const palette = { white: '#FFFFFF', black: '#000000' } as const;

export const shadow = { card: {} } as const;

export type StatusColor = 'success' | 'warning' | 'danger' | 'info' | 'primary';

export function statusToColor(type: StatusColor): string {
  return colors[type];
}

