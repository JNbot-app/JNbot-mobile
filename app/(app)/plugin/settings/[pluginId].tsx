import React, { useEffect, useState } from "react";
import { Alert, BackHandler, ScrollView, StyleSheet } from "react-native";
import { useNavigation, usePreventRemove } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Screen } from "../../../../src/components/Screen";
import { Button, EmptyState } from "../../../../src/components/ui";
import { NativeIcon } from "../../../../src/components/NativeIcon";
import { useAutomationDrawer } from "../../../../src/components/automation/AutomationDrawer";
import { OptionForm } from "../../../../src/components/pluginEditor/OptionForm";
import { OptionSections } from "../../../../src/components/pluginEditor/OptionSections";
import { PluginInfoForm, isImageUrl, type PluginInfoDraft } from "../../../../src/components/pluginEditor/PluginInfoForm";
import { cleanOption, validateOption, type OptionSection } from "../../../../src/features/plugins/optionSchema";
import { validateNewPlugin } from "../../../../src/features/plugins/newPlugin";
import { useClient } from "../../../../src/net/ConnectionProvider";
import type { SerializableOption } from "../../../../src/runtime/types";
import type { MacroInfo } from "../../../../src/store/types";
import { useStore } from "../../../../src/store/store";
import { colors, spacing } from "../../../../src/theme/theme";

type Editing = { section: number; index: number | null; option: SerializableOption };

const toDraft = (plugin: MacroInfo): PluginInfoDraft => ({
  name: plugin.name,
  description: plugin.description ?? "",
  scriptType: plugin.scriptType,
  banner: plugin.banner ?? "",
  config: Array.isArray(plugin.config) ? plugin.config : [],
});

const sameDraft = (a: PluginInfoDraft, b: PluginInfoDraft) => JSON.stringify(a) === JSON.stringify(b);

/** Name, type, banner and options of a plugin: the desktop's Plugin settings dialog as pages. */
export default function PluginSettingsScreen() {
  const { pluginId, from } = useLocalSearchParams<{ pluginId: string; from?: string }>();
  const plugin = useStore((state) => state.macros.list.find((item) => item.pluginId === pluginId));
  const client = useClient();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { deletePlugin } = useAutomationDrawer();
  const [draft, setDraft] = useState(() => (plugin ? toDraft(plugin) : null));
  const [page, setPage] = useState<"main" | "options">("main");
  const [editing, setEditing] = useState<Editing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"saving" | "deleting" | "done" | null>(null);
  const dirty = Boolean(plugin && draft && !sameDraft(draft, toDraft(plugin)));

  const nested = editing ? "option" : page === "options" ? "options" : null;
  const back = nested ? () => (nested === "option" ? setEditing(null) : setPage("main")) : undefined;
  // Android back closes the open page before leaving the screen.
  useEffect(() => {
    if (!nested) return undefined;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (nested === "option") setEditing(null);
      else setPage("main");
      return true;
    });
    return () => sub.remove();
  }, [nested]);

  // Leave once the saved (or deleted) plugin is in the store, so the unsaved-changes guard stays quiet.
  useEffect(() => {
    if (busy === "done") router.back();
  }, [busy, router]);

  const save = async (): Promise<boolean> => {
    if (!plugin || !draft || !client) return false;
    const name = draft.name.trim();
    const description = draft.description.trim();
    const invalid = validateNewPlugin(name, description);
    const problem = invalid?.name ?? invalid?.description ??
      (draft.banner && !isImageUrl(draft.banner) ? "The banner must be a web address starting with https://." : null);
    if (problem) {
      setError(problem);
      setEditing(null);
      setPage("main");
      return false;
    }
    setBusy("saving");
    setError(null);
    try {
      await client.savePluginInfo({
        ...plugin,
        name,
        description,
        scriptType: draft.scriptType,
        banner: draft.banner || undefined,
        config: draft.config.length ? draft.config : undefined,
      });
      setBusy("done");
      return true;
    } catch (cause) {
      setBusy(null);
      setError(cause instanceof Error ? cause.message : "Could not save the plugin.");
      return false;
    }
  };

  usePreventRemove(dirty && !busy, ({ data }) =>
    Alert.alert("Unsaved changes", "Save your changes to this plugin before leaving?", [
      { text: "Stay", style: "cancel" },
      { text: "Discard", style: "destructive", onPress: () => navigation.dispatch(data.action) },
      { text: "Save", onPress: () => void save() },
    ]),
  );

  const confirmDelete = () => {
    if (!plugin) return;
    Alert.alert("Delete plugin?", `This removes ${plugin.name} and its saved settings.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          setBusy("deleting");
          deletePlugin(plugin).then(
            () => router.dismissAll(),
            (cause: unknown) => {
              setBusy(null);
              Alert.alert("Could not delete plugin", cause instanceof Error ? cause.message : "Try again.");
            },
          );
        },
      },
    ]);
  };

  if (!plugin || !draft) {
    return (
      <Screen title="Plugin" back>
        <EmptyState icon={<NativeIcon sf="questionmark.folder" material="folder-off" size={36} color={colors.textFaint} />} title="Plugin not found" subtitle="It may have been deleted." />
      </Screen>
    );
  }

  const setConfig = (config: OptionSection[]) => setDraft({ ...draft, config });

  const applyOption = () => {
    if (!editing) return;
    const { section, index, option } = editing;
    const takenIds = draft.config.flatMap((item, at) => item.options.filter((_, i) => at !== section || i !== index).map((other) => other.id));
    const problem = validateOption(option, takenIds);
    if (problem) return Alert.alert("Check this option", problem);
    const options = [...draft.config[section].options];
    if (index === null) options.push(cleanOption(option));
    else options[index] = cleanOption(option);
    setConfig(draft.config.map((item, at) => (at === section ? { ...item, options } : item)));
    setEditing(null);
  };

  const deleteOption = () => {
    if (!editing || editing.index === null) return;
    const { section, index } = editing;
    setConfig(draft.config.map((item, at) => (at === section ? { ...item, options: item.options.filter((_, i) => i !== index) } : item)));
    setEditing(null);
  };

  const title = editing ? (editing.index === null ? "New option" : "Option") : page === "options" ? "Options" : "Plugin settings";
  const right = editing ? (
    <Button title={editing.index === null ? "Add" : "Done"} small onPress={applyOption} />
  ) : dirty ? (
    <Button title="Save" small loading={busy === "saving"} onPress={() => void save()} />
  ) : null;

  return (
    <Screen title={title} subtitle={editing || page === "options" ? draft.name : undefined} back onBack={back} right={right}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xl }]}
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={process.env.EXPO_OS === "ios" ? "interactive" : "on-drag"}
      >
        {editing ? (
          <OptionForm
            key={`${editing.section}:${editing.index}`}
            option={editing.option}
            isNew={editing.index === null}
            onChange={(option) => setEditing({ ...editing, option })}
            onDelete={editing.index === null ? undefined : deleteOption}
          />
        ) : page === "options" ? (
          <OptionSections
            sections={draft.config}
            onChange={setConfig}
            onEdit={(section, index) =>
              setEditing({
                section,
                index,
                option: index === null ? { id: "", label: "", type: "input" } : draft.config[section].options[index],
              })
            }
          />
        ) : (
          <>
            <PluginInfoForm
              draft={draft}
              error={error}
              onChange={(patch) => setDraft({ ...draft, ...patch })}
              onOpenOptions={() => setPage("options")}
              onOpenCode={
                from !== "code" && (plugin.language === "js" || plugin.language === "ts")
                  ? () => router.push({ pathname: "/(app)/plugin/code/[pluginId]", params: { pluginId } })
                  : undefined
              }
            />
            <Button title="Delete plugin" variant="danger" full loading={busy === "deleting"} onPress={confirmDelete} />
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: spacing.lg, gap: spacing.xl },
});
