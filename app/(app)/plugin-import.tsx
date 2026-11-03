import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { Screen } from "../../src/components/Screen";
import { NativeIcon } from "../../src/components/NativeIcon";
import { ConflictChoices } from "../../src/components/ConflictChoices";
import { Badge, Button, Card, EmptyState, Txt } from "../../src/components/ui";
import { useConnection } from "../../src/net/ConnectionProvider";
import type {
  PluginImportDecision,
  PluginImportPreview,
  PluginImportResult,
} from "../../src/runtime/types";
import { colors, font, radii, spacing } from "../../src/theme/theme";
import { selectCanUsePlugins, useStore } from "../../src/store/store";

type Step = "pick" | "review" | "installing" | "result";

const keyOf = (item: { source: { ownerId: string; pluginId: string }; revision: string }) =>
  `${item.source.ownerId}:${item.source.pluginId}:${item.revision}`;

export default function PluginImportScreen() {
  const router = useRouter();
  const canUsePlugins = useStore(selectCanUsePlugins);
  const { previewPortablePlugins, importPortablePlugins } = useConnection();
  const [step, setStep] = useState<Step>("pick");
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<string[]>([]);
  const [previews, setPreviews] = useState<PluginImportPreview[]>([]);
  const [actions, setActions] = useState<Record<string, PluginImportDecision["action"]>>({});
  const [riskAccepted, setRiskAccepted] = useState(false);
  const [result, setResult] = useState<PluginImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const risky = useMemo(
    () =>
      previews.some(
        (item) =>
          item.state !== "invalid" &&
          item.state !== "unsupported" &&
          (item.verification === "unsigned" || item.verification === "valid-untrusted"),
      ),
    [previews],
  );

  const pickFiles = async () => {
    if (!canUsePlugins) return;
    try {
      setError(null);
      const res = await DocumentPicker.getDocumentAsync({
        type: ["*/*", "application/json"],
        copyToCacheDirectory: true,
        multiple: true,
      });

      if (res.canceled || !res.assets || !res.assets.length) {
        return;
      }

      setLoading(true);
      const rawFiles: string[] = [];
      const readErrors: string[] = [];

      for (const asset of res.assets) {
        try {
          const file = new File(asset.uri);
          const text = await file.text();
          rawFiles.push(text);
        } catch (cause) {
          readErrors.push(
            `${asset.name}: ${cause instanceof Error ? cause.message : "Failed to read file"}`,
          );
        }
      }

      if (!rawFiles.length && readErrors.length) {
        setError(readErrors.join("\n"));
        setLoading(false);
        return;
      }

      setFiles(rawFiles);
      const nextPreviews = await previewPortablePlugins(rawFiles);
      setPreviews(nextPreviews);
      setActions(
        Object.fromEntries(
          nextPreviews.map((item) => [
            keyOf(item.package),
            item.state === "conflict" ? "replace" : "replace",
          ]),
        ),
      );
      setRiskAccepted(false);
      if (readErrors.length) {
        setError(`Some files could not be read:\n${readErrors.join("\n")}`);
      }
      setStep("review");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
  };

  const install = async () => {
    if (!canUsePlugins) return;
    setError(null);
    setStep("installing");
    try {
      const decisions: PluginImportDecision[] = previews.map((item) => ({
        ownerId: item.package.source.ownerId,
        pluginId: item.package.source.pluginId,
        revision: item.package.revision,
        action:
          item.state === "conflict"
            ? actions[keyOf(item.package)] ?? "replace"
            : "replace",
        acceptUnverified: riskAccepted,
      }));

      const nextResult = await importPortablePlugins(files, decisions);
      setResult(nextResult);
      setStep("result");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setStep("review");
    }
  };

  if (!canUsePlugins) {
    return (
      <Screen title="Import plugins" subtitle="Import .jnp files locally" back>
        <EmptyState
          icon={<NativeIcon sf="lock.fill" material="lock" size={48} color={colors.textFaint} />}
          title="Import disabled"
          subtitle="Your remote access link does not have permission to import plugins."
        />
      </Screen>
    );
  }

  if (step === "installing") {
    return (
      <Screen title="Importing plugins">
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Txt variant="heading" style={{ marginTop: spacing.md }}>
            Installing plugins
          </Txt>
          <Txt variant="muted">Saving plugins to your device…</Txt>
        </View>
      </Screen>
    );
  }

  if (step === "result" && result) {
    const totalInstalled = result.installed.length;
    const totalSkipped = result.skipped.length;
    const totalFailed = result.failed.length;

    return (
      <Screen title="Import completed">
        <ScrollView contentContainerStyle={styles.content}>
          <Card style={{ gap: spacing.sm }}>
            <View style={styles.row}>
              <View style={styles.successIcon}>
                <NativeIcon sf="checkmark" material="check" size={24} color={colors.success} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Txt variant="heading">
                  {totalInstalled === 1
                    ? "1 plugin imported"
                    : `${totalInstalled} plugins imported`}
                </Txt>
                <Txt variant="muted">
                  {totalSkipped > 0 ? `${totalSkipped} skipped. ` : ""}
                  {totalFailed > 0 ? `${totalFailed} failed.` : ""}
                </Txt>
              </View>
            </View>
          </Card>

          {result.installed.map((item) => (
            <ResultRow
              key={`${item.sourcePluginId}:${item.installedPluginId}`}
              icon="checkmark-circle"
              color={colors.success}
              title={item.installedPluginId}
              subtitle={
                item.outcome === "duplicated"
                  ? "Installed as a copy"
                  : item.outcome === "replaced"
                    ? "Replaced existing version"
                    : "Installed successfully"
              }
            />
          ))}

          {result.skipped.map((item) => (
            <ResultRow
              key={`skip:${item.pluginId}`}
              icon="remove-circle"
              color={colors.textFaint}
              title={item.pluginId}
              subtitle={item.reason}
            />
          ))}

          {result.failed.map((item) => (
            <ResultRow
              key={`fail:${item.pluginId}`}
              icon="alert-circle"
              color={colors.danger}
              title={item.pluginId}
              subtitle={item.error}
            />
          ))}

          <Button
            title="Open installed plugins"
            full
            onPress={() => router.replace("/(app)/(tabs)/automation")}
          />
        </ScrollView>
      </Screen>
    );
  }

  if (step === "review") {
    return (
      <Screen
        title="Review plugins"
        subtitle={`${previews.length} ${previews.length === 1 ? "plugin" : "plugins"} ready to import`}
      >
        <ScrollView contentContainerStyle={styles.content}>
          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color={colors.danger} />
              <Txt variant="muted" style={{ color: colors.danger, flex: 1 }}>
                {error}
              </Txt>
            </View>
          ) : null}

          {previews.map((item) => {
            const conflict = item.state === "conflict";
            const identical = item.state === "identical";
            const blocked = item.state === "invalid" || item.state === "unsupported";
            const currentAction = actions[keyOf(item.package)] ?? "replace";

            return (
              <Card
                key={keyOf(item.package)}
                style={[styles.pluginCard, blocked && styles.pluginBlocked]}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.iconCircle}>
                    <NativeIcon
                      sf={item.package.bundle?.info?.scriptType === "action" ? "bolt.fill" : "puzzlepiece.extension"}
                      material={item.package.bundle?.info?.scriptType === "action" ? "bolt" : "extension"}
                      size={20}
                      color={colors.primary}
                    />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Txt variant="heading">{item.package.bundle?.info?.name ?? "Plugin"}</Txt>
                    <Txt variant="muted" numberOfLines={2}>
                      {item.package.bundle?.info?.description || "No description provided"}
                    </Txt>
                  </View>
                </View>

                <View style={styles.badgeRow}>
                  <Badge
                    label={item.package.bundle?.info?.scriptType === "action" ? "Action" : "Script"}
                  />
                  {item.package.bundle?.info?.language ? (
                    <Badge label={item.package.bundle.info.language.toUpperCase()} />
                  ) : null}
                  {item.publisherName ? (
                    <Badge
                      label={item.publisherName}
                      color={colors.success}
                      bg={colors.successSoft}
                    />
                  ) : item.verification === "unsigned" ? (
                    <Badge
                      label="Unsigned"
                      color={colors.warning}
                      bg={colors.warningSoft}
                    />
                  ) : item.verification === "valid-untrusted" ? (
                    <Badge
                      label="Unknown publisher"
                      color={colors.warning}
                      bg={colors.warningSoft}
                    />
                  ) : (
                    <Badge label={item.verification} />
                  )}
                  {identical ? (
                    <Badge
                      label="Up to date"
                      color={colors.textFaint}
                      bg={colors.surfaceAlt}
                    />
                  ) : null}
                </View>

                {blocked ? (
                  <Txt variant="faint" style={{ color: colors.danger, marginTop: 4 }}>
                    {item.reason ?? "This plugin cannot be imported on mobile."}
                  </Txt>
                ) : null}

                {conflict ? (
                  <ConflictChoices
                    value={currentAction}
                    onChange={(action) =>
                      setActions((curr) => ({ ...curr, [keyOf(item.package)]: action }))
                    }
                  />
                ) : null}
              </Card>
            );
          })}

          {risky ? (
            <Card style={styles.riskCard}>
              <View style={{ flex: 1, gap: 4 }}>
                <View style={styles.row}>
                  <Ionicons name="shield-outline" size={18} color={colors.warning} />
                  <Txt variant="heading" style={{ color: colors.warning }}>
                    Unverified code
                  </Txt>
                </View>
                <Txt variant="muted">
                  Plugins can execute JavaScript on this device. Only install files from
                  sources you trust.
                </Txt>
              </View>
              <Switch
                value={riskAccepted}
                onValueChange={setRiskAccepted}
                trackColor={{ true: colors.primary, false: colors.surfaceAlt }}
                thumbColor={colors.text}
              />
            </Card>
          ) : null}

          <View style={{ gap: spacing.md, marginTop: spacing.sm }}>
            <Button
              title={
                previews.length === 1
                  ? "Import plugin"
                  : `Import ${previews.length} plugins`
              }
              full
              disabled={risky && !riskAccepted}
              onPress={install}
            />
            <Button
              title="Select different files"
              variant="secondary"
              full
              onPress={pickFiles}
            />
          </View>
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen title="Import plugins" subtitle="Import .jnp files locally">
      <View style={styles.centerContainer}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Txt variant="muted" style={{ marginTop: spacing.md }}>
              Reading selected files…
            </Txt>
          </View>
        ) : (
          <View style={styles.pickWrapper}>
            <EmptyState
              icon={
                <View style={styles.iconBig}>
                  <NativeIcon
                    sf="arrow.down.doc.fill"
                    material="upload-file"
                    size={44}
                    color={colors.primary}
                  />
                </View>
              }
              title="Select .jnp plugin files"
              subtitle="Choose one or more .jnp files from your device to review and install them locally."
            />

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color={colors.danger} />
                <Txt variant="muted" style={{ color: colors.danger, flex: 1 }}>
                  {error}
                </Txt>
              </View>
            ) : null}

            <View style={styles.footerAction}>
              <Button
                title="Select .jnp file(s)"
                full
                icon={<Ionicons name="folder-open-outline" size={18} color={colors.primaryOn} />}
                onPress={pickFiles}
              />
            </View>
          </View>
        )}
      </View>
    </Screen>
  );
}

function ResultRow({
  icon,
  color,
  title,
  subtitle,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <Card style={styles.resultCard}>
      <Ionicons name={icon} size={22} color={color} />
      <View style={{ flex: 1, gap: 2 }}>
        <Txt variant="heading">{title}</Txt>
        {subtitle ? <Txt variant="muted">{subtitle}</Txt> : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  centerContainer: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: "center",
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  pickWrapper: {
    gap: spacing.xl,
  },
  iconBig: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  footerAction: {
    width: "100%",
    marginTop: spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  pluginCard: {
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
  },
  pluginBlocked: {
    opacity: 0.6,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 2,
  },
  riskCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.dangerSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.warning,
  },
  resultCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  successIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.successSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.dangerSoft,
    borderRadius: radii.md,
  },
});
