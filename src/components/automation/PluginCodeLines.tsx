import React, { useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { highlightLines } from '../../features/plugins/code/highlight';
import { colors, font, radii, spacing } from '../../theme/theme';
import { Txt } from '../ui';

const tokenColors: Record<string, string> = {
  comment: colors.textFaint,
  keyword: '#C4A7FF',
  string: '#A8D8A0',
  'template-string': '#A8D8A0',
  number: '#FFD2A0',
  boolean: '#FFD2A0',
  function: colors.info,
  'class-name': colors.info,
  regex: colors.warning,
};

export function PluginCodeLines({ code, language }: { code: string; language: 'js' | 'ts' }) {
  const [query, setQuery] = useState('');
  const lines = useMemo(() => highlightLines(code, language), [code, language]);
  const needle = query.toLowerCase();
  const visible = needle ? lines.filter((line) => line.text.toLowerCase().includes(needle)) : lines;
  const codeWidth = useMemo(
    () => Math.max(320, ...visible.map((line) => line.text.length * 8 + 68)),
    [visible],
  );
  return (
    <View style={styles.container}>
      <TextInput
        accessibilityLabel="Find code lines"
        placeholder="Find in code"
        placeholderTextColor={colors.textFaint}
        value={query}
        onChangeText={setQuery}
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
        style={styles.search}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ width: codeWidth }}>
        <FlatList
          style={styles.lines}
          data={visible}
          keyExtractor={(line) => String(line.number)}
          keyboardDismissMode="on-drag"
          initialNumToRender={30}
          windowSize={7}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Txt variant="muted">No matching lines.</Txt>}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Text accessible={false} style={[styles.code, styles.number]}>{item.number}</Text>
              <Text selectable numberOfLines={1} style={[styles.code, styles.source]}>
                {item.spans.length ? item.spans.map((span, index) => (
                  <Text key={index} style={{ color: tokenColors[span.type] ?? colors.text }}>{span.text}</Text>
                )) : ' '}
              </Text>
            </View>
          )}
        />
      </ScrollView>
    </View>
  );
}

export const codeTextStyle = {
  fontFamily: process.env.EXPO_OS === 'ios' ? 'Menlo' : 'monospace',
  fontSize: font.size.caption,
  lineHeight: 21,
  color: colors.text,
};
const styles = StyleSheet.create({
  container: { flex: 1 },
  search: { marginHorizontal: spacing.lg, padding: spacing.md, minHeight: 44, backgroundColor: colors.surface, color: colors.text, borderRadius: radii.sm },
  count: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  list: { paddingBottom: spacing.xl },
  lines: { flex: 1 },
  row: { flexDirection: 'row', paddingRight: spacing.lg },
  code: codeTextStyle,
  number: { minWidth: 52, paddingRight: spacing.md, textAlign: 'right', color: colors.textFaint },
  source: { flex: 1 },
});
