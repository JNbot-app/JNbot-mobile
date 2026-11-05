import { reminderDueAt } from '../../../src/generated/client-contract/cooldowns';
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Screen } from "../../../src/components/Screen";
import { CooldownList } from "../../../src/components/automation/CooldownList";
import { SearchField } from "../../../src/components/SearchField";
import { NativeIcon } from "../../../src/components/NativeIcon";
import { AddButton, EmptyState, IconButton, Txt } from "../../../src/components/ui";
import { AutomationItemCard } from "../../../src/components/automation/AutomationItemCard";
import { AutomationTabs } from "../../../src/components/automation/AutomationTabs";
import { useAutomationDrawer } from "../../../src/components/automation/AutomationDrawer";
import { useProfileScriptInfos, type ProfileScriptInfo } from "../../../src/hooks/useProfileScriptInfos";
import {
  selectCanUsePlugins,
  selectCanUseScripts,
  selectCanUseAccounts,
  selectProfileReady,
  useStore,
} from "../../../src/store/store";
import type { Cooldown, MacroInfo } from "../../../src/store/types";
import { colors, radii, spacing } from "../../../src/theme/theme";
import { BottomSheet } from '../../../src/components/BottomSheet';
import { ChainList } from '../../../src/components/chains/ChainList';
import { useClient } from '../../../src/net/ConnectionProvider';
import { actions } from '../../../src/store/store';
import { useFeedback } from '../../../src/components/AppFeedback';
import {
  deleteFolderMetadata,
  folderCounts,
  folderNames,
  loadPluginFolderPreferences,
  movePluginMetadata,
  savePluginFolderPreferences,
  visiblePlugins,
  type PluginFolderPreferences,
} from '../../../src/features/plugins/folders';
import {
  FolderNameSheet,
  FolderPickerSheet,
  FolderStrip,
  type FolderChoice,
} from '../../../src/components/automation/PluginFolderControls';
import { getChainOptionsFromScripts } from '../../../src/features/chains';
import { chainReadyAt } from '../../../src/generated/client-contract/chains';
import { resolveAutomationTarget } from '../../../src/features/plugins/automationTarget';
import type { Chain } from '../../../src/store/types';
import { TriggerList } from '../../../src/components/triggers/TriggerList';
import { useTriggerEditor } from '../../../src/components/triggers/useTriggerEditor';
import { useOpenShareLink, useShareActions } from '../../../src/features/shares';

type Section = "scripts" | "plugins" | "chains" | "cooldowns" | "triggers";
const sections: Array<{ id: Section; label: string }> = [
  { id: "scripts", label: "Scripts" },
  { id: "plugins", label: "Plugins" },
  { id: "chains", label: "Chains" },
  { id: "cooldowns", label: "Cooldowns" },
  { id: "triggers", label: "Triggers" },
];

const EMPTY_REMINDERS: Cooldown[] = [];
const EMPTY_CHAINS: Record<string, Chain> = {};

export default function Automation() {
  const router = useRouter();
  const client = useClient();
  const { showMessage } = useFeedback();
  const params = useLocalSearchParams<{ scriptId?: string; source?: string; section?: Section }>();
  const { openPlugin, openProfileScript } = useAutomationDrawer();
  const { local: canShare } = useShareActions();
  const openShareLink = useOpenShareLink();
  const installed = useStore((state) => state.macros.list);
  const activeScripts = useStore((state) => state.activeScripts);
  const cooldowns = useStore((state) => state.settings.reminders ?? EMPTY_REMINDERS);
  const scriptsSettings = useStore((state) => state.settings.scripts);
  const chainRecords = scriptsSettings.chains ?? EMPTY_CHAINS;
  const chains = useMemo(() => Object.values(chainRecords), [chainRecords]);
  const profileScripts = useProfileScriptInfos();
  const optionErrors = useStore((state) => state.optionErrors);
  const pluginMetadata = useStore((state) => state.pluginMetadata);
  const handledTarget = useRef<string | null>(null);
  const canUseScripts = useStore(selectCanUseScripts);
  const canUsePlugins = useStore(selectCanUsePlugins);
  const canUseAccounts = useStore(selectCanUseAccounts);
  const isProfileReady = useStore(selectProfileReady);
  const triggerEditor = useTriggerEditor();
  const triggerCount = useStore((state) => state.settings.triggers?.length ?? 0);
  const [creatingSchedule, setCreatingSchedule] = useState(false);
  const closeSchedule = useCallback(() => setCreatingSchedule(false), []);
  const availableSections = useMemo(() => {
    return sections.filter((s) => {
      if (s.id === "scripts") return canUseScripts;
      if (s.id === "plugins") return canUsePlugins;
      if (s.id === "chains" || s.id === "triggers") return canUseScripts;
      return true;
    });
  }, [canUseScripts, canUsePlugins]);

  const [section, setSection] = useState<Section>(() => {
    if (canUseScripts) return "scripts";
    if (canUsePlugins) return "plugins";
    return "cooldowns";
  });

  // Widgets deep link straight to a section (jnbot://automation?section=cooldowns).
  useEffect(() => {
    if (!params.section) return;
    if (availableSections.some((s) => s.id === params.section)) setSection(params.section);
    router.setParams({ section: undefined });
  }, [params.section, availableSections, router]);

  useEffect(() => {
    if (!availableSections.some((s) => s.id === section)) {
      setSection(availableSections[0]?.id ?? "cooldowns");
    }
  }, [availableSections, section]);
  const [query, setQuery] = useState("");
  const [pluginMenuOpen, setPluginMenuOpen] = useState(false);
  const [folderNameOpen, setFolderNameOpen] = useState(false);
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [folder, setFolder] = useState('__all__');
  const [preferences, setPreferences] = useState<PluginFolderPreferences>({ extraFolders: [], sortOrder: 'date' });
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [movePlugin, setMovePlugin] = useState<MacroInfo | null>(null);

  useEffect(() => {
    let mounted = true;
    void loadPluginFolderPreferences().then((value) => {
      if (!mounted) return;
      setPreferences(value);
      setPreferencesLoaded(true);
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (preferencesLoaded) void savePluginFolderPreferences(preferences);
  }, [preferences, preferencesLoaded]);

  const runningIds = useMemo(
    () => new Set(Object.values(activeScripts).map((script) => script.scriptId)),
    [activeScripts],
  );

  const installedMap = useMemo(
    () => new Map(installed.map((p) => [p.pluginId, p])),
    [installed],
  );

  const optionErrorIds = useMemo(() => {
    const set = new Set<string>();
    for (const [id, errs] of Object.entries(optionErrors)) {
      if (errs && Object.keys(errs).length > 0) {
        set.add(id);
      }
    }
    return set;
  }, [optionErrors]);

  const hasReadyCooldown = useMemo(
    () => cooldowns.some((cooldown) => cooldown.kind !== 'schedule' && reminderDueAt(cooldown) <= Date.now()),
    [cooldowns],
  );

  const folders = useMemo(
    () => folderNames(installed, pluginMetadata, preferences.extraFolders),
    [installed, pluginMetadata, preferences.extraFolders],
  );
  const counts = useMemo(
    () => folderCounts(installed, pluginMetadata),
    [installed, pluginMetadata],
  );
  const folderChoices = useMemo<FolderChoice[]>(() => [
    { id: '__all__', label: 'All', folder: null, count: installed.length },
    { id: '__none__', label: 'Unorganized', folder: null, count: counts.unorganized },
    ...folders.map((name) => ({ id: name, label: name, folder: name, count: counts.folders[name] ?? 0 })),
  ], [counts.folders, counts.unorganized, folders, installed.length]);
  const moveChoices = useMemo<FolderChoice[]>(() => [
    { id: '__none__', label: 'Unorganized', folder: null, count: counts.unorganized },
    ...folders.map((name) => ({ id: name, label: name, folder: name, count: counts.folders[name] ?? 0 })),
  ], [counts.folders, counts.unorganized, folders]);

  useEffect(() => {
    if (folder !== '__all__' && folder !== '__none__' && !folders.includes(folder)) setFolder('__all__');
  }, [folder, folders]);

  const needle = query.trim().toLowerCase();
  const rows = useMemo(() => {
    if (section === 'plugins') {
      return visiblePlugins(installed, pluginMetadata, folder, query, preferences.sortOrder);
    }
    return needle
      ? profileScripts.filter((item) => `${item.name} ${item.description}`.toLowerCase().includes(needle))
      : profileScripts;
  }, [folder, installed, needle, pluginMetadata, preferences.sortOrder, profileScripts, query, section]);

  const saveMetadata = useCallback(async (next: typeof pluginMetadata, success: string) => {
    if (!client) {
      showMessage('Connect to JNbot to organize plugins.', 'warning');
      return;
    }
    const previous = pluginMetadata;
    actions.setPluginMetadata(next);
    try {
      await client.updatePluginMetadata(next);
      showMessage(success, 'success');
    } catch (cause) {
      actions.setPluginMetadata(previous);
      showMessage(cause instanceof Error ? cause.message : 'Could not update plugin folders.', 'error');
    }
  }, [client, pluginMetadata, showMessage]);

  const moveToFolder = useCallback((plugin: MacroInfo, target: string | null) => {
    const next = movePluginMetadata(pluginMetadata, plugin.pluginId, target);
    void saveMetadata(next, target ? `Moved to ${target}` : 'Moved to Unorganized');
  }, [pluginMetadata, saveMetadata]);

  const openMoveSheet = useCallback((item: MacroInfo | ProfileScriptInfo) => setMovePlugin(item as MacroInfo), []);

  const createChain = useCallback(() => {
    if (canUseScripts) router.push({ pathname: '/(app)/chains/settings/[chainId]', params: { chainId: 'new' } });
  }, [canUseScripts, router]);

  const confirmDeleteFolder = useCallback((name: string) => {
    Alert.alert('Delete folder?', `Plugins in “${name}” will become unorganized.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          setPreferences((current) => ({ ...current, extraFolders: current.extraFolders.filter((item) => item !== name) }));
          if (folder === name) setFolder('__all__');
          void saveMetadata(deleteFolderMetadata(pluginMetadata, name), `Deleted ${name}`);
        },
      },
    ]);
  }, [folder, pluginMetadata, saveMetadata]);

  const manageFolder = useCallback((name: string) => {
    Alert.alert(name, undefined, [
      ...(canShare
        ? [{ text: 'Share as bundle', onPress: () => openShareLink({ kind: 'bundle', ref: name, title: name }) }]
        : []),
      { text: 'Delete folder', style: 'destructive' as const, onPress: () => confirmDeleteFolder(name) },
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  }, [canShare, confirmDeleteFolder, openShareLink]);

  const handleOpenItem = useCallback(
    (target: MacroInfo | ProfileScriptInfo) => {
      if (section === "plugins") {
        void openPlugin(target as MacroInfo);
      } else {
        void openProfileScript(target as ProfileScriptInfo);
      }
    },
    [section, openPlugin, openProfileScript],
  );

  const keyExtractor = useCallback(
    (item: MacroInfo | ProfileScriptInfo) =>
      section === "scripts" ? (item as ProfileScriptInfo).id : (item as MacroInfo).pluginId,
    [section],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: MacroInfo | ProfileScriptInfo; index: number }) => {
      const isPlugin = section === "plugins";
      const plugin = item as MacroInfo;
      const profileScript = item as ProfileScriptInfo;
      const matchedPlugin = !isPlugin
        ? (item.pluginId ? installedMap.get(item.pluginId) : undefined) ?? profileScript.info
        : undefined;
      const running = isPlugin
        ? runningIds.has(plugin.pluginId)
        : runningIds.has(profileScript.id) || (item.pluginId ? runningIds.has(item.pluginId) : false);
      const hasOptionError = Boolean(item.pluginId && optionErrorIds.has(item.pluginId));

      const card = (
        <AutomationItemCard
          item={item}
          isPlugin={isPlugin}
          running={running}
          matchedPlugin={matchedPlugin}
          hasOptionError={hasOptionError}
          isFirst={index === 0}
          isLast={index === rows.length - 1}
          onPress={handleOpenItem}
          onLongPress={isPlugin && (folders.length > 0 || Boolean(pluginMetadata[plugin.pluginId]?.folder)) ? openMoveSheet : undefined}
        />
      );
      return card;
    },
    [section, installedMap, runningIds, optionErrorIds, rows.length, handleOpenItem, openMoveSheet, folders.length, pluginMetadata],
  );

  useEffect(() => {
    const requestedId = params.scriptId;
    if (!requestedId || handledTarget.current === `route:${requestedId}`) return;
    const target = resolveAutomationTarget(requestedId, params.source, profileScripts, installed);
    if (target?.kind === 'profile') {
      handledTarget.current = `route:${requestedId}`;
      setSection("scripts");
      void openProfileScript(target.script);
    } else if (target?.kind === 'plugin') {
      handledTarget.current = `route:${requestedId}`;
      setSection("plugins");
      void openPlugin(target.plugin);
    }
  }, [params.scriptId, params.source, profileScripts, installed, openPlugin, openProfileScript]);

  const count = section === "scripts" ? profileScripts.length : section === "plugins" ? installed.length : section === "chains" ? chains.length : section === "triggers" ? triggerCount : cooldowns.length;
  if (!canUseScripts && !canUsePlugins) {
    return (
      <Screen tabBar title="Scripts & Plugins" subtitle="Automations">
        <EmptyState
          icon={<NativeIcon sf="lock" material="lock-outline" size={32} color={colors.textFaint} />}
          title="Automations Disabled"
          subtitle="Your access link does not have permission to run scripts or plugins."
        />
      </Screen>
    );
  }

  return (
    <Screen
      title="Automation"
      subtitle={section === 'plugins' && folder !== '__all__' ? `${rows.length} in ${folder === '__none__' ? 'Unorganized' : folder}` : `${count} ${section}`}
      right={
        section === "chains" ? <AddButton accessibilityLabel="Create chain" onPress={() => void createChain()} />
        : section === "plugins" ? <AddButton accessibilityLabel="Add plugin" onPress={() => setPluginMenuOpen(true)} />
        : section === "cooldowns" ? <AddButton accessibilityLabel="Schedule script" disabled={!isProfileReady || !client || (!canUseScripts && !canUsePlugins) || !canUseAccounts} onPress={() => setCreatingSchedule(true)} />
        : section === "triggers" ? <AddButton accessibilityLabel="Add trigger" disabled={!isProfileReady || !client} onPress={() => triggerEditor.open()} />
        : undefined
      }
    >
      <AutomationTabs
        sections={availableSections}
        selected={section}
        onSelect={(nextSection) => {
          setSection(nextSection);
          closeSchedule();
          setQuery("");
        }}
      />

      {section === "chains" ? <ChainList
        chains={chains.map((chain) => {
          const { name, description } = getChainOptionsFromScripts(scriptsSettings, chain);
          return { ...chain, name, description, readyAt: chainReadyAt(chain, cooldowns) };
        })}
        runningIds={runningIds}
        onCreate={() => void createChain()}
        onOpen={(chain) => router.push({ pathname: '/(app)/chains/[chainId]', params: { chainId: chain.id } })}
      /> : section === "triggers" ? <TriggerList editor={triggerEditor} /> : section === "cooldowns" ? <CooldownList creatingSchedule={creatingSchedule} onCloseSchedule={closeSchedule} onCreate={isProfileReady && client && canUseAccounts ? () => setCreatingSchedule(true) : undefined} /> : <FlatList<any>
        style={styles.listView}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        data={rows}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.list}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={7}
        ListHeaderComponent={<>
          <SearchField style={styles.search} accessibilityLabel={`Search ${section}`} value={query} onChangeText={setQuery} placeholder={`Search ${section}`}>
            {section === 'plugins' ? <IconButton size={40} bg="transparent" accessibilityLabel={`Sort plugins, ${preferences.sortOrder === 'date' ? 'last edited' : 'name'}`} onPress={() => setSortMenuOpen(true)}>
              <NativeIcon sf="arrow.up.arrow.down" material="sort" size={19} color={colors.textMuted} />
            </IconButton> : null}
          </SearchField>
          {section === 'plugins' ? <FolderStrip choices={folderChoices} selected={folder} onSelect={setFolder} onManage={manageFolder} /> : null}
        </>}
        renderItem={renderItem}
        ListEmptyComponent={<View>
          <EmptyState
            icon={query ? <NativeIcon sf="magnifyingglass" material="search-off" size={40} color={colors.textFaint} /> : section === "plugins" ? <NativeIcon sf="puzzlepiece.extension" material="extension" size={40} color={colors.textFaint} /> : <NativeIcon sf="doc.text" material="description" size={40} color={colors.textFaint} />}
            title={query ? "Nothing found" : section === "plugins" && folder !== '__all__' ? "Folder is empty" : section === "plugins" ? "No plugins installed" : "No scripts yet"}
            actionLabel={!query && section === "plugins" && folder === '__all__' && installed.length === 0 ? "Add a plugin" : undefined}
            onAction={() => setPluginMenuOpen(true)}
            subtitle={query ? "Try a different search." : section === "plugins" && folder !== '__all__' ? "Long-press a plugin to move it here." : section === "plugins" ? "Plugins add new things your bots can do. Browse the marketplace or import a .jnp file to get started." : "Scripts are the automations that run on your accounts. This profile has none; choose another profile to see its scripts."}
          />
        </View>}
      />}
      <BottomSheet visible={pluginMenuOpen} onClose={() => setPluginMenuOpen(false)} accessibilityLabel="Add plugin">
        <View style={styles.pluginMenu}>
          <Txt variant="heading" style={styles.pluginMenuTitle}>Add plugin</Txt>
          <PluginMenuItem sf="storefront" material="storefront" title="Browse marketplace" subtitle="Find plugins, profiles and automations" onPress={() => { setPluginMenuOpen(false); router.push('/(app)/plugin-marketplace'); }} />
          <PluginMenuItem sf="folder" material="folder-open" title="Import .jnp file" subtitle="Install a plugin file from your device" onPress={() => { setPluginMenuOpen(false); router.push('/(app)/plugin-import'); }} />
          <PluginMenuItem sf="folder.badge.plus" material="create-new-folder" title="New folder" subtitle="Organize your installed plugins" onPress={() => { setPluginMenuOpen(false); setFolderNameOpen(true); }} />
        </View>
      </BottomSheet>
      <FolderNameSheet
        visible={folderNameOpen}
        existingNames={folders}
        onClose={() => setFolderNameOpen(false)}
        onCreate={(name) => {
          setPreferences((current) => ({ ...current, extraFolders: [...current.extraFolders, name] }));
          setFolder(name);
          setFolderNameOpen(false);
          showMessage(`Created ${name}`, 'success');
        }}
      />
      <FolderPickerSheet
        visible={Boolean(movePlugin)}
        pluginName={movePlugin?.name ?? ''}
        choices={moveChoices}
        selectedFolder={movePlugin ? pluginMetadata[movePlugin.pluginId]?.folder : undefined}
        onClose={() => setMovePlugin(null)}
        onSelect={(target) => {
          if (movePlugin) moveToFolder(movePlugin, target);
          setMovePlugin(null);
        }}
      />
      <BottomSheet visible={sortMenuOpen} onClose={() => setSortMenuOpen(false)} accessibilityLabel="Sort plugins">
        <View style={styles.pluginMenu}>
          <Txt variant="heading" style={styles.pluginMenuTitle}>Sort plugins</Txt>
          <SortMenuItem title="Last edited" selected={preferences.sortOrder === 'date'} onPress={() => { setPreferences((current) => ({ ...current, sortOrder: 'date' })); setSortMenuOpen(false); }} />
          <SortMenuItem title="Name" selected={preferences.sortOrder === 'name'} onPress={() => { setPreferences((current) => ({ ...current, sortOrder: 'name' })); setSortMenuOpen(false); }} />
        </View>
      </BottomSheet>
    </Screen>
  );
}

function PluginMenuItem({ sf, material, title, subtitle, onPress }: { sf: 'storefront' | 'folder' | 'folder.badge.plus'; material: 'storefront' | 'folder-open' | 'create-new-folder'; title: string; subtitle: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.pluginMenuItem, pressed && styles.pluginMenuItemPressed]}>
    <View style={styles.pluginMenuIcon}><NativeIcon sf={sf} material={material} size={22} color={colors.primary} /></View>
    <View style={{ flex: 1, minWidth: 0 }}><Txt variant="heading">{title}</Txt><Txt variant="faint">{subtitle}</Txt></View>
    <NativeIcon sf="chevron.right" material="chevron-right" size={17} color={colors.textFaint} />
  </Pressable>;
}

function SortMenuItem({ title, selected, onPress }: { title: string; selected: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={({ pressed }) => [styles.sortMenuItem, pressed && styles.pluginMenuItemPressed]}>
    <Txt variant="heading" style={{ flex: 1 }}>{title}</Txt>
    {selected ? <NativeIcon sf="checkmark" material="check" size={19} color={colors.primary} /> : null}
  </Pressable>;
}

const styles = StyleSheet.create({
  readyDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success },
  listView: { flex: 1 },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  search: { marginBottom: spacing.md },
  pluginMenu: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  pluginMenuTitle: { paddingHorizontal: spacing.sm, paddingBottom: spacing.md },
  pluginMenuItem: { minHeight: process.env.EXPO_OS === 'android' ? 64 : 60, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.sm, borderRadius: radii.md },
  pluginMenuItemPressed: { backgroundColor: colors.surfaceHover },
  pluginMenuIcon: { width: 38, height: 38, borderRadius: radii.md, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  sortMenuItem: { minHeight: process.env.EXPO_OS === 'android' ? 52 : 48, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.sm, borderRadius: radii.md },
});
