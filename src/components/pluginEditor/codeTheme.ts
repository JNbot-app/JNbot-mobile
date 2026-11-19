import { colors, font } from '../../theme/theme';

export const CODE_LINE_HEIGHT = 20;

export const codeTextStyle = {
  fontFamily: process.env.EXPO_OS === 'ios' ? 'Menlo' : 'monospace',
  fontSize: font.size.caption,
  lineHeight: CODE_LINE_HEIGHT,
  color: colors.text,
};

/** Prism token → theme color, read at render time so every theme gets its own syntax colors. */
export function tokenColor(type: string): string {
  switch (type) {
    case 'comment': return colors.textFaint;
    case 'keyword': return colors.primary;
    case 'string':
    case 'template-string': return colors.success;
    case 'number':
    case 'boolean': return colors.warning;
    case 'function':
    case 'class-name': return colors.info;
    case 'regex': return colors.danger;
    case 'operator':
    case 'punctuation': return colors.textMuted;
    default: return colors.text;
  }
}
