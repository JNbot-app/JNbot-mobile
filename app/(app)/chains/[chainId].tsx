import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PickerModal } from "../../../src/components/PickerField";
import { ChainStepList } from "../../../src/components/chains/ChainStepList";
import { ChainStepRow } from "../../../src/components/chains/ChainStepRow";
import { ShareUpdateRow } from "../../../src/components/share/ShareUpdateRow";
import { NativeIcon } from "../../../src/components/NativeIcon";
import { Button, EmptyState, IconButton, PressableCard, Txt } from "../../../src/components/ui";
import { useFeedback } from "../../../src/components/AppFeedback";
import {
  chainSteps,
  createChainStep,
  deleteChainPatches,
  getChainOptions,
  isChainScript,
  isRunnableChain,
  moveChainStep,
  removeChainStep,
  saveChainPatch,
  saveChainOptionsPatch,
} from "../../../src/features/chains";
import { useClient } from "../../../src/net/ConnectionProvider";
import { selectCanUseAccounts, selectCanUseScripts, useStore } from "../../../src/store/store";
import type { Chain, ScriptActionInfo } from "../../../src/store/types";
import { colors, spacing } from "../../../src/theme/theme";
import { Screen } from "../../../src/components/Screen";
import { useOpenShareLink, useShareActions } from "../../../src/features/shares";
import { LlmPrompt } from "../../../src/components/LlmPrompt";

export default function ChainEditor() {
  const { chainId } = useLocalSearchParams<{ chainId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const client = useClient();
  const { showMessage } = useFeedback();
  const settings = useStore((state) => state.settings);
  const activeScripts = useStore((state) => state.activeScripts);
  const canUseAccounts = useStore(selectCanUseAccounts);
  const canUseScripts = useStore(selectCanUseScripts);
  const profileKey = useStore((state) => state.activeProfileKey);
  const { local: canShare } = useShareActions();
  const openShareLink = useOpenShareLink();
  const chain = settings.scripts.chains?.[chainId];
  const [actions, setActions] = useState<ScriptActionInfo[] | null>(null);
  const [pickerIndex, setPickerIndex] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const options = useMemo(() => chain ? getChainOptions(settings, chain) : null, [chain, settings]);
  const actionIds = useMemo(() => actions ? new Set(actions.map((action) => action.pluginId)) : undefined, [actions]);
  const active = useMemo(() => Object.values(activeScripts).some((script) => isChainScript(chainId, script)), [activeScripts, chainId]);

  useEffect(() => {
    if (!client || !canUseScripts) return;
    let mounted = true;
    void client.getScriptActions().then((next) => {
      if (mounted) setActions(next);
    }).catch(() => {
      if (mounted) setActions([]);
    });
    return () => { mounted = false; };
  }, [canUseScripts, client]);

  useEffect(() => {
    if (!client || !canUseScripts || !chain || settings.scripts[chain.id]) return;
    void client.updateSettings(saveChainOptionsPatch(chain.id, getChainOptions(settings, chain))).catch(() => undefined);
  }, [canUseScripts, chain, client, settings]);

  const save = useCallback(async (next: Chain) => {
    if (!client || !canUseScripts) return;
    try {
      await client.updateSettings(saveChainPatch(next));
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Could not save the chain.", "error");
    }
  }, [canUseScripts, client, showMessage]);

  const addStep = useCallback(() => {
    if (chain) void save(chainSteps(chain, [...chain.chains, createChainStep()]));
  }, [chain, save]);

  const updateStep = useCallback((index: number, patch: Partial<Chain["chains"][number]>) => {
    if (!chain) return;
    void save(chainSteps(chain, chain.chains.map((step, stepIndex) => stepIndex === index ? { ...step, ...patch } : step)));
  }, [chain, save]);

  const generate = useCallback(async (description: string) => {
    if (!client || !chain || !options) return;
    const draft = await client.generate<{ name?: string; steps?: Chain["chains"] }>({ kind: "chain", description });
    await save(chainSteps(chain, draft.steps ?? []));
    if (draft.name) await client.updateSettings(saveChainOptionsPatch(chain.id, { ...options, name: draft.name }));
  }, [chain, client, options, save]);

  const removeStep = useCallback((index: number) => {
    if (chain) void save(removeChainStep(chain, index));
  }, [chain, save]);

  const selectAction = useCallback((pluginId: string) => {
    if (pickerIndex === null || !chain) return;
    const action = actions?.find((item) => item.pluginId === pluginId);
    // Overrides belong to the previous action's options.
    updateStep(pickerIndex, { scriptId: pluginId, name: action?.name ?? pluginId, options: undefined });
    setPickerIndex(null);
  }, [actions, chain, pickerIndex, updateStep]);

  const run = useCallback(async () => {
    if (!client || !canUseScripts || !chain || !options || !isRunnableChain(chain, actionIds) || !canUseAccounts) return;
    setRunning(true);
    try {
      await client.startChain(chain.id);
      showMessage(`Started ${options.name}.`, "success");
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Could not start the chain.", "error");
    } finally {
      setRunning(false);
    }
  }, [actionIds, canUseAccounts, canUseScripts, chain, client, options, showMessage]);

  const stop = useCallback(async () => {
    if (!client) return;
    try {
      await client.stopChain(chainId);
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Could not stop the chain.", "error");
    }
  }, [chainId, client, showMessage]);

  const removeChain = useCallback(() => {
    if (!client || !canUseScripts || !chain) return;
    Alert.alert("Delete chain?", `Delete “${options?.name ?? "this chain"}”? This cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: () => {
          void client.updateSettings(deleteChainPatches(chain.id)).then(() => {
            router.back();
          }).catch((error) => {
            showMessage(error instanceof Error ? error.message : "Could not delete the chain.", "error");
          });
        },
      },
    ]);
  }, [canUseScripts, chain, client, options?.name, router, showMessage]);

  if (!chain || !options) {
    return <Screen title="Chain" back><EmptyState title="Chain not found" subtitle="It may have been removed from this profile." /></Screen>;
  }

  const runnable = actions !== null && canUseScripts && canUseAccounts && isRunnableChain(chain, actionIds);
  const pickerOptions = (actions ?? []).map((action) => ({
    label: action.name,
    value: action.pluginId,
    description: action.profile ? "Profile action" : "Library action",
  }));

  return <Screen
    title={options.name}
    subtitle={active ? "Running" : `${chain.chains.length} ${chain.chains.length === 1 ? "action" : "actions"}`}
    back
    right={<>
      {canShare ? (
        <IconButton
          bg="transparent"
          accessibilityLabel="Share chain"
          onPress={() => openShareLink({ kind: "chain", ref: chainId, title: options.name, ...(profileKey ? { profileKey } : {}) })}
        >
          <NativeIcon sf="square.and.arrow.up" material="share" size={21} color={colors.textMuted} />
        </IconButton>
      ) : null}
      <IconButton bg="transparent" accessibilityLabel="Delete chain" onPress={removeChain}><NativeIcon sf="trash" material="delete-outline" size={21} color={colors.danger} /></IconButton>
    </>}
  >
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <PressableCard accessibilityLabel="Chain settings" onPress={() => router.push({ pathname: '/(app)/chains/settings/[chainId]', params: { chainId } })} style={styles.settings}>
          <NativeIcon sf="gearshape" material="settings" size={20} color={colors.textMuted} />
          <Txt variant="heading" style={{ flex: 1 }}>Settings</Txt>
          <Txt variant="muted">{options.gamemode && options.gamemode !== "any" ? options.gamemode : ""}</Txt>
          <NativeIcon sf="chevron.right" material="chevron-right" size={18} color={colors.textFaint} />
        </PressableCard>
        <ShareUpdateRow kind="chain" localRef={chainId} />
        {options.description ? <Txt variant="muted">{options.description}</Txt> : null}
        <View style={styles.intro}><Txt variant="heading">Steps</Txt><Txt variant="muted">Each selected account runs these from top to bottom. Long-press a step to reorder.</Txt></View>
        {chain.chains.length ? <ChainStepList count={chain.chains.length} enabled={canUseScripts} onMove={(from, to) => void save(moveChainStep(chain, from, to))}>{chain.chains.map((step, index) => {
          const action = actions?.find((item) => item.pluginId === step.scriptId);
          return <ChainStepRow key={`${step.id}:${step.scriptId}:${index}`} step={step} steps={chain.chains} index={index} action={action} unavailable={Boolean(actions && step.scriptId && !action)} editable={canUseScripts} onSelectAction={() => setPickerIndex(index)} onEdit={() => router.push({ pathname: '/(app)/chains/step/[chainId]', params: { chainId, stepId: String(step.id) } })} onRemove={() => removeStep(index)} />;
        })}</ChainStepList> : <><LlmPrompt placeholder="Describe the steps, e.g. claim the daily kit, then sell everything" onSubmit={generate} /><EmptyState icon={<NativeIcon sf="bolt" material="bolt" size={38} color={colors.textFaint} />} title="Add your first action" subtitle="Choose an action, then add more to build a complete routine." /></>}
        <Button title="Add step" variant="secondary" full disabled={!canUseScripts} icon={<NativeIcon sf="plus" material="add" size={18} color={colors.text} />} onPress={addStep} />
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: Math.max(spacing.lg, insets.bottom + spacing.sm) }]}>
        {active ? <View style={{ gap: spacing.sm }}><Button title="Stop chain" variant="danger" full icon={<NativeIcon sf="stop.fill" material="stop" size={17} color={colors.danger} />} onPress={() => void stop()} /><Button title="Run another instance" variant="secondary" full loading={running} disabled={!runnable} onPress={() => void run()} /></View> : <Button title={running ? "Starting…" : "Run chain"} loading={running} disabled={!runnable} full icon={<NativeIcon sf="play.fill" material="play-arrow" size={18} color={colors.primaryOn} />} onPress={() => void run()} />}
        {!canUseScripts ? <Txt variant="faint" style={styles.permission}>Script access is required to edit chains.</Txt> : !canUseAccounts ? <Txt variant="faint" style={styles.permission}>Account access is required to run chains.</Txt> : actions === null ? <Txt variant="faint" style={styles.permission}>Loading available actions…</Txt> : null}
      </View>
    </View>
    <PickerModal visible={pickerIndex !== null} title="Choose action" options={pickerOptions} value={pickerIndex === null ? undefined : chain.chains[pickerIndex]?.scriptId} multiple={false} onChange={(value) => { if (typeof value === "string") selectAction(value); }} onClose={() => setPickerIndex(null)} />
  </Screen>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.lg },
  settings: { minHeight: 52, padding: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  intro: { gap: 2 },
  footer: { gap: spacing.xs, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.lg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderSubtle, backgroundColor: colors.bg },
  permission: { textAlign: "center" },
});
