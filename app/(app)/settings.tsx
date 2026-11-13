import React, { useEffect, useMemo, useState } from "react";
import { Alert, BackHandler, Platform, ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, usePreventRemove } from "@react-navigation/native";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Screen } from "../../src/components/Screen";
import { Button, Txt } from "../../src/components/ui";
import { SettingsGroup, NavRow } from "../../src/components/settings/SettingsGroup";
import {
  BehaviorPage,
  ConnectionPage,
  GeneralPage,
  InlineError,
  NotificationsPage,
  ProxiesPage,
  ScriptsPage,
  type DraftProps,
} from "../../src/components/settings/SettingsPages";
import { DropboxStorage } from "../../src/components/settings/DropboxStorage";
import { LlmSettings } from "../../src/components/settings/LlmSettings";
import { ShareSettings } from "../../src/components/settings/ShareSettings";
import { EmbeddedNodeBridge, type StorageStatus } from "../../src/runtime/EmbeddedNodeBridge";
import { useConnection } from "../../src/net/ConnectionProvider";
import { selectProfileReady, useStore } from "../../src/store/store";
import { useSystemNotificationsSetting } from "../../src/notifications/useSystemNotificationsSetting";
import { getAvailableThemes, spacing, useTheme, colors, radii } from "../../src/theme/theme";
import {
  appSettingsDraft,
  changedPatches,
  validatePort,
  type ProxyConfig,
} from "../../src/features/appSettings";

type SaveState = "idle" | "saving" | "saved";
type PageKey =
  | "general"
  | "notifications"
  | "connection"
  | "behavior"
  | "proxies"
  | "scripts"
  | "ai"
  | "publishing"
  | "storage";

/** Section names used by deep links (notification buttons, older builds) → page. */
const PAGE_ALIASES: Record<string, PageKey> = {
  preferences: "general",
  background: "general",
  sound: "notifications",
  bot: "connection",
  proxy: "proxies",
  automation: "scripts",
  sharing: "publishing",
};

const TITLES: Record<PageKey, string> = {
  general: "General",
  notifications: "Notifications",
  connection: "Connection",
  behavior: "Bot behavior",
  proxies: "Proxies",
  scripts: "Scripts",
  ai: "AI assistant",
  publishing: "Sharing & publishing",
  storage: "Storage & backup",
};

/** Draft settings each page edits, to show unsaved dots in the list. */
const PAGE_KEYS: Partial<Record<PageKey, string[]>> = {
  connection: ["version", "ip", "port", "serverIpRotation", "retryOnLoginFail", "joinServerTimeout", "kickBehaviour", "join_delay"],
  behavior: ["auto_v4guard", "captcha_prompt", "autoResourcePackAccept", "render_distance", "reduced_events"],
  proxies: ["proxy"],
  scripts: ["delay_between_actions", "worker_optimize_for_size"],
};

const NUMERIC_KEYS = ["port", "joinServerTimeout", "render_distance", "join_delay", "delay_between_actions"];
const isBad = (value: unknown, min = 0) => !Number.isFinite(Number(value)) || Number(value) < min;

export default function Settings() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { status, client, mode, useLocal } = useConnection();
  const activeProfileKey = useStore((state) => state.activeProfileKey);
  const profile = useStore((state) => state.profiles.find((item) => item.id === activeProfileKey));
  const appSettings = useStore((state) => state.appSettings) as Record<string, unknown>;
  const { theme } = useTheme();
  const themeName = useMemo(() => getAvailableThemes().find((t) => t.id === theme)?.name ?? "Dark", [theme]);
  const [systemNotifications] = useSystemNotificationsSetting();

  const { section } = useLocalSearchParams<{ section?: string }>();
  const [page, setPage] = useState<PageKey | null>(
    section ? (PAGE_ALIASES[section] ?? (section in TITLES ? (section as PageKey) : null)) : null,
  );
  const [initialDraft] = useState(() => appSettingsDraft(appSettings));
  const [bot, setBot] = useState<Record<string, unknown>>(initialDraft.bot);
  const [automation, setAutomation] = useState<Record<string, unknown>>(initialDraft.automation);
  const [proxy, setProxy] = useState<ProxyConfig>(initialDraft.proxy);
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [saving, setSaving] = useState<SaveState>("idle");
  const [storageStatus, setStorageStatus] = useState<StorageStatus | null>(null);

  useEffect(() => {
    if (mode !== "local") return;
    void new EmbeddedNodeBridge()
      .requestStorage<StorageStatus>("status")
      .then(setStorageStatus)
      .catch(() => undefined);
  }, [mode]);

  const discard = () => {
    const draft = appSettingsDraft(appSettings);
    setBot(draft.bot);
    setAutomation(draft.automation);
    setProxy(draft.proxy);
    setErrors({});
  };
  useEffect(discard, [activeProfileKey, appSettings]);

  // Android back / header back close the open page before leaving Settings.
  useEffect(() => {
    if (!page) return undefined;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      setPage(null);
      return true;
    });
    return () => sub.remove();
  }, [page]);

  const isProfileReady = useStore(selectProfileReady);
  const canSave = isProfileReady && status === "connected";
  const persisted = useMemo(() => appSettingsDraft(appSettings), [appSettings]);
  const allPatches = useMemo(
    () => [
      ...changedPatches(persisted.bot, bot),
      ...changedPatches({ proxy: persisted.proxy }, { proxy }),
      ...changedPatches(persisted.automation, automation),
    ],
    [persisted, bot, proxy, automation],
  );
  const dirty = allPatches.length > 0;
  const pageDirty = (key: PageKey) => allPatches.some((patch) => PAGE_KEYS[key]?.includes(patch.key));

  const save = async (): Promise<boolean> => {
    if (!client || !allPatches.length) return true;
    const next: Record<string, string | null> = {};
    if (!String(bot.ip ?? "").trim()) next.connection = "Enter a server host or IP.";
    else if (validatePort(String(bot.port)) === null) next.connection = "Enter a port between 1 and 65535.";
    else if (isBad(bot.joinServerTimeout)) next.connection = "Join timeout must be zero or a positive number.";
    else if (isBad(automation.join_delay)) next.connection = "Join delay must be zero or a positive number.";
    if (isBad(bot.render_distance, 2)) next.behavior = "Render distance must be at least 2 chunks.";
    if (proxy.enabled && !proxy.urls.length) next.proxies = "Add at least one proxy before enabling the pool.";
    if (isBad(automation.delay_between_actions)) next.scripts = "Delays must be zero or positive numbers.";
    const firstError = (Object.keys(next) as PageKey[])[0];
    if (firstError) {
      setErrors(next);
      setPage(firstError);
      return false;
    }
    const prepared = allPatches.map((patch) =>
      NUMERIC_KEYS.includes(patch.key) ? { ...patch, value: Number(patch.value) } : patch,
    );
    setSaving("saving");
    setErrors({});
    try {
      await client.updateAppSettings(prepared);
      setSaving("saved");
      setTimeout(() => setSaving("idle"), 1200);
      return true;
    } catch (cause) {
      setSaving("idle");
      setErrors({ save: cause instanceof Error ? cause.message : "Could not save these settings." });
      return false;
    }
  };

  const confirmLeave = (proceed: () => void, message: string) =>
    Alert.alert("Unsaved settings", message, [
      { text: "Stay", style: "cancel" },
      { text: "Discard", style: "destructive", onPress: () => { discard(); proceed(); } },
      { text: "Save", onPress: () => void save().then((ok) => { if (ok) { discard(); proceed(); } }) },
    ]);
  usePreventRemove(dirty, ({ data }) =>
    confirmLeave(() => navigation.dispatch(data.action), "Save your changes before leaving?"),
  );
  const guardNavigation = (navigate: () => void) =>
    dirty ? confirmLeave(navigate, "Save your changes before continuing?") : navigate();

  const draft: DraftProps = { bot, setBot, automation, setAutomation, proxy, setProxy, errors };
  const canGlobal = client?.permissions.can("globalSettings");
  const isLocal = mode === "local";

  const renderPage = (key: PageKey) => {
    switch (key) {
      case "general": return <GeneralPage />;
      case "notifications": return <NotificationsPage />;
      case "connection": return <ConnectionPage {...draft} />;
      case "behavior": return <BehaviorPage {...draft} />;
      case "proxies": return <ProxiesPage {...draft} />;
      case "scripts": return <ScriptsPage {...draft} />;
      case "ai": return <SettingsGroup><LlmSettings /></SettingsGroup>;
      case "publishing": return <SettingsGroup><ShareSettings /></SettingsGroup>;
      case "storage": return <DropboxStorage onRestart={useLocal} onStatusChange={setStorageStatus} />;
    }
  };

  const row = (key: PageKey, icon: keyof typeof Ionicons.glyphMap, summary?: string) => (
    <NavRow key={key} icon={icon} title={TITLES[key]} summary={summary} dirty={pageDirty(key)} onPress={() => setPage(key)} />
  );

  const hub = (
    <>
      <SettingsGroup title="App">
        {row("general", "options-outline", themeName)}
        {row("notifications", "notifications-outline", systemNotifications ? "System notifications on" : "In-app only")}
      </SettingsGroup>
      <SettingsGroup title="Bots">
        {row("connection", "server-outline", `${String(bot.ip || "No host")}:${String(bot.port || 25565)} · ${String(bot.version ?? "1.8.9")}`)}
        {row("behavior", "cube-outline", `${String(bot.render_distance ?? 12)} chunks render distance`)}
        {row("proxies", "shield-checkmark-outline", proxy.enabled ? `${proxy.urls.length} proxies` : "Direct connection")}
      </SettingsGroup>
      <SettingsGroup title="Automation">
        {row("scripts", "git-network-outline", `${String(automation.delay_between_actions ?? 250)}ms action delay`)}
        {canGlobal ? row("ai", "sparkles-outline", "Provider, API key and model") : null}
      </SettingsGroup>
      {isLocal ? (
        <SettingsGroup title="Marketplace">
          {row("publishing", "share-social-outline", "Publisher name and your share links")}
        </SettingsGroup>
      ) : null}
      {isLocal ? (
        <SettingsGroup title="Manage">
          {row("storage", "cloud-outline", storageStatus?.mode === "dropbox" ? "Dropbox sync" : "Device storage")}
        </SettingsGroup>
      ) : null}
    </>
  );

  return (
    <Screen
      title={page ? TITLES[page] : "Settings"}
      subtitle={profile?.name}
      back
      onBack={page ? () => setPage(null) : undefined}
      beforeNavigate={guardNavigation}
    >
      <ScrollView
        style={styles.page}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xl }]}
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        contentInsetAdjustmentBehavior="automatic"
      >
        {page ? renderPage(page) : hub}
        {dirty || errors.save ? (
          <View style={styles.saveBar}>
            <Txt variant="heading">{allPatches.length} unsaved change{allPatches.length === 1 ? "" : "s"}</Txt>
            {errors.save ? (
              <InlineError message={errors.save} />
            ) : (
              <Txt variant="faint">Changes apply to {profile?.shortName ?? profile?.name ?? "this profile"}.</Txt>
            )}
            <View style={styles.saveActions}>
              <Button title="Discard" variant="ghost" disabled={saving === "saving"} onPress={discard} />
              <Button
                title={saving === "saving" ? "Saving…" : saving === "saved" ? "Saved" : "Save"}
                loading={saving === "saving"}
                disabled={!canSave || !dirty}
                onPress={() => void save()}
              />
            </View>
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  scroll: { padding: spacing.lg, gap: spacing.xl },
  saveBar: { gap: spacing.sm, padding: spacing.md, borderRadius: radii.md, backgroundColor: colors.bgElevated },
  saveActions: { flexDirection: "row", justifyContent: "flex-end", gap: spacing.sm },
});
