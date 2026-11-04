import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Screen } from "../../../src/components/Screen";
import { NativeIcon } from "../../../src/components/NativeIcon";
import { Badge, Button, Card, EmptyState, Txt } from "../../../src/components/ui";
import { ConflictChoices } from "../../../src/components/ConflictChoices";
import { KindBanner, KindTile } from "../../../src/features/marketplace/KindTile";
import { useInstallShare, pluginKey } from "../../../src/features/marketplace/useInstallShare";
import { ShareContents } from "../../../src/features/marketplace/ShareContents";
import { useMarket, useShares } from "../../../src/features/shares";
import { useConnection } from "../../../src/net/ConnectionProvider";
import { selectCanUsePlugins, useStore } from "../../../src/store/store";
import { colors, font, radii, spacing } from "../../../src/theme/theme";
import {
  SHARE_KIND_LABELS,
  defaultPluginAction,
  entryOverview,
  previewBlocked,
  previewNeedsCheck,
  previewOverview,
  shareInstallKey,
  shareInstallState,
  type ShareInstallState,
  type SharePluginAction,
  type SharePluginPreview,
  type SharePreview,
  type ShareOverview,
  type ShareState,
} from "../../../src/generated/client-contract/share";
import { useFeedback } from "../../../src/components/AppFeedback";

const keyOf = pluginKey;
const INSTALL_LABELS = { none: "Install", update: "Update", installed: "Open" } as const;

const CONFLICT_OPTIONS = [
  { id: "replace", label: "Replace" },
  { id: "skip", label: "Skip" },
] as const;

const UPDATE_OPTIONS = [
  { id: "skip", label: "Keep yours" },
  { id: "replace", label: "Update" },
] as const;

function PluginRow({
  plugin,
  action,
  onAction,
}: {
  plugin: SharePluginPreview;
  action: SharePluginAction;
  onAction?: (action: SharePluginAction) => void;
}) {
  const [showCode, setShowCode] = useState(false);
  const blocked = plugin.state === "invalid" || plugin.state === "unsupported";
  return (
    <Card style={{ gap: spacing.xs }}>
      <View style={styles.badgeRow}>
        <Txt variant="heading" style={{ flexShrink: 1 }}>{plugin.name}</Txt>
        {plugin.scriptType ? <Txt variant="faint">{plugin.scriptType}</Txt> : null}
      </View>
      {plugin.description ? <Txt variant="muted">{plugin.description}</Txt> : null}
      {plugin.verification === "unsigned" || plugin.state === "identical" ? (
        <View style={styles.badgeRow}>
          {plugin.verification === "unsigned" ? <Badge label="Unsigned" color={colors.warning} bg={colors.warningSoft} /> : null}
          {plugin.state === "identical" ? <Badge label="Already installed" /> : null}
        </View>
      ) : null}
      {blocked ? (
        <Txt variant="faint" style={{ color: colors.danger }}>
          {plugin.reason ?? "This plugin cannot be installed."}
        </Txt>
      ) : null}
      {plugin.state === "conflict" && onAction ? (
        <ConflictChoices value={action} onChange={onAction} options={CONFLICT_OPTIONS} />
      ) : null}
      {plugin.state === "update" && onAction ? (
        <ConflictChoices
          value={action}
          onChange={onAction}
          options={UPDATE_OPTIONS}
          title="This share has an update for this plugin:"
        />
      ) : null}
      {plugin.code ? (
        <>
          <Pressable onPress={() => setShowCode(!showCode)}>
            <Txt variant="label" style={{ color: colors.primary }}>{showCode ? "Hide code" : "View code"}</Txt>
          </Pressable>
          {showCode ? (
            <ScrollView horizontal style={styles.code}>
              <Txt variant="faint" style={styles.codeText} selectable>{plugin.code}</Txt>
            </ScrollView>
          ) : null}
        </>
      ) : null}
    </Card>
  );
}

function Header({
  overview,
  installState,
  reviewed,
}: {
  overview: ShareOverview;
  installState: ShareInstallState;
  reviewed: boolean;
}) {
  const { publisher, kind } = overview;
  const media = kind === "plugin" || kind === "bundle";
  const state = publisher.official
    ? { label: "JNbot team", color: colors.primary }
    : publisher.own
      ? { label: "You", color: colors.textMuted }
      : publisher.trusted
        ? { label: "Trusted", color: colors.success }
        : reviewed
          ? null
          : { label: "Unverified publisher", color: colors.danger };
  return (
    <View style={{ gap: spacing.lg }}>
      <View style={styles.titleRow}>
        <KindTile kind={kind} color={overview.color} src={kind === "profile" ? overview.bannerUrl : undefined} size={88} />
        <View style={{ flex: 1, gap: 2 }}>
          <Txt style={styles.title} numberOfLines={2}>{overview.title}</Txt>
          <Txt variant="muted" numberOfLines={1} style={{ fontWeight: font.weight.semibold }}>{publisher.name}</Txt>
          <Txt variant="faint" numberOfLines={1}>
            {SHARE_KIND_LABELS[kind]}
            {state ? (
              <>
                {" · "}
                <Txt variant="faint" style={{ color: state.color }}>{state.label}</Txt>
              </>
            ) : null}
          </Txt>
        </View>
      </View>
      {installState === "installed" || installState === "update" ? (
        <Txt style={{ color: installState === "installed" ? colors.success : colors.primary }}>
          {installState === "installed" ? "You have the latest version" : "A newer version is available"}
        </Txt>
      ) : null}
      {media && overview.bannerUrl ? (
        <View style={styles.banner}>
          <KindBanner kind={kind} color={overview.color} src={overview.bannerUrl} height={190} />
        </View>
      ) : null}
      {overview.description ? <Txt>{overview.description}</Txt> : null}
    </View>
  );
}

/**
 * One share. Opened from the marketplace it shows the cached catalog entry and
 * downloads the share only for Install or the code; links download right away.
 */
export default function ShareScreen() {
  const { showMessage } = useFeedback();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { shareAction } = useConnection();
  const { install: installShare, openInstalled } = useInstallShare();
  const profileKey = useStore((state) => state.activeProfileKey);
  const canUsePlugins = useStore(selectCanUsePlugins);
  const entry = useMarket((state) => state.entries?.find((item) => item.id === id));
  const appVersion = useShares((state) => state.appVersion);
  const [initialEntry] = useState(entry);
  const [preview, setPreview] = useState<SharePreview | null>(null);
  const kind = preview?.kind ?? initialEntry?.kind;
  const install = useShares((state) => (kind ? state.installed[shareInstallKey(id ?? "", kind, profileKey)] : undefined));
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(!initialEntry);
  const [busy, setBusy] = useState<"code" | "install" | null>(null);
  const [actions, setActions] = useState<Record<string, SharePluginAction>>({});
  const [trustPublisher, setTrustPublisher] = useState(false);
  const [riskAccepted, setRiskAccepted] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState("");

  const load = async () => {
    try {
      const result = await shareAction<SharePreview>("SHARE_PREVIEW", { link: id, profileKey: profileKey ?? undefined });
      // Previews run on the phone runtime, which knows what is installed.
      useShares.setState(await shareAction<ShareState>("SHARE_STATE", undefined));
      setPreview(result);
      return result;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      return null;
    }
  };

  useEffect(() => {
    if (!canUsePlugins || !id) return;
    if (!initialEntry) void load();
    // The catalog entry needs no download, but installs deleted since must not show as installed.
    else void shareAction<ShareState>("SHARE_STATE", undefined).then(useShares.setState, () => {});
  }, [canUsePlugins, id]);

  const overview = preview ? previewOverview(preview) : initialEntry ? entryOverview(initialEntry) : null;
  if (!canUsePlugins || !overview) {
    return (
      <Screen title="Share" back>
        {!canUsePlugins || error ? (
          <EmptyState
            title="Cannot open this link"
            subtitle={error ?? "Your remote access link does not have permission to install plugins."}
          />
        ) : (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}
      </Screen>
    );
  }

  const installState = shareInstallState(install, overview.revision, overview.minAppVersion, appVersion, overview.publisher.own);
  // Marketplace entries always carry an official approval.
  const reviewed = !!initialEntry || !!preview?.reviewed;
  const { official, own, trusted } = overview.publisher;
  const unverifiedPublisher = !official && !own && !trusted && !reviewed;
  const needsTrust = (share: SharePreview) => !share.publisher.trusted && !share.reviewed && share.plugins.length > 0;
  const risky = !!preview && needsTrust(preview);
  const showCheck = checking && !!preview;

  const showCode = async () => {
    setBusy("code");
    if (preview || (await load())) setChecking(true);
    setBusy(null);
  };

  const report = async () => {
    try {
      await shareAction("SHARE_REPORT", { id: overview.id, reason: reason.trim() });
      setReporting(false);
      showMessage("Thanks, the JNbot team will take a look.", "success");
    } catch (cause) {
      showMessage(`Could not report: ${cause instanceof Error ? cause.message : String(cause)}`, "error");
    }
  };

  const confirmInstall = async () => {
    if (install && installState === "installed") {
      await openInstalled(overview.kind, install.localRef);
      return;
    }
    setBusy("install");
    setError(null);
    const loaded = preview ?? (await load());
    // Something needs a look first: show the check and wait for a second tap.
    if (!loaded || previewBlocked(loaded) || (!checking && previewNeedsCheck(loaded))) {
      if (loaded) setChecking(true);
      setBusy(null);
      return;
    }
    if (needsTrust(loaded) && !riskAccepted) {
      setBusy(null);
      return;
    }
    try {
      await installShare(loaded, actions, trustPublisher);
      showMessage(`${overview.title} installed`, "success");
      setBusy(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setBusy(null);
    }
  };

  return (
    <Screen title={overview.title} subtitle={SHARE_KIND_LABELS[overview.kind]} back>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>
        <Header overview={overview} installState={installState} reviewed={reviewed} />
        <ShareContents overview={overview} />

        {showCheck && preview ? (
          <View style={{ gap: spacing.sm }}>
            <Txt variant="label">{previewNeedsCheck(preview) ? "Check before installing" : "Code"}</Txt>
            {preview.ownerChanged ? (
              <Txt style={{ color: colors.danger }}>
                This share is now signed by a different key than the copy you installed, so it will not update your copy.
              </Txt>
            ) : null}
            {preview.plugins.map((plugin) => (
              <PluginRow
                key={keyOf(plugin)}
                plugin={plugin}
                action={actions[keyOf(plugin)] ?? defaultPluginAction(plugin)}
                onAction={
                  preview.kind === "profile"
                    ? undefined
                    : (action) => setActions((current) => ({ ...current, [keyOf(plugin)]: action }))
                }
              />
            ))}
            {risky ? (
              <Card style={styles.riskCard}>
                <Txt variant="muted">
                  Plugins run code on this device. You have not installed anything from {preview.publisher.name} before.
                </Txt>
                <View style={styles.switchRow}>
                  <Txt style={{ flex: 1 }}>I trust this publisher</Txt>
                  <Switch value={riskAccepted} onValueChange={setRiskAccepted} />
                </View>
                <View style={styles.switchRow}>
                  <Txt style={{ flex: 1 }}>Always trust {preview.publisher.name}</Txt>
                  <Switch value={trustPublisher} onValueChange={setTrustPublisher} />
                </View>
              </Card>
            ) : null}
          </View>
        ) : (
          <Pressable accessibilityRole="button" onPress={() => void showCode()} style={styles.linkRow}>
            {busy === "code" ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <NativeIcon sf="chevron.left.forwardslash.chevron.right" material="code" size={16} color={colors.primary} />
            )}
            <Txt variant="label" style={{ color: colors.primary }}>View code and signatures</Txt>
          </Pressable>
        )}

        {error ? <Txt style={{ color: colors.danger }}>{error}</Txt> : null}

        {reviewed && !overview.publisher.own ? (
          reporting ? (
            <Card style={{ gap: spacing.sm }}>
              <Txt variant="label">What is wrong with it?</Txt>
              <TextInput
                value={reason}
                onChangeText={setReason}
                maxLength={300}
                multiline
                placeholder="e.g. it steals accounts or does not work"
                placeholderTextColor={colors.textFaint}
                style={styles.reason}
              />
              <Button title="Report" variant="danger" small disabled={!reason.trim()} onPress={() => void report()} />
            </Card>
          ) : (
            <Pressable accessibilityRole="button" onPress={() => setReporting(true)} style={styles.reportLink}>
              <Txt variant="label" style={{ color: colors.textMuted }}>Report a problem</Txt>
            </Pressable>
          )
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        {!overview.canInstall ? (
          <Txt variant="muted" style={{ color: colors.warning }}>
            Needs JNbot {overview.minAppVersion} or newer. Update JNbot to install it.
          </Txt>
        ) : null}
        {unverifiedPublisher && installState !== "installed" ? (
          <Txt variant="muted" style={{ color: colors.danger }}>
            <Txt variant="label" style={{ color: colors.danger }}>Only install from people you trust.</Txt> This publisher is
            unverified, and installing can run code on your device.
          </Txt>
        ) : null}
        {installState !== "own" ? (
          <Button
            title={INSTALL_LABELS[installState]}
            full
            loading={busy === "install"}
            disabled={!overview.canInstall || (!!preview && previewBlocked(preview)) || (showCheck && risky && !riskAccepted)}
            onPress={() => void confirmInstall()}
          />
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg },
  banner: { borderRadius: radii.xl, borderCurve: "continuous", overflow: "hidden" },
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  title: { fontSize: font.size.xl, fontWeight: font.weight.bold, color: colors.text },
  footer: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSubtle,
    backgroundColor: colors.bg,
  },
  linkRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, minHeight: 44 },
  reason: { minHeight: 72, padding: spacing.sm, borderRadius: radii.sm, color: colors.text, backgroundColor: colors.surfaceAlt },
  reportLink: { alignSelf: "center", minHeight: 44, justifyContent: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 },
  code: { maxHeight: 280, padding: spacing.sm, borderRadius: radii.sm, backgroundColor: colors.surfaceAlt },
  codeText: { fontFamily: "monospace" },
  riskCard: { gap: spacing.sm, backgroundColor: colors.warningSoft, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.warning },
  switchRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
});
