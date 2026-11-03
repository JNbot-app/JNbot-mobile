import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, usePreventRemove } from "@react-navigation/native";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Screen } from "../../src/components/Screen";
import { Button, Txt } from "../../src/components/ui";
import { PickerField, type Choice } from "../../src/components/PickerField";
import { SettingsField as Field, SettingsToggle as Toggle } from "../../src/components/settings/SettingsFields";
import { ProxyEditor } from "../../src/components/settings/ProxyEditor";
import { KickBehaviorEditor } from "../../src/components/settings/KickBehaviorEditor";
import { DropboxStorage } from "../../src/components/settings/DropboxStorage";
import { EmbeddedNodeBridge, type StorageStatus } from "../../src/runtime/EmbeddedNodeBridge";
import { useConnection } from "../../src/net/ConnectionProvider";
import { selectProfileReady, useStore } from "../../src/store/store";
import { colors, font, getAvailableThemes, radii, spacing, useTheme, Themes } from "../../src/theme/theme";
import {
  appSettingsDraft,
  changedPatches,
  validatePort,
  type KickBehaviorConfig,
  type ProxyConfig,
} from "../../src/features/appSettings";
import {
  loadBackgroundKeepAlivePreference,
  saveBackgroundKeepAlivePreference,
  useBackgroundPowerSetup,
} from "../../src/background";
import { useSystemNotificationsSetting } from "../../src/notifications/useSystemNotificationsSetting";
import { ShareSettings } from "../../src/components/settings/ShareSettings";

type SaveState = "idle" | "saving" | "saved";
type SettingsSection =
  | "storage"
  | "sharing"
  | "preferences"
  | "background"
  | "bot"
  | "proxy"
  | "automation";

const RENDER_DISTANCE_OPTIONS: Choice[] = [
  { label: "2 chunks", value: 2, description: "Minimal memory and CPU" },
  { label: "4 chunks", value: 4, description: "Low compute footprint" },
  { label: "6 chunks", value: 6 },
  { label: "8 chunks", value: 8, description: "Balanced view distance" },
  { label: "10 chunks", value: 10 },
  { label: "12 chunks (Default)", value: 12, description: "Standard render distance" },
  { label: "16 chunks", value: 16, description: "Maximum view distance" },
];

const JOIN_TIMEOUT_OPTIONS: Choice[] = [
  { label: "No timeout (0s)", value: 0 },
  { label: "2 seconds", value: 2000 },
  { label: "5 seconds", value: 5000 },
  { label: "10 seconds (Default)", value: 10000 },
  { label: "15 seconds", value: 15000 },
  { label: "20 seconds", value: 20000 },
  { label: "25 seconds", value: 25000 },
  { label: "30 seconds", value: 30000 },
  { label: "45 seconds", value: 45000 },
  { label: "60 seconds", value: 60000 },
  { label: "90 seconds", value: 90000 },
];

export default function Settings() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { status, client, mode, useLocal } = useConnection();
  const {
    powerStatus,
    state: backgroundPowerState,
    requestBackgroundAccess,
    confirmManufacturerSetup,
  } = useBackgroundPowerSetup();
  const activeProfileKey = useStore((state) => state.activeProfileKey);
  const profile = useStore((state) => state.profiles.find((item) => item.id === activeProfileKey));
  const { theme: currentTheme, setTheme } = useTheme();
  const availableThemes = useMemo(() => getAvailableThemes(), []);
  const activeThemeMeta = useMemo(
    () => availableThemes.find((t) => t.id === currentTheme),
    [availableThemes, currentTheme],
  );

  const handleSelectTheme = (themeId: Themes) => {
    setTheme(themeId);
    if (Platform.OS === "ios") void Haptics.selectionAsync().catch(() => undefined);
    if (client && status === "connected") {
      void client.updateAppSettings([{ key: "theme", value: themeId }]).catch(() => undefined);
    }
  };
  const appSettings = useStore((state) => state.appSettings) as Record<string, unknown>;
  const jnVersions = useStore((state) => state.JNdata?.versions);

  const versionOptions: Choice[] = useMemo(() => {
    const list = jnVersions?.length
      ? jnVersions
      : [
        "1.8.9",
        "1.12.2",
        "1.16.5",
        "1.18.2",
        "1.19.4",
        "1.20.1",
        "1.20.4",
        "1.20.6",
        "1.21.1",
        "1.21.4",
      ];
    return list.map((v) => ({ label: v, value: v }));
  }, [jnVersions]);

  const [initialDraft] = useState(() => appSettingsDraft(appSettings));
  const [bot, setBot] = useState<Record<string, unknown>>(initialDraft.bot);
  const [automation, setAutomation] = useState<Record<string, unknown>>(initialDraft.automation);
  const [proxy, setProxy] = useState<ProxyConfig>(initialDraft.proxy);
  const [backgroundKeepAlive, setBackgroundKeepAlive] = useState<boolean>(true);
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [saving, setSaving] = useState<SaveState>("idle");
  const { section } = useLocalSearchParams<{ section?: SettingsSection }>();
  const [openSection, setOpenSection] = useState<SettingsSection | null>(section ?? null);
  const [systemNotifications, setSystemNotifications] = useSystemNotificationsSetting();
  const [storageStatus, setStorageStatus] = useState<StorageStatus | null>(null);

  useEffect(() => {
    if (mode === "local") {
      const bridge = new EmbeddedNodeBridge();
      void bridge
        .requestStorage<StorageStatus>("status")
        .then(setStorageStatus)
        .catch(() => undefined);
    }
  }, [mode]);

  useEffect(() => {
    if (Platform.OS === "android") {
      void loadBackgroundKeepAlivePreference().then(setBackgroundKeepAlive);
    }
  }, []);

  useEffect(() => {
    const draft = appSettingsDraft(appSettings);
    setBot(draft.bot);
    setAutomation(draft.automation);
    setProxy(draft.proxy);
    setErrors({});
  }, [activeProfileKey, appSettings]);

  const isProfileReady = useStore(selectProfileReady);
  const canSave = isProfileReady && status === "connected";
  const persistedDraft = useMemo(() => appSettingsDraft(appSettings), [appSettings]);
  const botPatches = useMemo(() => changedPatches(persistedDraft.bot, bot), [persistedDraft, bot]);
  const automationPatches = useMemo(() => changedPatches(persistedDraft.automation, automation), [automation, persistedDraft]);
  const proxyPatches = useMemo(() => changedPatches({ proxy: persistedDraft.proxy }, { proxy }), [persistedDraft, proxy]);
  const allPatches = useMemo(
    () => [...botPatches, ...proxyPatches, ...automationPatches],
    [automationPatches, botPatches, proxyPatches],
  );
  const dirty = allPatches.length > 0;

  const toggle = (section: SettingsSection) =>
    setOpenSection((current) => current === section ? null : section);
  const discard = () => {
    const draft = appSettingsDraft(appSettings);
    setBot(draft.bot);
    setAutomation(draft.automation);
    setProxy(draft.proxy);
    setErrors({});
  };
  const save = async (): Promise<boolean> => {
    if (!client || !allPatches.length) return true;
    const nextErrors: Record<string, string | null> = {};
    if (!String(bot.ip ?? "").trim()) nextErrors.bot = "Enter a server host or IP.";
    else if (validatePort(String(bot.port)) === null) nextErrors.bot = "Enter a port between 1 and 65535.";
    else if (!Number.isFinite(Number(bot.joinServerTimeout)) || Number(bot.joinServerTimeout) < 0) nextErrors.bot = "Join timeout must be zero or a positive number.";
    else if (!Number.isFinite(Number(bot.render_distance)) || Number(bot.render_distance) < 2) nextErrors.bot = "Render distance must be at least 2 chunks.";
    if (proxy.enabled && !proxy.urls.length) nextErrors.proxy = "Add at least one proxy before enabling the pool.";
    if ([automation.join_delay, automation.delay_between_actions].some((value) => !Number.isFinite(Number(value)) || Number(value) < 0)) nextErrors.automation = "Delays must be zero or positive numbers.";
    const firstError = (["bot", "proxy", "automation"] as SettingsSection[]).find((section) => nextErrors[section]);
    if (firstError) {
      setErrors(nextErrors);
      setOpenSection(firstError);
      return false;
    }
    const prepared = allPatches.map((patch) =>
      ["port", "joinServerTimeout", "render_distance", "join_delay", "delay_between_actions"].includes(patch.key)
        ? { ...patch, value: Number(patch.value) }
        : patch,
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

  usePreventRemove(dirty, ({ data }) => {
    Alert.alert("Unsaved settings", "Save your changes before leaving?", [
      { text: "Stay", style: "cancel" },
      { text: "Discard", style: "destructive", onPress: () => { discard(); navigation.dispatch(data.action); } },
      { text: "Save", onPress: () => void save().then((ok) => { if (ok) { discard(); navigation.dispatch(data.action); } }) },
    ]);
  });

  const guardNavigation = (navigate: () => void) => {
    if (!dirty) {
      navigate();
      return;
    }
    Alert.alert("Unsaved settings", "Save your changes before continuing?", [
      { text: "Stay", style: "cancel" },
      { text: "Discard", style: "destructive", onPress: () => { discard(); navigate(); } },
      { text: "Save", onPress: () => void save().then((ok) => { if (ok) navigate(); }) },
    ]);
  };

  return (
    <Screen title="Settings" subtitle={profile?.name} back beforeNavigate={guardNavigation}>
      <ScrollView
        style={styles.page}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.lg }]}
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {Platform.OS === "android" ? (
          <Section
            title="Background execution"
            icon="battery-charging-outline"
            summary={backgroundKeepAlive ? "Stay active when minimized" : "Disabled"}
            open={openSection === "background"}
            onToggle={() => toggle("background")}
          >
            <View style={styles.settingGroup}>
              <Toggle
                label="Keep bots active in background"
                description="Maintains an ongoing foreground service with CPU and network locks so bots stay connected when JNbot is minimized or the screen is locked."
                value={backgroundKeepAlive}
                onChange={(val) => {
                  setBackgroundKeepAlive(val);
                  void saveBackgroundKeepAlivePreference(val);
                }}
              />
              <View style={styles.batteryRow}>
                <View style={styles.grow}>
                  <Txt variant="body">Android battery optimization</Txt>
                  <Txt variant="faint">
                    {!powerStatus
                      ? "Checking Android background settings…"
                      : powerStatus.isBatteryOptimizationIgnored
                        ? "Exempt from Android battery optimization"
                        : "Android may pause JNbot when it is in the background"}
                  </Txt>
                </View>
                {powerStatus && !powerStatus.isBatteryOptimizationIgnored ? (
                  <Button
                    title="Exempt app"
                    variant="secondary"
                    onPress={() => void requestBackgroundAccess()}
                  />
                ) : powerStatus?.isBatteryOptimizationIgnored ? (
                  <Ionicons name="checkmark-circle" size={22} color={colors.online} />
                ) : null}
              </View>
              {powerStatus?.requiresManufacturerSetup ? (
                <View style={styles.batteryRow}>
                  <View style={styles.grow}>
                    <Txt variant="body">Vivo / iQOO background power</Txt>
                    <Txt variant="faint">
                      {!powerStatus.isBatteryOptimizationIgnored
                        ? "First exempt JNbot from Android battery optimization"
                        : backgroundPowerState === "awaiting-oem-confirmation"
                          ? "Choose “Don’t restrict background power usage”, then confirm"
                          : backgroundPowerState === "complete"
                            ? "You confirmed “Don’t restrict background power usage”"
                            : "Choose “Don’t restrict background power usage” for JNbot"}
                    </Txt>
                  </View>
                  {backgroundPowerState === "awaiting-oem-confirmation" ? (
                    <Button
                      title="Confirm"
                      variant="secondary"
                      onPress={() => void confirmManufacturerSetup()}
                    />
                  ) : (
                    <Button
                      title={backgroundPowerState === "complete" ? "Review" : "Open settings"}
                      variant="secondary"
                      disabled={!powerStatus.isBatteryOptimizationIgnored}
                      onPress={() => void requestBackgroundAccess()}
                    />
                  )}
                </View>
              ) : null}
            </View>
          </Section>
        ) : null}

        <Section
          title="Preferences"
          icon="options-outline"
          summary={`${activeThemeMeta?.name ?? "Dark (Default)"} · ${systemNotifications ? "Notifications on" : "In-app only"}`}
          open={openSection === "preferences"}
          onToggle={() => toggle("preferences")}
        >
          <Subheading title="Notifications" icon="notifications-outline" />
          <View style={styles.settingGroup}>
            <Toggle
              label="System notifications"
              description="Show JNbot notifications on your phone while the app is in the background."
              value={systemNotifications}
              onChange={(val) => void setSystemNotifications(val)}
            />
          </View>
          <Subheading title="Appearance" icon="color-palette-outline" />
          <View style={styles.settingGroup}>
            <Txt variant="faint" style={styles.helpText}>
              Choose an interface theme. Changes apply instantly across the app.
            </Txt>
            <View style={styles.themeList}>
              {availableThemes.map((item) => {
                const selected = currentTheme === item.id;
                return (
                  <Pressable
                    key={item.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`${item.name} theme`}
                    onPress={() => handleSelectTheme(item.id)}
                    style={({ pressed }) => [
                      styles.themeItem,
                      selected && styles.themeItemSelected,
                      pressed && { opacity: 0.8 },
                    ]}
                  >
                    <View style={[styles.themeSwatch, { backgroundColor: item.bgColor, borderColor: item.surfaceColor }]}>
                      <View style={[styles.themeSwatchSurface, { backgroundColor: item.surfaceColor }]}>
                        <View style={[styles.themeSwatchDot, { backgroundColor: item.primaryColor }]} />
                      </View>
                    </View>
                    <View style={styles.grow}>
                      <Txt variant="body" style={{ fontWeight: selected ? "600" : "400" }}>
                        {item.name}
                      </Txt>
                      <Txt variant="faint" numberOfLines={2}>
                        {item.description}
                      </Txt>
                    </View>
                    <Ionicons
                      name={selected ? "checkmark-circle" : "ellipse-outline"}
                      size={22}
                      color={selected ? colors.primary : colors.textFaint}
                    />
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Section>

        <Section
          title="Bot"
          icon="cube-outline"
          summary={`${String(bot.ip || "No host")}:${String(bot.port || 25565)} • ${bot.version ?? '1.8.9'}`}
          dirty={botPatches.length > 0}
          open={openSection === "bot"}
          onToggle={() => toggle("bot")}
        >
          <View style={styles.settingGroup}>
            <Subheading title="Server connection" icon="server-outline" />
            <View style={styles.field}>
              <Txt variant="faint">Minecraft version</Txt>
              <PickerField
                title="Select Minecraft version"
                options={versionOptions}
                value={String(bot.version ?? "1.8.9")}
                freeSolo
                onChange={(value) => setBot((item) => ({ ...item, version: String(value ?? "1.8.9") }))}
                placeholder="1.8.9"
              />
            </View>
            <Field
              label="Server host or IP"
              value={String(bot.ip ?? "")}
              onChangeText={(value) => setBot((item) => ({ ...item, ip: value }))}
              placeholder="play.example.com"
            />
            <Field
              label="Server port"
              value={String(bot.port ?? "")}
              onChangeText={(value) => setBot((item) => ({ ...item, port: Number(value) || value }))}
              keyboardType="number-pad"
              placeholder="25565"
            />
          </View>

          <View style={styles.settingGroup}>
            <Subheading title="Performance & rendering" icon="speedometer-outline" />
            <View style={styles.field}>
              <Txt variant="faint">Render distance</Txt>
              <PickerField
                title="Select render distance"
                options={RENDER_DISTANCE_OPTIONS}
                value={Number(bot.render_distance ?? 12)}
                onChange={(value) => setBot((item) => ({ ...item, render_distance: Number(value) }))}
                placeholder="12 chunks"
              />
              <Txt variant="faint" style={styles.helpText}>
                Lower values reduce memory and CPU usage on mobile devices.
              </Txt>
            </View>
            <Toggle
              label="Reduced cosmetic events"
              description="Disables high-frequency cosmetic events (lighting updates, particles, sounds, explosions) to save compute."
              value={bot.reduced_events === true}
              onChange={(value) => setBot((item) => ({ ...item, reduced_events: value }))}
            />
          </View>

          <View style={styles.settingGroup}>
            <Subheading title="Connection & timeouts" icon="timer-outline" />
            <Toggle
              label="Rotate server IPs"
              description="Scripts use different IPs to join the server to avoid rate limits."
              value={bot.serverIpRotation === true}
              onChange={(value) => setBot((item) => ({ ...item, serverIpRotation: value }))}
            />
            <Toggle
              label="Retry after login failure"
              description="Automatically attempt rejoining when connection fails during login."
              value={bot.retryOnLoginFail !== false}
              onChange={(value) => setBot((item) => ({ ...item, retryOnLoginFail: value }))}
            />
            <View style={styles.field}>
              <Txt variant="faint">Join timeout</Txt>
              <PickerField
                title="Select join timeout"
                options={JOIN_TIMEOUT_OPTIONS}
                value={Number(bot.joinServerTimeout ?? 10000)}
                onChange={(value) => setBot((item) => ({ ...item, joinServerTimeout: Number(value) }))}
                placeholder="10 seconds"
              />
              <Txt variant="faint" style={styles.helpText}>
                When the bot has not joined within this time, it will stop waiting.
              </Txt>
            </View>
          </View>

          <View style={styles.settingGroup}>
            <Subheading title="Protections & automation" icon="shield-outline" />
            <Toggle
              label="Auto V4guard verification"
              description="Automatically opens a browser verification when V4guard flags the bot."
              value={bot.auto_v4guard !== false}
              onChange={(value) => setBot((item) => ({ ...item, auto_v4guard: value }))}
            />
            <Toggle
              label="Auto resource pack accept"
              description="Automatically accepts resource packs when requested by the server."
              value={bot.autoResourcePackAccept !== false}
              onChange={(value) => setBot((item) => ({ ...item, autoResourcePackAccept: value }))}
            />
          </View>

          <View style={styles.settingGroup}>
            <Subheading title="Kick behavior" icon="exit-outline" />
            <KickBehaviorEditor
              value={bot.kickBehaviour as KickBehaviorConfig}
              onChange={(next) => setBot((item) => ({ ...item, kickBehaviour: next }))}
            />
          </View>

          {errors.bot ? <InlineError message={errors.bot} /> : null}
        </Section>


        <Section title="Scripts" icon="git-network-outline" summary={`${String(automation.delay_between_actions ?? 250)}ms action delay`} dirty={automationPatches.length > 0} open={openSection === "automation"} onToggle={() => toggle("automation")}>
          <View style={styles.settingGroup}>
            <Field label="Bot join delay (ms)" value={String(automation.join_delay ?? "")} onChangeText={(value) => setAutomation((item) => ({ ...item, join_delay: Number(value) || value }))} keyboardType="number-pad" />
            <Field label="Delay between actions (ms)" value={String(automation.delay_between_actions ?? "")} onChangeText={(value) => setAutomation((item) => ({ ...item, delay_between_actions: Number(value) || value }))} keyboardType="number-pad" />
            <Toggle
              label="Optimize for memory"
              description="Reduces memory usage for scripts at the cost of compute performance."
              value={automation.worker_optimize_for_size === true}
              onChange={(value) => setAutomation((item) => ({ ...item, worker_optimize_for_size: value }))}
            />
            {errors.automation ? <InlineError message={errors.automation} /> : null}
          </View>
        </Section>


        <Section title="Network & proxies" icon="shield-checkmark-outline" summary={proxy.enabled ? `${proxy.urls.length} proxies` : "Direct connection"} dirty={proxyPatches.length > 0} open={openSection === "proxy"} onToggle={() => toggle("proxy")}>
          <View style={styles.settingGroup}>
            <ProxyEditor value={proxy} onChange={setProxy} />
            {errors.proxy ? <InlineError message={errors.proxy} /> : null}
          </View>
        </Section>
        {mode === "local" ? (
          <Section
            title="Storage"
            icon="cloud-outline"
            summary={storageStatus?.mode === "dropbox" ? "Dropbox Sync" : "Device Storage"}
            open={openSection === "storage"}
            onToggle={() => toggle("storage")}
          >
            <DropboxStorage onRestart={useLocal} onStatusChange={setStorageStatus} />
          </Section>
        ) : null}
        {mode === "local" ? (
          <Section
            title="Sharing"
            icon="share-social-outline"
            summary="Publisher name and your share links"
            open={openSection === "sharing"}
            onToggle={() => toggle("sharing")}
          >
            <ShareSettings />
          </Section>
        ) : null}
        {dirty || errors.save ? (
          <View style={styles.saveBar}>
            <Txt variant="heading">
              {allPatches.length} unsaved change{allPatches.length === 1 ? "" : "s"}
            </Txt>
            {errors.save ? (
              <InlineError message={errors.save} />
            ) : (
              <Txt variant="faint">
                Changes apply to {profile?.shortName ?? profile?.name ?? "this profile"}.
              </Txt>
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

function Section({
  title,
  icon,
  summary,
  dirty,
  open,
  onToggle,
  children,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  summary: string;
  dirty?: boolean;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.sectionCard}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => {
          if (process.env.EXPO_OS === "ios") void Haptics.selectionAsync().catch(() => undefined);
          onToggle();
        }}
        style={({ pressed }) => [
          styles.sectionHeader,
          pressed && { backgroundColor: colors.surfaceHover },
        ]}
      >
        <View style={styles.sectionIcon}>
          <Ionicons name={icon} size={19} color={colors.primary} />
        </View>
        <View style={styles.grow}>
          <View style={styles.sectionHeading}>
            <Txt variant="heading">{title}</Txt>
            {dirty ? <View style={styles.dirtyDot} /> : null}
          </View>
          <Txt variant="faint" numberOfLines={1}>
            {summary}
          </Txt>
        </View>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={18}
          color={colors.textFaint}
        />
      </Pressable>
      {open ? (
        <View style={styles.sectionBody}>
          <View style={styles.sectionDivider} />
          <View style={styles.sectionContent}>{children}</View>
        </View>
      ) : null}
    </View>
  );
}

function InlineError({ message }: { message: string }) {
  return <View style={styles.error}><Ionicons name="alert-circle" size={17} color={colors.danger} /><Txt variant="muted" style={{ color: colors.danger, flex: 1 }}>{message}</Txt></View>;
}

function Subheading({
  title,
  icon,
}: {
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={styles.subheadingRow}>
      {icon ? <Ionicons name={icon} size={15} color={colors.primary} /> : null}
      <Txt variant="heading" style={styles.subheadingText}>
        {title}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  scroll: { padding: spacing.lg, gap: spacing.lg },
  sectionCard: {
    borderRadius: radii.lg,
    borderCurve: "continuous",
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
    overflow: "hidden",
  },
  sectionHeader: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  sectionIcon: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
  },
  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  dirtyDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.warning,
  },
  sectionBody: {},
  sectionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.borderSubtle,
  },
  sectionContent: {
    gap: spacing.xl,
    padding: spacing.xl,
    paddingTop: spacing.lg,
  },
  settingGroup: {
    gap: spacing.md,
  },
  helpText: {
    fontSize: font.size.caption,
    lineHeight: 18,
    color: colors.textFaint,
    marginTop: 2,
  },
  subheadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
    marginBottom: spacing.xs,
  },
  subheadingText: {
    fontSize: font.size.sm,
    fontWeight: "600",
    color: colors.text,
    letterSpacing: 0.2,
  },
  row: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: spacing.md },
  grow: { flex: 1 },
  field: { gap: 8 },
  input: { minHeight: 46, flex: 1, paddingHorizontal: spacing.md, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgElevated, color: colors.text, fontSize: font.size.base },
  saveBar: { gap: spacing.sm, padding: spacing.md, borderRadius: radii.md, backgroundColor: colors.bgElevated },
  saveActions: { flexDirection: "row", justifyContent: "flex-end", gap: spacing.sm },
  error: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.sm, borderRadius: radii.md, backgroundColor: colors.dangerSoft },
  batteryRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md, paddingVertical: spacing.xs },
  themeList: { gap: spacing.sm },
  themeItem: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  themeItemSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceAlt,
  },
  themeSwatch: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  themeSwatchSurface: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  themeSwatchDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
