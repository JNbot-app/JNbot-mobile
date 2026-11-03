import React, { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { PluginOptionInput, type Choice } from "../../../../src/components/PluginOptions";
import { Button, EmptyState, Txt } from "../../../../src/components/ui";
import { useFeedback } from "../../../../src/components/AppFeedback";
import { createChainPatches, DEFAULT_CHAIN_OPTIONS, getChainOptions, isChainOptionId, saveChainOptionsPatch, setChainOption } from "../../../../src/features/chains";
import { useClient } from "../../../../src/net/ConnectionProvider";
import { useStore } from "../../../../src/store/store";
import { selectCanUseScripts } from "../../../../src/store/store";
import type { ChainOptions } from "../../../../src/store/types";
import type { SerializableOption } from "../../../../src/runtime/types";
import { colors, spacing } from "../../../../src/theme/theme";
import { NativeIcon } from "../../../../src/components/NativeIcon";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Screen } from "../../../../src/components/Screen";

const optionSections: Array<{ title: string; options: SerializableOption[] }> = [
  {
    title: "General",
    options: [
      { id: "name", type: "input", label: "Chain name", placeholder: "e.g. Daily rewards" },
      { id: "description", type: "input", label: "Description", placeholder: "What does this chain do?" },
      { id: "gamemode", type: "gamemodeSelect", label: "Game mode" },
    ],
  },
  {
    title: "Account selection",
    options: [
      { id: "altRange", type: "altRange", label: "Account range" },
      { id: "withTags", type: "tagsSelect", label: "Only these tags", clearable: true },
      { id: "ignoreAlts", type: "altsSelect", label: "Skip accounts", clearable: true },
      { id: "withRanks", type: "switch", label: "Only accounts with a rank" },
      { id: "withGkits", type: "switch", label: "Only accounts with a gkit" },
    ],
  },
];

export default function ChainSettings() {
  const { chainId } = useLocalSearchParams<{ chainId: string }>();
  const client = useClient();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const creating = chainId === "new";
  const { showMessage } = useFeedback();
  const settings = useStore((state) => state.settings);
  const alts = useStore((state) => state.alts);
  const jndata = useStore((state) => state.JNdata);
  const activeProfileKey = useStore((state) => state.activeProfileKey);
  const canUseScripts = useStore(selectCanUseScripts);
  const chain = settings.scripts.chains?.[chainId];
  const [options, setOptions] = useState<ChainOptions | null>(() => creating
    ? { ...DEFAULT_CHAIN_OPTIONS, name: "", gamemode: "" }
    : chain ? getChainOptions(settings, chain) : null);
  const [selectionOpen, setSelectionOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const update = (id: string, value: unknown) => {
    if (!isChainOptionId(id)) return;
    setError("");
    setOptions((current) => current ? setChainOption(current, id, value) : current);
  };

  const save = async () => {
    if (!client || !canUseScripts || !options || saving) return;
    if (!options.name.trim() || (!options.gamemode && gamemodeOptions.length)) {
      setError(!options.name.trim() ? "Enter a chain name." : "Choose a game mode.");
      return;
    }
    setSaving(true);
    const next = { ...options, name: options.name.trim(), description: options.description?.trim() };
    try {
      if (creating) {
        const id = String(Date.now());
        await client.updateSettings(createChainPatches({ id, name: next.name, chains: [] }, next));
        router.replace({ pathname: '/(app)/chains/[chainId]', params: { chainId: id } });
      } else {
        await client.updateSettings(saveChainOptionsPatch(chainId, next));
        router.back();
      }
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Could not save chain settings.", "error");
    } finally {
      setSaving(false);
    }
  };

  const altOptions = useMemo<Choice[]>(() => alts.map((alt) => ({ label: alt.username, value: alt.username })), [alts]);
  const tagOptions = useMemo<Choice[]>(() => settings.altTags.map((tag) => ({ label: tag.name, value: tag.id })), [settings.altTags]);
  const gamemodeOptions = useMemo<Choice[]>(() => {
    const modes = activeProfileKey ? jndata?.data[activeProfileKey]?.gamemodes ?? [] : [];
    return modes.map((gamemode) => ({ label: gamemode, value: gamemode.toLowerCase() }));
  }, [activeProfileKey, jndata]);

  if ((!creating && !chain) || !options) return <Screen title="Chain settings" back><EmptyState title="Chain not found" subtitle="It may have been removed from this profile." /></Screen>;
  if (!canUseScripts) return <Screen title="Chain settings" back><EmptyState title="Scripts unavailable" subtitle="This access link does not permit editing chains." /></Screen>;

  const renderOptions = (section: (typeof optionSections)[number]) => section.options.map((option) => <PluginOptionInput
    key={option.id}
    option={option.id === "gamemode" ? { ...option, options: gamemodeOptions } : option}
    value={isChainOptionId(option.id) ? options[option.id] : undefined}
    altOptions={altOptions}
    tagOptions={tagOptions}
    onChange={(value) => update(option.id, value)}
  />);

  return <Screen title={creating ? "New chain" : "Chain settings"} back>
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.options}>{renderOptions(optionSections[0])}</View>
        {error ? <Txt accessibilityRole="alert" style={{ color: colors.danger }}>{error}</Txt> : null}
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: selectionOpen }} onPress={() => setSelectionOpen(!selectionOpen)} style={styles.selection}>
          <Txt variant="heading">Account selection</Txt>
          <NativeIcon sf={selectionOpen ? "chevron.up" : "chevron.down"} material={selectionOpen ? "expand-less" : "expand-more"} size={20} color={colors.textMuted} />
        </Pressable>
        {selectionOpen ? <View style={styles.options}>{renderOptions(optionSections[1])}</View> : null}
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: Math.max(spacing.lg, insets.bottom + spacing.sm) }]}>
        <Button title={creating ? "Create chain" : "Save settings"} full loading={saving} disabled={saving} onPress={() => void save()} />
      </View>
    </KeyboardAvoidingView>
  </Screen>;
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
  root: { flex: 1 },
  selection: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderSubtle },
  options: { gap: spacing.md },
});
