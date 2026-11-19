import React, { useEffect, useRef, useState } from "react";
import { Alert, KeyboardAvoidingView, StyleSheet } from "react-native";
import { useNavigation, usePreventRemove } from "@react-navigation/native";
import { useLocalSearchParams } from "expo-router";
import { Screen } from "../../../../src/components/Screen";
import { Button, EmptyState, Txt } from "../../../../src/components/ui";
import { CodeEditor, type CodeEditorHandle } from "../../../../src/components/pluginEditor/CodeEditor";
import { CodeKeyBar } from "../../../../src/components/pluginEditor/CodeKeyBar";
import { useFeedback } from "../../../../src/components/AppFeedback";
import { saveChainPatch } from "../../../../src/features/chains";
import { chainSetupToSave, defaultChainSetup } from "../../../../src/generated/client-contract/chains";
import { useUndoableText } from "../../../../src/hooks/useUndoableText";
import { useClient } from "../../../../src/net/ConnectionProvider";
import { selectCanUseScripts, useStore } from "../../../../src/store/store";
import { colors, spacing } from "../../../../src/theme/theme";

/** A chain's setup code: JavaScript that runs for every alt before the steps. */
export default function ChainSetupScreen() {
  const { chainId } = useLocalSearchParams<{ chainId: string }>();
  const chain = useStore((state) => state.settings.scripts.chains?.[chainId]);
  const canEdit = useStore(selectCanUseScripts);
  const client = useClient();
  const navigation = useNavigation();
  const { showMessage } = useFeedback();
  // A chain without setup code starts from the same example as on the desktop.
  const saved = chain ? chain.setup ?? defaultChainSetup(chain) : "";
  const draft = useUndoableText(saved);
  const editor = useRef<CodeEditorHandle>(null);
  const [focused, setFocused] = useState(false);
  const [saving, setSaving] = useState(false);
  const dirty = draft.text !== saved;

  // Changed elsewhere (e.g. on the desktop) while there are no edits here.
  useEffect(() => {
    if (!dirty) draft.reset(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved]);

  const save = async () => {
    if (!client || !chain) return false;
    setSaving(true);
    try {
      await client.updateSettings(saveChainPatch({ ...chain, setup: chainSetupToSave(chain, draft.text) }));
      return true;
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Could not save the setup code.", "error");
      return false;
    } finally {
      setSaving(false);
    }
  };

  usePreventRemove(dirty, ({ data }) =>
    Alert.alert("Unsaved code", "Save your changes before leaving?", [
      { text: "Stay", style: "cancel" },
      { text: "Discard", style: "destructive", onPress: () => navigation.dispatch(data.action) },
      { text: "Save", onPress: () => void save().then((ok) => ok && navigation.dispatch(data.action)) },
    ]),
  );

  if (!chain) {
    return <Screen title="Setup code" back><EmptyState title="Chain not found" subtitle="It may have been removed from this profile." /></Screen>;
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={process.env.EXPO_OS === "ios" ? "padding" : undefined}>
      <Screen
        title="Setup code"
        subtitle={dirty ? "Unsaved changes" : canEdit ? "JavaScript" : "Read-only"}
        back
        right={dirty ? <Button title="Save" small loading={saving} onPress={() => void save()} /> : undefined}
      >
        <Txt variant="muted" style={styles.notice}>
          Runs for every account before the steps. Use `chain` to set step options, patch how a step works, or skip steps. `options` holds the chain's own options.
        </Txt>
        <CodeEditor
          ref={editor}
          value={draft.text}
          language="js"
          editable={canEdit && !saving}
          markedLine={null}
          onChange={draft.change}
          onFocusChange={setFocused}
          onCursor={() => undefined}
        />
        {focused ? (
          <CodeKeyBar
            onInsert={(text) => editor.current?.insert(text)}
            onUndo={draft.undo}
            canUndo={draft.canUndo}
            onDone={() => editor.current?.blur()}
          />
        ) : null}
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  notice: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
});
