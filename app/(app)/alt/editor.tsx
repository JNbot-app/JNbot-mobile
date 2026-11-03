import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from "react-native";
import { Screen } from '../../../src/components/Screen';
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { Button, Card, EmptyState, Txt } from "../../../src/components/ui";
import { PickerField } from "../../../src/components/PickerField";
import { useClient } from "../../../src/net/ConnectionProvider";
import { selectCanUseAccounts, useStore } from "../../../src/store/store";
import {
  altFromDraft,
  draftFromAlt,
  type AltDraft,
  validateAltDraft,
} from "../../../src/features/alts";
import { colors, radii, spacing } from "../../../src/theme/theme";
import { useSafeBack } from "../../../src/hooks/useSafeBack";
import { isOnlineMode } from "../../../src/features/serverAuthentication";
import { useFeedback } from "../../../src/components/AppFeedback";

const ALL_EDGES = ['top', 'bottom', 'left', 'right'] as const;

export default function AltEditor() {
  const { showMessage } = useFeedback();
  const goBack = useSafeBack("/(app)/alts");
  const { username } = useLocalSearchParams<{ username?: string }>();
  const client = useClient();
  const alts = useStore((s) => s.alts);
  const jndata = useStore((s) => s.JNdata);
  const profileKey = useStore((s) => s.activeProfileKey);
  const existing = useMemo(
    () =>
      username
        ? alts.find(
          (alt) => alt.username.toLowerCase() === username.toLowerCase(),
        )
        : undefined,
    [alts, username],
  );
  const onlineMode = isOnlineMode(jndata?.data?.[profileKey ?? '']);
  const [draft, setDraft] = useState<AltDraft>(() => draftFromAlt(existing, onlineMode));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const canUseAccounts = useStore(selectCanUseAccounts);
  const gamemodes = useMemo(
    () => Object.entries(jndata?.servers?.[profileKey ?? ""] ?? {}),
    [jndata, profileKey],
  );
  useEffect(() => {
    setDraft(draftFromAlt(existing, onlineMode));
    setError(null);
  }, [existing?.username, onlineMode]);

  if (username && !existing)
    return (
      <Screen back onBack={goBack} edges={ALL_EDGES} title="Alt unavailable">
        <EmptyState
          title="Alt unavailable"
          subtitle="It may have been removed or belongs to another profile."
        />
      </Screen>
    );

  const update = <K extends keyof AltDraft>(key: K, value: AltDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const save = async () => {
    const message = validateAltDraft(draft, alts, existing?.username, onlineMode);
    if (message) {
      setError(message);
      return;
    }
    if (!client) {
      setError("Connect to JNbot before saving.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await client.upsertAlt({
        alt: altFromDraft(draft, existing, onlineMode),
        originalUsername: existing?.username,
      });
      goBack();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not save this alt.",
      );
    } finally {
      setSaving(false);
    }
  };

  const logoutMicrosoft = async () => {
    if (!client || !existing || loggingOut) return;
    setLoggingOut(true);
    setError(null);
    try {
      await client.profileAction<boolean>("MC_LOGOUT_MICROSOFT", {
        username: existing.username,
      });
      showMessage("Logged out of Microsoft. You’ll need to sign in again next time you join.", "success");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not log out of Microsoft.");
    } finally {
      setLoggingOut(false);
    }
  };

  const remove = () =>
    Alert.alert(
      "Remove alt?",
      `${existing?.username} will be removed from this profile.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            if (!client || !existing) return;
            setSaving(true);
            try {
              await client.deleteAlt(existing.username);
              goBack();
            } catch (cause) {
              setError(
                cause instanceof Error
                  ? cause.message
                  : "Could not remove this alt.",
              );
            } finally {
              setSaving(false);
            }
          },
        },
      ],
    );

  if (!canUseAccounts) {
    return (
      <Screen back onBack={goBack} edges={ALL_EDGES} title="Account editor">
        <EmptyState
          icon={<Ionicons name="lock-closed-outline" size={48} color={colors.textFaint} />}
          title="Accounts disabled"
          subtitle="Your remote access link does not have permission to manage accounts."
        />
      </Screen>
    );
  }

  return (
    <Screen
      back
      onBack={goBack}
      edges={ALL_EDGES}
      title={existing ? "Edit alt" : "Add alt"}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <Card style={styles.form}>
            <Field label="Minecraft username">
              <TextInput
                value={draft.username}
                onChangeText={(value) => update("username", value)}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="Username"
                placeholderTextColor={colors.textFaint}
                style={styles.input}
              />
            </Field>
            {!onlineMode ? <Field
              label={`${jndata?.data?.[profileKey ?? ""]?.name ?? "Server"} password`}
            >
              <TextInput
                value={draft.password}
                onChangeText={(value) => update("password", value)}
                secureTextEntry
                autoCapitalize="none"
                placeholder="Optional"
                placeholderTextColor={colors.textFaint}
                style={styles.input}
              />
            </Field> : null}
            {!onlineMode && <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Txt variant="heading">Premium account</Txt>
                <Txt variant="muted">Use a Microsoft account</Txt>
              </View>
              <Switch
                value={draft.premium}
                onValueChange={(value) => update("premium", value)}
                trackColor={{ false: colors.surfaceAlt, true: colors.primary }}
              />
            </View>}
            {existing?.data.premium ? (
              <View style={{ gap: spacing.xs }}>
                <Button
                  title="Log out of Microsoft"
                  variant="ghost"
                  small
                  loading={loggingOut}
                  disabled={!client || saving}
                  onPress={() => void logoutMicrosoft()}
                />
                <Txt variant="muted">You’ll need to sign in again next time you join.</Txt>
              </View>
            ) : null}
          </Card>

          {gamemodes.length > 0 ? (
            <Txt variant="label" style={{ marginTop: spacing.lg }}>
              Ranks & GKits (optional)
            </Txt>
          ) : null}
          {gamemodes.map(([gamemode, raw]) => {
            const config = raw as {
              ranks?: Record<string, { color?: string }>;
              gkits?: Record<string, unknown>;
            };
            const key = gamemode.toLowerCase();
            const rank = draft.ranks[key];
            const selectedGkits = draft.gkits[key] ?? [];
            const rankOptions = Object.keys(config.ranks ?? {}).map((name) => ({
              label: name,
              value: name,
            }));
            const gkitOptions = Object.keys(config.gkits ?? {}).map((name) => ({
              label: name,
              value: name,
            }));
            const gamemodeTitle = gamemode.replace(/_/g, " ");
            return (
              <Card key={gamemode} style={styles.gamemode}>
                <Txt variant="heading">{gamemodeTitle}</Txt>
                <Field label="Rank">
                  <PickerField
                    title={`${gamemodeTitle} rank`}
                    options={rankOptions}
                    value={rank || undefined}
                    clearable
                    placeholder={
                      rankOptions.length ? "No rank" : "No ranks available"
                    }
                    onChange={(value) =>
                      setDraft((current) => ({
                        ...current,
                        ranks: {
                          ...current.ranks,
                          [key]: typeof value === "string" ? value : "",
                        },
                      }))
                    }
                  />
                </Field>
                <Field label="GKits">
                  <PickerField
                    title={`${gamemodeTitle} GKits`}
                    options={gkitOptions}
                    value={selectedGkits}
                    multiple
                    clearable
                    placeholder={
                      gkitOptions.length ? "Choose GKits" : "No GKits available"
                    }
                    onChange={(value) =>
                      setDraft((current) => ({
                        ...current,
                        gkits: {
                          ...current.gkits,
                          [key]: Array.isArray(value)
                            ? (value as string[])
                            : [],
                        },
                      }))
                    }
                  />
                </Field>
              </Card>
            );
          })}
          {error ? (
            <View style={styles.error}>
              <Txt variant="muted" style={{ color: colors.danger }}>
                {error}
              </Txt>
            </View>
          ) : null}
        </ScrollView>
        <View style={styles.actions}>
          {existing ? (
            <Button
              title="Remove"
              variant="danger"
              style={{ flex: 1 }}
              onPress={remove}
            />
          ) : null}
          <Button
            title={existing ? "Save changes" : "Add alt"}
            loading={saving}
            style={{ flex: 1 }}
            onPress={() => void save()}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Txt variant="muted">{label}</Txt>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: spacing.lg, gap: spacing.md },
  form: { gap: spacing.md },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: colors.text,
    backgroundColor: colors.surfaceAlt,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingTop: spacing.sm,
  },
  gamemode: { gap: spacing.md },
  error: {
    padding: spacing.md,
    backgroundColor: colors.dangerSoft,
    borderRadius: radii.md,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    backgroundColor: colors.bg,
  },
});
