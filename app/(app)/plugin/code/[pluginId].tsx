import React, { useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Pressable, StyleSheet, View } from "react-native";
import { useNavigation, usePreventRemove } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Screen } from "../../../../src/components/Screen";
import { Button, EmptyState, Txt } from "../../../../src/components/ui";
import { NativeIcon } from "../../../../src/components/NativeIcon";
import { LlmPrompt, type LlmPromptProps } from "../../../../src/components/LlmPrompt";
import { CodeEditor, position, type CodeEditorHandle } from "../../../../src/components/pluginEditor/CodeEditor";
import { CodeKeyBar } from "../../../../src/components/pluginEditor/CodeKeyBar";
import { FindBar } from "../../../../src/components/pluginEditor/FindBar";
import { PluginCodeLines } from "../../../../src/components/pluginEditor/PluginCodeLines";
import { CODE_EDIT_LIMIT } from "../../../../src/features/plugins/code/highlight";
import type { OptionSection } from "../../../../src/features/plugins/optionSchema";
import type { LlmPluginDraft } from "../../../../src/generated/client-contract/llm";
import { usePluginSource } from "../../../../src/hooks/usePluginSource";
import { useUndoableText } from "../../../../src/hooks/useUndoableText";
import { useClient } from "../../../../src/net/ConnectionProvider";
import { selectCanUsePlugins, useStore } from "../../../../src/store/store";
import { colors, spacing } from "../../../../src/theme/theme";

const AI_EXAMPLES = ["What does this plugin do?", "Add options for the hard-coded values", "Recover when the bot is kicked to the hub"];
const MAX_MATCHES = 999;

function findAll(text: string, query: string) {
  const matches: number[] = [];
  if (!query) return matches;
  const haystack = text.toLowerCase();
  const needle = query.toLowerCase();
  for (let at = haystack.indexOf(needle); at !== -1 && matches.length < MAX_MATCHES; at = haystack.indexOf(needle, at + needle.length)) {
    matches.push(at);
  }
  return matches;
}

function HeaderIcon({ label, sf, material, onPress }: { label: string; sf: "magnifyingglass" | "slider.horizontal.3"; material: "search" | "tune"; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} hitSlop={6} onPress={onPress} style={({ pressed }) => [styles.headerIcon, pressed && styles.pressed]}>
      <NativeIcon sf={sf} material={material} size={20} color={colors.text} />
    </Pressable>
  );
}

/** The phone's take on the desktop code editor: highlighted editing, a symbol row, find and AI. */
export default function PluginCodeScreen() {
  const { pluginId } = useLocalSearchParams<{ pluginId: string }>();
  const plugin = useStore((state) => state.macros.list.find((item) => item.pluginId === pluginId));
  const canEdit = useStore(selectCanUsePlugins);
  const client = useClient();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const draft = useUndoableText();
  const { source, error, saving, save, reload } = usePluginSource(pluginId, draft.reset);
  const editor = useRef<CodeEditorHandle>(null);
  const [focused, setFocused] = useState(false);
  const [cursor, setCursor] = useState("");
  const [query, setQuery] = useState<string | null>(null);
  const [match, setMatch] = useState(0);

  const code = draft.text;
  const dirty = source !== null && code !== source.code;
  const large = source !== null && source.code.length > CODE_EDIT_LIMIT;
  const editable = canEdit && !saving;
  const matches = useMemo(() => findAll(code, query ?? ""), [code, query]);
  const current = Math.min(match, matches.length - 1);
  const markedLine = query && current >= 0 ? position(code, matches[current]).line : null;

  const reveal = (index: number, found = matches, length = query?.length ?? 0) => {
    setMatch(index);
    if (found[index] !== undefined) editor.current?.select(found[index], found[index] + length);
  };

  usePreventRemove(dirty, ({ data }) =>
    Alert.alert("Unsaved code", "Save your changes before leaving?", [
      { text: "Stay", style: "cancel" },
      { text: "Discard", style: "destructive", onPress: () => navigation.dispatch(data.action) },
      { text: "Save", onPress: () => void save(code).then((ok) => ok && navigation.dispatch(data.action)) },
    ]),
  );

  // The AI rewrites the draft; nothing is saved until Save, and undo brings the old code back.
  const writeWithAi: LlmPromptProps["onSubmit"] = async (description, run) => {
    if (!plugin) return undefined;
    const changing = code.trim().length > 80;
    const result = await run<LlmPluginDraft>({
      event: "LLM_WRITE_PLUGIN",
      input: {
        description,
        scriptType: plugin.scriptType === "action" ? "action" : "script",
        source: changing ? code : undefined,
        optionSchema: changing ? plugin.config : undefined,
      },
    });
    if (!result?.source) return undefined;
    draft.change(result.source, false);
    // Like the desktop, options the AI adds to the plugin are kept right away.
    if (Array.isArray(result.optionSchema) && result.optionSchema.length)
      await client?.savePluginInfo({ ...plugin, config: result.optionSchema as OptionSection[] });
    return (dismiss) => (
      <Button title="Undo" variant="secondary" small style={styles.undo} onPress={() => { draft.undo(); dismiss(); }} />
    );
  };

  const subtitle = !source
    ? undefined
    : focused && cursor
      ? `${cursor}${dirty ? " · Edited" : ""}`
      : dirty
        ? "Unsaved changes"
        : !canEdit
          ? "Read-only"
          : source.language === "ts" ? "TypeScript" : "JavaScript";

  const header = (
    <View style={styles.headerActions}>
      {source && !large ? <HeaderIcon label="Find in code" sf="magnifyingglass" material="search" onPress={() => setQuery((value) => value ?? "")} /> : null}
      {canEdit ? (
        <HeaderIcon
          label="Plugin settings"
          sf="slider.horizontal.3"
          material="tune"
          onPress={() => router.push({ pathname: "/(app)/plugin/settings/[pluginId]", params: { pluginId, from: "code" } })}
        />
      ) : null}
      {dirty ? <Button title="Save" small loading={saving} onPress={() => void save(code)} /> : null}
    </View>
  );

  let body: React.ReactNode;
  if (!source) {
    body = error ? (
      <View style={styles.center}>
        <EmptyState icon={<NativeIcon sf="exclamationmark.triangle" material="warning" size={36} color={colors.textFaint} />} title="Code unavailable" subtitle={error} />
        <Button title="Try again" variant="secondary" onPress={reload} />
      </View>
    ) : (
      <ActivityIndicator accessibilityLabel="Loading code" color={colors.primary} style={styles.center} />
    );
  } else if (large) {
    body = (
      <>
        <Txt variant="muted" style={styles.notice}>This file is too large to edit on a phone. Edit it on the desktop.</Txt>
        <PluginCodeLines code={source.code} language={source.language} />
      </>
    );
  } else {
    body = (
      <>
        {query !== null ? (
          <FindBar
            query={query}
            index={current}
            total={matches.length}
            onChangeQuery={(next) => {
              setQuery(next);
              reveal(0, findAll(code, next), next.length);
            }}
            onStep={(direction) => matches.length && reveal((current + direction + matches.length) % matches.length)}
            onClose={() => setQuery(null)}
          />
        ) : null}
        {error ? <Txt accessibilityRole="alert" style={[styles.notice, styles.error]}>{error}</Txt> : null}
        <CodeEditor
          ref={editor}
          value={code}
          language={source.language}
          editable={editable}
          markedLine={markedLine}
          onChange={draft.change}
          onFocusChange={setFocused}
          onCursor={(line, column) => setCursor(`Ln ${line}, Col ${column}`)}
        />
        {focused ? (
          <CodeKeyBar
            onInsert={(text) => editor.current?.insert(text)}
            onUndo={draft.undo}
            canUndo={draft.canUndo}
            onDone={() => editor.current?.blur()}
          />
        ) : editable && query === null && plugin?.scriptType !== "profileUi" ? (
          <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { bottom: insets.bottom }]}>
            <LlmPrompt
              floating
              collapsedLabel="Write with AI"
              placeholder={code.trim().length > 80 ? "Describe what to change in the code" : "Describe what this plugin should do"}
              button={code.trim().length > 80 ? "Change" : "Write"}
              examples={AI_EXAMPLES}
              writingLabel="Writing code"
              onSubmit={writeWithAi}
            />
          </View>
        ) : null}
      </>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={process.env.EXPO_OS === "ios" ? "padding" : undefined}>
      <Screen title={plugin?.name ?? "Code"} subtitle={subtitle} back right={header}>
        {body}
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.lg, padding: spacing.lg },
  headerActions: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  headerIcon: { width: 40, height: 44, alignItems: "center", justifyContent: "center" },
  pressed: { opacity: 0.6 },
  notice: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  error: { color: colors.danger },
  undo: { alignSelf: "flex-start" },
});
