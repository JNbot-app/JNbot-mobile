import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PickerField } from "../../../../src/components/PickerField";
import ScheduleOverrides from "../../../../src/components/automation/ScheduleOverrides";
import { Button, EmptyState, Txt } from "../../../../src/components/ui";
import { useFeedback } from "../../../../src/components/AppFeedback";
import { Screen } from "../../../../src/components/Screen";
import { CHAIN_NEXT_CHOICES, type ChainNext, type ChainStep } from "../../../../src/generated/client-contract/chains";
import { chainSteps, saveChainPatch } from "../../../../src/features/chains";
import { useClient } from "../../../../src/net/ConnectionProvider";
import { useStore } from "../../../../src/store/store";
import type { MacroInfo, ScriptActionInfo } from "../../../../src/store/types";
import { colors, spacing } from "../../../../src/theme/theme";

const PLACEHOLDER_HINT =
  "Unchanged options use the action’s saved settings. Type {alt} to insert the account’s name, or {name} for a value an earlier step returned.";

/** One chain step: what happens next, and its option overrides. */
export default function ChainStepEditor() {
  const { chainId, stepId } = useLocalSearchParams<{ chainId: string; stepId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const client = useClient();
  const { showMessage } = useFeedback();
  const chain = useStore((state) => state.settings.scripts.chains?.[chainId]);
  const profileScripts = useStore((state) =>
    state.activeProfileKey ? state.JNdata?.data?.[state.activeProfileKey]?.scripts : undefined,
  );
  const index = chain?.chains.findIndex((step) => String(step.id) === stepId) ?? -1;
  const [draft, setDraft] = useState<ChainStep | undefined>(() => chain?.chains[index]);
  const [action, setAction] = useState<ScriptActionInfo>();

  useEffect(() => {
    if (!client || !draft?.scriptId) return;
    let mounted = true;
    void client.getScriptActions().then((actions) => {
      if (mounted) setAction(actions.find((item) => item.pluginId === draft.scriptId));
    }).catch(() => undefined);
    return () => { mounted = false; };
  }, [client, draft?.scriptId]);

  if (!chain || !draft || index === -1) {
    return <Screen title="Step" back><EmptyState title="Step not found" subtitle="It may have been removed from this chain." /></Screen>;
  }

  const nextOptions = [
    ...CHAIN_NEXT_CHOICES,
    ...chain.chains.map((step, i) => ({ value: `step:${step.id}`, label: `Go to step ${i + 1}`, description: step.name })),
  ];
  const nextField = (field: "onSuccess" | "onFail", label: string) => <View style={styles.field}>
    <Txt variant="heading">{label}</Txt>
    <PickerField
      title={label}
      options={nextOptions}
      value={draft[field] ?? "next"}
      onChange={(value) => setDraft({ ...draft, [field]: value === "next" ? undefined : value as ChainNext })}
    />
  </View>;

  const save = async () => {
    if (!client) return;
    const options = draft.options && Object.keys(draft.options).length ? draft.options : undefined;
    try {
      await client.updateSettings(saveChainPatch(chainSteps(chain, chain.chains.map((step, i) => i === index ? { ...draft, options } : step))));
      router.back();
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Could not save the step.", "error");
    }
  };

  return <Screen title={`Step ${index + 1}`} subtitle={action?.name ?? draft.name} back>
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      {nextField("onSuccess", "If it works")}
      {nextField("onFail", "If it fails")}
      <Txt variant="faint">A step fails when its action stops with an error or reports that it failed.</Txt>
      {action ? <ScheduleOverrides
        script={{
          info: action as MacroInfo,
          profileScriptId: action.profile ? profileScripts?.find((s: { id: string; pluginId: string }) => s.pluginId === action.pluginId)?.id : undefined,
        }}
        values={draft.options ?? {}}
        onChange={(options) => setDraft({ ...draft, options })}
        label="Action options"
        hint={PLACEHOLDER_HINT}
      /> : null}
    </ScrollView>
    <View style={[styles.footer, { paddingBottom: Math.max(spacing.lg, insets.bottom + spacing.sm) }]}>
      <Button title="Save step" full onPress={() => void save()} />
    </View>
  </Screen>;
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
  field: { gap: spacing.xs },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderSubtle },
});
