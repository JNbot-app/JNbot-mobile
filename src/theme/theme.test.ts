import { StyleSheet } from 'react-native';
import {
  colors,
  applyTheme,
  Themes,
  getTheme,
  getAvailableThemes,
  isDarkTheme,
  darkPalette,
  lightPalette,
  goldPalette,
  obsidianPalette,
  sculkPalette,
  nightPalette,
} from './theme';

describe('theme system', () => {
  afterEach(() => {
    applyTheme(Themes.DARK, false);
  });

  test('provides all 7 supported themes with meta info', () => {
    const available = getAvailableThemes();
    expect(available.map((t) => t.id)).toEqual([
      Themes.DARK,
      Themes.LIGHT,
      Themes.GOLD,
      Themes.OBSIDIAN,
      Themes.SCULK,
      Themes.NIGHT,
      Themes.BASALT,
    ]);

    const light = available.find((t) => t.id === Themes.LIGHT)!;
    expect(light.isDark).toBe(false);
    expect(isDarkTheme(Themes.LIGHT)).toBe(false);
    expect(isDarkTheme(Themes.DARK)).toBe(true);
  });

  test('switches to custom mobile light theme and updates colors in place', () => {
    expect(colors.bg).toBe(darkPalette.bg);
    applyTheme(Themes.LIGHT, false);
    expect(colors.bg).toBe(lightPalette.bg);
    expect(colors.surface).toBe(lightPalette.surface);
    expect(colors.text).toBe(lightPalette.text);
    expect(colors.primary).toBe(lightPalette.primary);
    expect(getTheme()).toBe(Themes.LIGHT);
  });

  test('switches to other desktop-aligned themes', () => {
    applyTheme(Themes.GOLD, false);
    expect(colors.primary).toBe(goldPalette.primary);
    expect(getTheme()).toBe(Themes.GOLD);

    applyTheme(Themes.OBSIDIAN, false);
    expect(colors.primary).toBe(obsidianPalette.primary);
    expect(getTheme()).toBe(Themes.OBSIDIAN);

    applyTheme(Themes.SCULK, false);
    expect(colors.primary).toBe('#665CFF');
    expect(colors.bg).toBe('#090B0C');
    expect(colors.surface).toBe('#15191A');
    expect(colors.bgElevated).toBe('#1C2122');
    expect(getTheme()).toBe(Themes.SCULK);

    applyTheme(Themes.NIGHT, false);
    expect(colors.bg).toBe(nightPalette.bg);
    expect(getTheme()).toBe(Themes.NIGHT);
  });

  test('updates StyleSheet created prior to theme switch', () => {
    const styles = StyleSheet.create({
      container: {
        backgroundColor: colors.bg,
      },
      card: {
        backgroundColor: colors.surface,
        borderColor: colors.borderSubtle,
      },
    });

    expect(styles.container.backgroundColor).toBe(darkPalette.bg);
    expect(styles.card.backgroundColor).toBe(darkPalette.surface);

    applyTheme(Themes.LIGHT, false);

    expect(styles.container.backgroundColor).toBe(lightPalette.bg);
    expect(styles.card.backgroundColor).toBe(lightPalette.surface);

    applyTheme(Themes.DARK, false);

    expect(styles.container.backgroundColor).toBe(darkPalette.bg);
    expect(styles.card.backgroundColor).toBe(darkPalette.surface);
  });
});
