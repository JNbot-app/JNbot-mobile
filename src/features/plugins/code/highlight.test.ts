import { CODE_EDIT_LIMIT, highlightLines } from './highlight';

describe('plugin code highlighting', () => {
  it('keeps multiline token colors and original line numbers', () => {
    const lines = highlightLines('/* first\nsecond */\nconst name: string = `hello\nworld`;\n', 'ts');
    expect(lines.map((line) => line.text).join('\n')).toBe('/* first\nsecond */\nconst name: string = `hello\nworld`;\n');
    expect(lines.map((line) => line.number)).toEqual([1, 2, 3, 4, 5]);
    expect(lines[1].spans[0].type).toBe('comment');
    expect(lines[2].spans).toContainEqual({ text: 'const', type: 'keyword' });
  });

  it('handles empty source and mixed line endings without losing blank lines', () => {
    expect(highlightLines('', 'js')).toEqual([{ number: 1, text: '', spans: [] }]);
    expect(highlightLines('a\r\n\rb\n', 'js').map((line) => line.text)).toEqual(['a', '', 'b', '']);
  });

  it('uses plain text for large files', () => {
    const code = '// ' + 'a'.repeat(CODE_EDIT_LIMIT);
    expect(highlightLines(code, 'js')[0].spans).toEqual([{ text: code, type: '' }]);
  });
});
