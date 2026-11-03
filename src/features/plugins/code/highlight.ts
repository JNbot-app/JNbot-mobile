import Prism from 'prismjs/components/prism-core';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';

// Bound regex work and the native editor's size; larger files remain readable.
export const CODE_EDIT_LIMIT = 100_000;
export type CodeSpan = { text: string; type: string };
export type CodeLine = { number: number; text: string; spans: CodeSpan[] };

export function highlightLines(code: string, language: 'js' | 'ts'): CodeLine[] {
  const lines: CodeLine[] = [{ number: 1, text: '', spans: [] }];
  const append = (text: string, type: string) => {
    text.split(/\r\n|\r|\n/).forEach((part, index) => {
      if (index) lines.push({ number: lines.length + 1, text: '', spans: [] });
      const line = lines[lines.length - 1];
      line.text += part;
      if (part) line.spans.push({ text: part, type });
    });
  };
  const visit = (token: string | Prism.Token, inherited = ''): void => {
    if (typeof token === 'string') return append(token, inherited);
    const content = token.content;
    if (Array.isArray(content)) content.forEach((child) => visit(child, token.type));
    else visit(content, token.type);
  };
  if (code.length > CODE_EDIT_LIMIT) append(code, '');
  else {
    try {
      Prism.tokenize(code, Prism.languages[language === 'ts' ? 'typescript' : 'javascript']).forEach((token) => visit(token));
    } catch {
      return code.split(/\r\n|\r|\n/).map((text, index) => ({
        number: index + 1, text, spans: [{ text, type: '' }],
      }));
    }
  }
  return lines;
}
