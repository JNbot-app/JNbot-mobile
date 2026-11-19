import React, { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { highlightLines, type CodeLine } from '../../features/plugins/code/highlight';
import { colors, spacing } from '../../theme/theme';
import { CODE_LINE_HEIGHT as LH, codeTextStyle, tokenColor } from './codeTheme';

/** Above this size typing stays plain text so the phone keeps up. */
const HIGHLIGHT_LIMIT = 20_000;
const PAD = spacing.md;
/** Room below the last line so it can scroll above the floating AI button. */
const TAIL = LH * 5;
const CLOSERS: Record<string, string> = { '{': '}', '(': ')', '[': ']' };

export type CodeEditorHandle = {
  /** Replaces the selection with `text`, like typing it. */
  insert(text: string): void;
  focus(): void;
  blur(): void;
  /** Selects a range and scrolls it into view (find results). */
  select(start: number, end: number): void;
};

/** Zero-based line and column of a character index. */
export function position(text: string, index: number) {
  let line = 0;
  let start = 0;
  for (let at = text.indexOf('\n'); at !== -1 && at < index; at = text.indexOf('\n', at + 1)) {
    line++;
    start = at + 1;
  }
  return { line, column: index - start };
}

/** Follows the file's own indentation, defaulting to two spaces. */
export function indentUnit(code: string) {
  const first = /^([ \t]+)\S/m.exec(code)?.[1];
  if (first?.startsWith('\t')) return '\t';
  return first?.length === 4 ? '    ' : '  ';
}

/** The edit that a typed newline becomes: the line's indentation, one level deeper after an opening bracket. */
export function newlineEdit(code: string, at: number, unit: string) {
  const before = code.slice(code.lastIndexOf('\n', at - 1) + 1, at);
  const base = /^[ \t]*/.exec(before)![0];
  const closer = CLOSERS[before.trimEnd().slice(-1)];
  if (!closer) return { text: `\n${base}`, caret: at + 1 + base.length };
  const inner = base + unit;
  return { text: `\n${inner}${code[at] === closer ? `\n${base}` : ''}`, caret: at + 1 + inner.length };
}

type Props = {
  value: string;
  language: 'js' | 'ts';
  editable: boolean;
  /** Zero-based line to mark, such as the current find result. */
  markedLine: number | null;
  onChange: (code: string, group?: boolean) => void;
  onFocusChange: (focused: boolean) => void;
  onCursor: (line: number, column: number) => void;
};

export const CodeEditor = forwardRef<CodeEditorHandle, Props>(function CodeEditor(
  { value, language, editable, markedLine, onChange, onFocusChange, onCursor },
  ref,
) {
  const input = useRef<TextInput>(null);
  const vertical = useRef<ScrollView>(null);
  const horizontal = useRef<ScrollView>(null);
  const valueRef = useRef(value);
  valueRef.current = value;
  const selection = useRef({ start: 0, end: 0 });
  const pendingCaret = useRef<number | null>(null);
  const view = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [charWidth, setCharWidth] = useState(8);
  const [focused, setFocused] = useState(false);
  const [cursorLine, setCursorLine] = useState(0);

  const lines = useMemo(
    () => (value.length <= HIGHLIGHT_LIMIT ? highlightLines(value, language) : null),
    [value, language],
  );
  const { count, longest } = useMemo(() => {
    const rows = value.split('\n');
    return { count: rows.length, longest: rows.reduce((max, row) => Math.max(max, row.length), 0) };
  }, [value]);
  const unit = useMemo(() => indentUnit(value), [value]);

  // Place the caret after edits made here (keys, auto-indent) once the new text is rendered.
  useEffect(() => {
    if (pendingCaret.current === null) return;
    const caret = pendingCaret.current;
    pendingCaret.current = null;
    input.current?.setSelection(caret, caret);
  }, [value]);

  const scrollTo = useCallback((line: number, column: number, center = false) => {
    const { x, y, width, height } = view.current;
    const top = PAD + line * LH;
    if (center) vertical.current?.scrollTo({ y: Math.max(0, top - height / 3), animated: true });
    else if (top < y) vertical.current?.scrollTo({ y: Math.max(0, top - LH), animated: false });
    else if (top + 2 * LH > y + height) vertical.current?.scrollTo({ y: top + 2 * LH - height, animated: false });
    const left = PAD + column * charWidth;
    if (left < x + charWidth) horizontal.current?.scrollTo({ x: Math.max(0, left - 8 * charWidth), animated: false });
    else if (left + 2 * charWidth > x + width) horizontal.current?.scrollTo({ x: left + 8 * charWidth - width, animated: false });
  }, [charWidth]);

  const replaceSelection = useCallback((text: string) => {
    const { start, end } = selection.current;
    const current = valueRef.current;
    pendingCaret.current = start + text.length;
    onChange(current.slice(0, start) + text + current.slice(end), false);
  }, [onChange]);

  useImperativeHandle(ref, () => ({
    insert: (text) => replaceSelection(text === '\t' ? unit : text),
    focus: () => input.current?.focus(),
    blur: () => input.current?.blur(),
    select: (start, end) => {
      selection.current = { start, end };
      input.current?.setSelection(start, end);
      const { line, column } = position(valueRef.current, start);
      scrollTo(line, column, true);
    },
  }), [replaceSelection, scrollTo, unit]);

  const handleChange = (next: string) => {
    const current = valueRef.current;
    if (next.length === current.length + 1) {
      let at = 0;
      while (at < current.length && current[at] === next[at]) at++;
      if (next[at] === '\n') {
        const edit = newlineEdit(current, at, unit);
        pendingCaret.current = edit.caret;
        return onChange(current.slice(0, at) + edit.text + current.slice(at), false);
      }
    }
    onChange(next);
  };

  const gutter = useMemo(() => {
    const active = markedLine ?? (focused ? cursorLine : -1);
    const numbers = Array.from({ length: count }, (_, index) => index + 1);
    if (active < 0 || active >= count) return numbers.join('\n');
    return (
      <>
        {numbers.slice(0, active).map((n) => `${n}\n`).join('')}
        <Text style={styles.activeNumber}>{active + 1}</Text>
        {numbers.slice(active + 1).map((n) => `\n${n}`).join('')}
      </>
    );
  }, [count, cursorLine, focused, markedLine]);

  const gutterWidth = Math.max(2, String(count).length) * charWidth + spacing.lg;
  const width = Math.max(viewport.width - gutterWidth, PAD * 2 + (longest + 2) * charWidth);
  const height = Math.max(viewport.height, PAD * 2 + count * LH + TAIL);

  return (
    <ScrollView
      ref={vertical}
      style={styles.flex}
      keyboardShouldPersistTaps="handled"
      scrollEventThrottle={16}
      onScroll={(event) => { view.current.y = event.nativeEvent.contentOffset.y; }}
      onLayout={(event) => {
        const { width: w, height: h } = event.nativeEvent.layout;
        view.current.height = h;
        setViewport({ width: w, height: h });
      }}
    >
      <View style={styles.row}>
        {markedLine !== null ? <View pointerEvents="none" style={[styles.band, { top: PAD + markedLine * LH }]} /> : null}
        <Text accessible={false} style={[styles.code, styles.gutter, { width: gutterWidth }]}>{gutter}</Text>
        <ScrollView
          ref={horizontal}
          horizontal
          keyboardShouldPersistTaps="handled"
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={(event) => { view.current.x = event.nativeEvent.contentOffset.x; }}
          onLayout={(event) => { view.current.width = event.nativeEvent.layout.width; }}
        >
          <TextInput
            ref={input}
            accessibilityLabel="Plugin source code"
            multiline
            scrollEnabled={false}
            editable={editable}
            onChangeText={handleChange}
            onSelectionChange={(event) => {
              const { start, end } = event.nativeEvent.selection;
              selection.current = { start, end };
              // Wait for the typed text to render so the caret's line is current.
              requestAnimationFrame(() => {
                const { line, column } = position(valueRef.current, end);
                setCursorLine(line);
                onCursor(line + 1, column + 1);
                if (input.current?.isFocused()) scrollTo(line, column);
              });
            }}
            onFocus={() => { setFocused(true); onFocusChange(true); }}
            onBlur={() => { setFocused(false); onFocusChange(false); }}
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect={false}
            spellCheck={false}
            smartInsertDelete={false}
            keyboardType={process.env.EXPO_OS === 'ios' ? 'ascii-capable' : 'default'}
            textAlignVertical="top"
            selectionColor={colors.primary}
            underlineColorAndroid="transparent"
            style={[styles.code, styles.input, { width, minHeight: height }]}
          >
            {lines ? lines.map((line, index) => <LineText key={index} line={line} last={index === lines.length - 1} />) : value}
          </TextInput>
        </ScrollView>
      </View>
      <Text
        accessible={false}
        style={[styles.code, styles.measure]}
        onLayout={(event) => setCharWidth(event.nativeEvent.layout.width / 40)}
      >
        {'0'.repeat(40)}
      </Text>
    </ScrollView>
  );
});

const sameLine = (a: { line: CodeLine; last: boolean }, b: { line: CodeLine; last: boolean }) =>
  a.last === b.last &&
  a.line.text === b.line.text &&
  a.line.spans.length === b.line.spans.length &&
  a.line.spans.every((span, index) => span.type === b.line.spans[index].type && span.text === b.line.spans[index].text);

/** One highlighted line; unchanged lines skip re-rendering while typing. */
const LineText = memo(function LineText({ line, last }: { line: CodeLine; last: boolean }) {
  return (
    <Text>
      {line.spans.map((span, index) => <Text key={index} style={{ color: tokenColor(span.type) }}>{span.text}</Text>)}
      {last ? null : '\n'}
    </Text>
  );
}, sameLine);

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row' },
  code: { ...codeTextStyle, includeFontPadding: false },
  gutter: { paddingTop: PAD, paddingRight: spacing.sm, textAlign: 'right', color: colors.textFaint },
  activeNumber: { color: colors.text },
  input: { padding: PAD, paddingTop: PAD, paddingBottom: PAD },
  band: { position: 'absolute', left: 0, right: 0, height: LH, backgroundColor: colors.primarySoft },
  measure: { position: 'absolute', opacity: 0 },
});
