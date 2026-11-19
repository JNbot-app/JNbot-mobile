import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Button, Txt } from '../ui';
import { NativeIcon } from '../NativeIcon';
import { type Choice } from '../PluginOptions';
import { PluginHeader } from './PluginHeader';
import { PluginDetailsView } from './PluginDetailsView';
import { PluginOptionsView } from './PluginOptionsView';
import { PickerModal } from '../PickerField';
import { PresetBar, presetChoices } from './PresetBar';
import {
  MAX_SCRIPT_INSTANCES,
  presetOptionPath,
  presetValues,
  selectedPresetId,
} from '../../generated/client-contract/pluginPresets';
import { useClient } from '../../net/ConnectionProvider';
import { useCommands } from '../../hooks/useCommands';
import { usePluginPin } from '../../hooks/usePluginPin';
import { useOpenShareLink, useShareActions } from '../../features/shares';
import {
  actions,
  selectCanUseAccounts,
  selectCanUsePlugins,
  selectCanUseScripts,
  useStore,
} from '../../store/store';
import type { MacroInfo } from '../../store/types';
import type { ProfileScriptInfo } from '../../hooks/useProfileScriptInfos';
import type { PluginRunDescriptor, SerializableOption } from '../../runtime/types';
import type { SettingsPatch } from '../../generated/client-contract/mobileClientContract';
import { useMonetization } from '../../monetization/MonetizationProvider';
import { colors, font, radii, spacing } from '../../theme/theme';

export type PluginTab = 'options' | 'details';

type DrawerContextValue = {
  openPlugin: (plugin: MacroInfo, initialView?: PluginTab) => Promise<void>;
  openProfileScript: (script: ProfileScriptInfo, initialView?: PluginTab) => Promise<void>;
  /** Stops the plugin's running instances, then deletes it. */
  deletePlugin: (plugin: MacroInfo) => Promise<void>;
};

const DrawerContext = createContext<DrawerContextValue | null>(null);

/** Settings patches for pending option edits, inside the plugin's selected preset. */
const optionPatches = (pluginId: string, pending: Map<string, unknown>): SettingsPatch[] =>
  Array.from(pending, ([optionId, value]) => ({
    path: presetOptionPath(useStore.getState().settings.scripts?.[pluginId], pluginId, optionId),
    value,
  }));

export function AutomationDrawerProvider({ children }: { children: React.ReactNode }) {
  const client = useClient();
  const commands = useCommands();
  const { executeWithMonetization } = useMonetization();
  const activeScripts = useStore((state) => state.activeScripts);
  const canUseScripts = useStore(selectCanUseScripts);
  const canUsePlugins = useStore(selectCanUsePlugins);
  const canUseAccounts = useStore(selectCanUseAccounts);
  const optionErrors = useStore((state) => state.optionErrors);
  const [plugin, setPlugin] = useState<MacroInfo | null>(null);
  const [profileScript, setProfileScript] = useState<ProfileScriptInfo | null>(null);
  const [descriptor, setDescriptor] = useState<PluginRunDescriptor>();
  const [activeTab, setActiveTab] = useState<PluginTab>('options');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pendingPatchesRef = useRef<Map<string, unknown>>(new Map());
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeTargetIdRef = useRef<string | null>(null);

  const flush = useCallback(async () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    const targetId =
      descriptor?.info?.pluginId ||
      plugin?.pluginId ||
      plugin?.name ||
      plugin?.id ||
      activeTargetIdRef.current;
    if (!targetId || !client || pendingPatchesRef.current.size === 0) return;
    const patches = optionPatches(targetId, pendingPatchesRef.current);
    pendingPatchesRef.current.clear();
    try {
      await client.updateSettings(patches);
    } catch (err) {
      console.warn('Failed to save script settings:', err);
    }
  }, [client, descriptor?.info?.pluginId, plugin]);

  const load = useCallback(
    async (
      initial: MacroInfo,
      resolve: () => Promise<PluginRunDescriptor>,
    ) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      if (pendingPatchesRef.current.size > 0 && activeTargetIdRef.current && client) {
        const patches = optionPatches(activeTargetIdRef.current, pendingPatchesRef.current);
        pendingPatchesRef.current.clear();
        void client.updateSettings(patches);
      }

      const initialTargetId = initial.pluginId || initial.id || initial.name;
      activeTargetIdRef.current = initialTargetId;
      setPlugin(initial);
      setDescriptor(undefined);
      setError(null);
      setLoading(true);
      try {
        const result = await resolve();
        const resolvedTargetId =
          result.info.pluginId || result.info.id || result.info.name || initialTargetId;
        activeTargetIdRef.current = resolvedTargetId;

        const currentStoreSettings =
          useStore.getState().settings.scripts?.[resolvedTargetId] ??
          (result.info.name ? useStore.getState().settings.scripts?.[result.info.name] : undefined) ??
          {};
        const mergedDescriptor: PluginRunDescriptor = {
          ...result,
          values: {
            ...result.values,
            ...presetValues(currentStoreSettings),
          },
        };

        setDescriptor(mergedDescriptor);
        setPlugin(mergedDescriptor.info);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Could not open this script.');
      } finally {
        setLoading(false);
      }
    },
    [client],
  );

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      if (pendingPatchesRef.current.size > 0 && activeTargetIdRef.current && client) {
        const patches = optionPatches(activeTargetIdRef.current, pendingPatchesRef.current);
        pendingPatchesRef.current.clear();
        void client.updateSettings(patches);
      }
    };
  }, [client]);

  const openPlugin = useCallback(
    async (next: MacroInfo, initialView: PluginTab = 'options') => {
      if (!client) return;
      setActiveTab(initialView);
      setProfileScript(null);
      await load(next, () => client.getPluginDescriptor(next));
    },
    [client, load],
  );

  const openProfileScript = useCallback(
    async (script: ProfileScriptInfo, initialView: PluginTab = 'options') => {
      if (!client) return;

      const activeProfileKey = useStore.getState().activeProfileKey;
      const profileScripts = activeProfileKey
        ? (useStore.getState().JNdata?.data?.[activeProfileKey]?.scripts ?? [])
        : [];
      const isPartOfProfile = profileScripts.some((s: any) => s.id === script.id);
      const installed = useStore.getState().macros.list;
      const matchedPlugin = installed.find((p) => p.pluginId === (script.pluginId || script.id));

      if (!isPartOfProfile && matchedPlugin) {
        await openPlugin(matchedPlugin, initialView);
        return;
      }

      setActiveTab(initialView);
      setProfileScript(script);
      const initial = {
        pluginId: script.pluginId || script.id,
        name: script.name,
        description: script.description,
        editedAt: null,
        createdAt: 0,
        public: false,
        scriptType: 'script' as const,
      };
      if (script.unavailableReason) {
        setPlugin(initial);
        setDescriptor(undefined);
        setError(script.unavailableReason);
        return;
      }
      await load(initial, () => client.getProfileScriptDescriptor({ id: script.id, fallback: initial }));
    },
    [client, load, openPlugin],
  );

  const close = useCallback(() => {
    void flush();
    setPlugin(null);
    setProfileScript(null);
    setDescriptor(undefined);
    setError(null);
    setActiveTab('options');
  }, [flush]);

  const deletePlugin = useCallback(async (target: MacroInfo) => {
    if (!client) throw new Error('Connect to a runtime before deleting a plugin.');
    if (!canUsePlugins) throw new Error('You do not have permission to delete plugins.');
    Object.values(activeScripts)
      .filter((script) => script.scriptId === target.pluginId || script.name === target.name)
      .forEach((script) => commands?.stopScript(script.instanceId));
    await client.deletePlugin(target);
    close();
  }, [activeScripts, canUsePlugins, client, close, commands]);

  const instances = plugin
    ? Object.values(activeScripts).filter(
        (script) =>
          script.scriptId === plugin.pluginId ||
          script.name === plugin.name,
      )
    : [];

  const errors = plugin
    ? optionErrors[plugin.pluginId] ?? optionErrors[plugin.name]
    : undefined;

  const run = async (presetId?: string) => {
    if (!descriptor?.info || !commands || loading || !canUseScripts || !canUseAccounts) return;
    setLoading(true);
    setError(null);
    try {
      await flush();
      await executeWithMonetization('script_start', () =>
        commands.runPlugin(descriptor.info, presetId),
      );
      close();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not start script.');
    } finally {
      setLoading(false);
    }
  };

  const handleOptionChange = useCallback(
    (option: SerializableOption, value: unknown) => {
      const targetId =
        descriptor?.info?.pluginId ||
        plugin?.pluginId ||
        plugin?.name ||
        plugin?.id ||
        activeTargetIdRef.current;
      if (!targetId) return;

      if (plugin?.pluginId) actions.clearOptionError(plugin.pluginId, option.id);
      if (plugin?.name) actions.clearOptionError(plugin.name, option.id);
      if (descriptor?.info?.pluginId) actions.clearOptionError(descriptor.info.pluginId, option.id);
      if (descriptor?.info?.name) actions.clearOptionError(descriptor.info.name, option.id);

      actions.updatePluginOption(targetId, option.id, value);
      if (descriptor?.info?.pluginId && descriptor.info.pluginId !== targetId) {
        actions.updatePluginOption(descriptor.info.pluginId, option.id, value);
      }

      pendingPatchesRef.current.set(option.id, value);

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        void flush();
      }, 350);
    },
    [descriptor?.info, flush, plugin],
  );

  return (
    <DrawerContext.Provider value={{ openPlugin, openProfileScript, deletePlugin }}>
      {children}
      <AutomationDrawer
        plugin={plugin}
        profileScript={profileScript}
        descriptor={descriptor}
        optionErrors={errors}
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        loading={loading}
        error={error}
        instanceCount={instances.length}
        onClose={close}
        onRun={(presetId) => void run(presetId)}
        onFlush={flush}
        onStop={() => {
          if (!canUseScripts) return;
          instances.forEach((script) => commands?.stopScript(script.instanceId));
          close();
        }}
        onChange={handleOptionChange}
      />
    </DrawerContext.Provider>
  );
}

export function useAutomationDrawer() {
  const context = useContext(DrawerContext);
  if (!context) throw new Error('useAutomationDrawer must be used inside AutomationDrawerProvider.');
  return context;
}

import { dependencyKey, isRecord, resolveOptionValue } from './optionHelpers';
import { LlmPrompt, type LlmPromptProps } from '../LlmPrompt';
import { LlmOptionChanges } from '../LlmOptionChanges';
import type { LlmOptionsResult } from '../../generated/client-contract/llm';
export { resolveOptionValue };

function AutomationDrawer({
  plugin,
  profileScript,
  descriptor,
  optionErrors,
  activeTab,
  onChangeTab,
  loading,
  error,
  instanceCount,
  onClose,
  onRun,
  onFlush,
  onStop,
  onChange,
}: {
  plugin: MacroInfo | null;
  profileScript?: ProfileScriptInfo | null;
  descriptor?: PluginRunDescriptor;
  optionErrors?: Record<string, string>;
  activeTab: PluginTab;
  onChangeTab: (tab: PluginTab) => void;
  loading: boolean;
  error: string | null;
  instanceCount: number;
  onClose: () => void;
  onRun: (presetId?: string) => void;
  onFlush: () => Promise<void>;
  onStop: () => void;
  onChange: (option: SerializableOption, value: unknown) => void;
}) {
  const alts = useStore((state) => state.alts);
  const altTags = useStore((state) => state.settings.altTags ?? []);
  const canUseScripts = useStore(selectCanUseScripts);
  const canUsePlugins = useStore(selectCanUsePlugins);
  const canUseAccounts = useStore(selectCanUseAccounts);
  const { isPinned, togglePin } = usePluginPin(plugin?.pluginId);
  const { local: canShare } = useShareActions();
  const openShareLink = useOpenShareLink();
  const router = useRouter();
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [pickingPreset, setPickingPreset] = useState(false);
  const running = instanceCount > 0;
  const stored = useStore((state) =>
    plugin ? state.settings.scripts?.[plugin.pluginId] : undefined,
  );
  const storedRef = useRef(stored);
  storedRef.current = stored;
  const selectedPreset = selectedPresetId(stored);
  const runChoices = useMemo(() => presetChoices(stored), [stored]);

  const allOptions = useMemo(
    () => descriptor?.sections.flatMap((section) => section.options) ?? [],
    [descriptor],
  );

  const altOptions = useMemo<Choice[]>(
    () => alts.map((alt) => ({ label: alt.username, value: alt.username })),
    [alts],
  );

  const tagOptions = useMemo<Choice[]>(
    () => altTags.map((tag) => ({ label: tag.name, value: tag.id })),
    [altTags],
  );

  // Switching presets swaps the form to the new preset's values.
  useEffect(() => {
    setValues(presetValues(storedRef.current));
  }, [selectedPreset]);

  useEffect(() => {
    setValues(descriptor?.values ?? {});
    setCollapsed(
      Object.fromEntries(
        (descriptor?.sections ?? []).map((section) => [section.id, Boolean(section.collapsed)]),
      ),
    );
  }, [descriptor]);

  useEffect(() => {
    const fields = Object.keys(optionErrors ?? {});
    if (!fields.length || !descriptor) return;
    setCollapsed((current) => ({
      ...current,
      ...Object.fromEntries(
        descriptor.sections
          .filter((section) => section.options.some((option) => fields.includes(option.id)))
          .map((section) => [section.id, false]),
      ),
    }));
  }, [descriptor, optionErrors]);

  const update = (option: SerializableOption, next: unknown) => {
    const key = dependencyKey(option, allOptions, values);
    const currentValue = values[option.id];
    const persisted = key
      ? { ...(isRecord(currentValue) ? currentValue : {}), [key]: next }
      : next;
    setValues((current) => ({ ...current, [option.id]: persisted }));
    onChange(option, persisted);
  };

  const client = useClient();
  // Same as the desktop: the AI suggests values (matched to this profile's
  // real gamemodes, alts and tags) and the user reviews them before applying.
  const describeSettings: LlmPromptProps['onSubmit'] = async (description, run) => {
    if (!plugin) return undefined;
    const result = await run<LlmOptionsResult>({ event: 'LLM_GENERATE', input: { kind: 'options', description, pluginId: plugin.pluginId } });
    if (!result) return undefined;
    return (dismiss) => (
      <LlmOptionChanges
        result={result}
        onDiscard={dismiss}
        onApply={() => {
          for (const [id, value] of Object.entries(result.values)) {
            const option = allOptions.find((item) => item.id === id);
            if (option) update(option, value);
          }
          dismiss();
        }}
      />
    );
  };

  /** The editor screens are routes, so the sheet closes before they open. */
  const openEditor = (pathname: '/(app)/plugin/code/[pluginId]' | '/(app)/plugin/settings/[pluginId]') => {
    if (!plugin) return;
    onClose();
    router.push({ pathname, params: { pluginId: plugin.pluginId } });
  };

  if (!plugin) return null;

  const buttonTitle = running
    ? plugin.scriptType === 'action'
      ? 'Stop Action'
      : 'Stop Script'
    : plugin.scriptType === 'action'
      ? 'Run Action'
      : 'Run Script';

  return (
    <Modal
      visible={!!plugin}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.sheet} edges={['top', 'left', 'right', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardAvoid}
        >
          {/* Header */}
          <PluginHeader
            plugin={plugin}
            onClose={onClose}
            onTogglePin={!profileScript && plugin ? () => void togglePin(plugin.pluginId) : undefined}
            isPinned={isPinned}
          />

          {/* Segmented Tab Switcher (Options | Details) */}
          <View style={styles.segmented} accessibilityRole="tablist">
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: activeTab === 'options' }}
              onPress={() => {
                if (process.env.EXPO_OS === 'ios') void Haptics.selectionAsync();
                onChangeTab('options');
              }}
              style={[
                styles.segment,
                activeTab === 'options' && styles.segmentSelected,
              ]}
            >
              <Txt
                variant="label"
                style={[
                  styles.segmentLabel,
                  activeTab === 'options' && styles.segmentLabelSelected,
                ]}
              >
                Options
              </Txt>
            </Pressable>

            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: activeTab === 'details' }}
              onPress={() => {
                if (process.env.EXPO_OS === 'ios') void Haptics.selectionAsync();
                onChangeTab('details');
              }}
              style={[
                styles.segment,
                activeTab === 'details' && styles.segmentSelected,
              ]}
            >
              <Txt
                variant="label"
                style={[
                  styles.segmentLabel,
                  activeTab === 'details' && styles.segmentLabelSelected,
                ]}
              >
                Details
              </Txt>
            </Pressable>
          </View>

          {/* Tab Content */}
          <ScrollView
            contentContainerStyle={styles.sheetContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            {activeTab === 'options' ? (
              <>
              <View style={styles.optionTools}>
                {descriptor?.sections.length ? (
                  <PresetBar pluginId={descriptor.info.pluginId} onBeforeChange={onFlush} />
                ) : null}
                {plugin && descriptor?.sections.length ? (
                  <LlmPrompt collapsedLabel="Suggest settings with AI" placeholder="Describe the settings, e.g. only farm wheat and go slower" button="Suggest" writingLabel="Choosing values" onSubmit={describeSettings} />
                ) : null}
              </View>
              <PluginOptionsView
                descriptor={descriptor}
                loading={loading}
                error={error}
                optionErrors={optionErrors}
                values={values}
                collapsed={collapsed}
                onToggleCollapse={(sectionId) =>
                  setCollapsed((current) => ({
                    ...current,
                    [sectionId]: !current[sectionId],
                  }))
                }
                onChange={update}
                altOptions={altOptions}
                tagOptions={tagOptions}
                allOptions={allOptions}
                resolveOptionValue={resolveOptionValue}
              />
              </>
            ) : (
              <>
                <PluginDetailsView
                  plugin={plugin}
                  running={running}
                  profileScript={profileScript}
                  blockedReason={
                    descriptor && !descriptor.allowed
                      ? descriptor.blockedReason ?? 'This script is unavailable in this profile.'
                      : error
                  }
                />
              </>
            )}
          </ScrollView>

          {/* Action Footer */}
          <View style={styles.sheetFooter}>
            {activeTab === 'details' && !profileScript ? (
              <View style={styles.detailActions}>
                {plugin.language === 'js' || plugin.language === 'ts' ? (
                  <Button
                    title="Code"
                    variant="secondary"
                    small
                    style={styles.detailAction}
                    onPress={() => openEditor('/(app)/plugin/code/[pluginId]')}
                    icon={<NativeIcon sf="chevron.left.forwardslash.chevron.right" material="code" size={18} color={colors.text} />}
                  />
                ) : plugin.language === 'recording' ? (
                  <Button
                    title="Steps"
                    variant="secondary"
                    small
                    style={styles.detailAction}
                    onPress={() => {
                      onClose();
                      router.push({ pathname: '/(app)/recording/[pluginId]', params: { pluginId: plugin.pluginId } });
                    }}
                    icon={<NativeIcon sf="list.bullet" material="format-list-bulleted" size={18} color={colors.text} />}
                  />
                ) : null}
                {canUsePlugins ? (
                  <Button
                    title="Edit"
                    variant="secondary"
                    small
                    style={styles.detailAction}
                    onPress={() => openEditor('/(app)/plugin/settings/[pluginId]')}
                    icon={<NativeIcon sf="slider.horizontal.3" material="tune" size={18} color={colors.text} />}
                  />
                ) : null}
                {canShare ? (
                  <Button
                    title="Share"
                    variant="secondary"
                    small
                    style={styles.detailAction}
                    onPress={() => {
                      onClose();
                      openShareLink({ kind: 'plugin', ref: plugin.pluginId, title: plugin.name });
                    }}
                    icon={<NativeIcon sf="square.and.arrow.up" material="share" size={18} color={colors.text} />}
                  />
                ) : null}
              </View>
            ) : null}
            <Button
              title={buttonTitle}
              variant={running ? 'danger' : 'primary'}
              disabled={
                running
                  ? !canUseScripts
                  : loading || (descriptor ? !descriptor.allowed : false) || !canUseScripts || !canUseAccounts
              }
              loading={loading}
              full
              icon={
                <NativeIcon
                  sf={running ? 'stop.fill' : 'play.fill'}
                  material={running ? 'stop' : 'play-arrow'}
                  size={18}
                  color={running ? colors.danger : colors.primaryOn}
                />
              }
              onPress={running ? onStop : () => onRun()}
            />
            {running ? (
              <Button
                title="Run another instance"
                variant="secondary"
                full
                disabled={loading || instanceCount >= MAX_SCRIPT_INSTANCES || !canUseScripts || !canUseAccounts}
                onPress={() => (runChoices.length ? setPickingPreset(true) : onRun())}
              />
            ) : null}
            <PickerModal
              visible={pickingPreset}
              title="Run another instance with"
              options={runChoices}
              value={undefined}
              multiple={false}
              onChange={(presetId) => {
                setPickingPreset(false);
                onRun(String(presetId));
              }}
              onClose={() => setPickingPreset(false)}
            />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  keyboardAvoid: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  segmented: {
    flexDirection: 'row',
    padding: 3,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
  },
  segment: {
    flex: 1,
    minHeight: process.env.EXPO_OS === 'android' ? 44 : 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: radii.sm,
    borderCurve: 'continuous',
  },
  segmentSelected: {
    backgroundColor: colors.surfaceAlt,
  },
  segmentLabel: {
    fontSize: font.size.caption,
    fontWeight: font.weight.medium,
    color: colors.textMuted,
  },
  segmentLabelSelected: {
    color: colors.text,
    fontWeight: font.weight.bold,
  },
  optionTools: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  sheetContent: {
    paddingBottom: spacing.xxl,
  },
  sheetFooter: {
    paddingTop: spacing.xs,
    gap: spacing.sm,
  },
  detailActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  detailAction: {
    flex: 1,
  },
});
