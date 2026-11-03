import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Button, Txt } from "../ui";
import { colors, font, radii, spacing } from "../../theme/theme";
import {
  EmbeddedNodeBridge,
  type StorageStatus,
} from "../../runtime/EmbeddedNodeBridge";

const bridge = new EmbeddedNodeBridge();

export interface DropboxStorageProps {
  onRestart: () => Promise<void>;
  onStatusChange?: (status: StorageStatus | null) => void;
}

/** Local runtime only. The remote connection always uses its host's storage. */
export function DropboxStorage({ onRestart, onStatusChange }: DropboxStorageProps) {
  const [status, setStatus] = useState<StorageStatus | null>(null);
  const [login, setLogin] = useState<{ verifier: string } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const next = await bridge.requestStorage<StorageStatus>("status");
    setStatus(next);
    onStatusChange?.(next);
    return next;
  };

  useEffect(() => {
    void load().catch((reason) =>
      setError(reason instanceof Error ? reason.message : String(reason)),
    );
  }, []);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy(false);
    }
  };

  const switchMode = (mode: "local" | "dropbox", accountId?: string) =>
    run(async () => {
      await bridge.requestStorage("select", { mode, accountId });
      await onRestart();
    });

  const confirmSwitch = (mode: "local" | "dropbox", accountId?: string) => {
    if (Platform.OS === "ios") void Haptics.selectionAsync().catch(() => undefined);
    Alert.alert(
      `Switch to ${mode === "local" ? "Device" : "Dropbox"} storage?`,
      "The two stores are separate. Running bots and scripts will stop while JNbot restarts.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Switch and restart",
          onPress: () => void switchMode(mode, accountId),
        },
      ],
    );
  };

  const beginLogin = () =>
    run(async () => {
      const result = await bridge.requestStorage<{ url: string; verifier: string }>(
        "begin-login",
      );
      setLogin({ verifier: result.verifier });
      await Linking.openURL(result.url);
    });

  const completeLogin = () =>
    run(async () => {
      if (!login) return;
      await bridge.requestStorage("complete-login", {
        code: code.trim(),
        verifier: login.verifier,
      });
      setLogin(null);
      setCode("");
    });

  const confirmTransfer = () => {
    const toDropbox = !isDropboxActive;
    Alert.alert(
      toDropbox ? "Copy device data to Dropbox?" : "Copy Dropbox data to this phone?",
      `This replaces the data in ${toDropbox ? "your Dropbox account" : "Device Storage"} with the data you are currently using. ${toDropbox ? "Dropbox" : "Device"} files that are not in your current data are removed.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Copy",
          onPress: () =>
            void run(async () => {
              await bridge.requestStorage("transfer", { accountId: status?.account?.id });
            }),
        },
      ],
    );
  };

  const confirmDisconnect = (accountId: string) => {
    Alert.alert(
      "Disconnect Dropbox account?",
      "Your Dropbox data will remain safe in your Dropbox account. JNbot will unlink the connection.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: () =>
            void run(async () => {
              await bridge.requestStorage("disconnect", { accountId });
            }),
        },
      ],
    );
  };

  const saveNow = () =>
    run(async () => {
      const result = await bridge.requestStorage<{ lastError?: string }>("flush");
      if (result?.lastError) throw new Error(result.lastError);
    });

  const isLocalActive = status?.mode !== "dropbox";
  const isDropboxActive = status?.mode === "dropbox";
  const hasAccounts = Boolean(status?.accounts && status.accounts.length > 0);
  const displayError = error || status?.writes?.lastError || status?.startupError;

  return (
    <View style={styles.container}>
      <View style={styles.headerBlock}>
        <Txt variant="body" style={styles.headerTitle}>
          Active Storage Location
        </Txt>
        <Txt variant="faint">
          Choose where your live profiles, accounts, and plugins are stored.
        </Txt>
      </View>

      <View style={styles.cardsContainer}>
        {/* Device Storage Card */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Device Storage"
          accessibilityState={{ selected: isLocalActive }}
          onPress={!isLocalActive && !busy ? () => confirmSwitch("local") : undefined}
          style={({ pressed }) => [
            styles.modeCard,
            isLocalActive && styles.modeCardActive,
            !isLocalActive && pressed && styles.modeCardPressed,
          ]}
        >
          <View style={[styles.modeIconBox, isLocalActive && styles.modeIconBoxActive]}>
            <Ionicons
              name="phone-portrait-outline"
              size={20}
              color={isLocalActive ? colors.primary : colors.textMuted}
            />
          </View>
          <View style={styles.grow}>
            <Txt variant="body" style={styles.modeTitle}>
              Device Storage
            </Txt>
            <Txt variant="faint">Stored locally on this phone</Txt>
          </View>
          {isLocalActive ? (
            <View style={styles.activeTag}>
              <Ionicons name="checkmark-circle" size={13} color={colors.online} />
              <Txt variant="faint" style={styles.activeTagText}>
                ACTIVE
              </Txt>
            </View>
          ) : (
            <Button
              title="Use Device"
              variant="secondary"
              small
              disabled={busy}
              onPress={() => confirmSwitch("local")}
            />
          )}
        </Pressable>

        {/* Dropbox Sync Card */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dropbox Sync"
          accessibilityState={{ selected: isDropboxActive }}
          onPress={
            !isDropboxActive && hasAccounts && !busy
              ? () => confirmSwitch("dropbox")
              : undefined
          }
          style={({ pressed }) => [
            styles.modeCard,
            isDropboxActive && styles.modeCardActive,
            !isDropboxActive && hasAccounts && pressed && styles.modeCardPressed,
          ]}
        >
          <View style={[styles.modeIconBox, isDropboxActive && styles.modeIconBoxActive]}>
            <Ionicons
              name="cloud-outline"
              size={20}
              color={isDropboxActive ? colors.primary : colors.textMuted}
            />
          </View>
          <View style={styles.grow}>
            <Txt variant="body" style={styles.modeTitle}>
              Dropbox Sync
            </Txt>
            <Txt variant="faint">Continuous sync across devices</Txt>
          </View>
          {isDropboxActive ? (
            <View style={styles.activeTag}>
              <Ionicons name="checkmark-circle" size={13} color={colors.online} />
              <Txt variant="faint" style={styles.activeTagText}>
                ACTIVE
              </Txt>
            </View>
          ) : hasAccounts ? (
            <Button
              title="Use Dropbox"
              variant="secondary"
              small
              disabled={busy}
              onPress={() => confirmSwitch("dropbox")}
            />
          ) : (
            <Button
              title="Connect"
              variant="secondary"
              small
              loading={busy && !login}
              disabled={busy}
              onPress={() => void beginLogin()}
            />
          )}
        </Pressable>
      </View>

      {/* Dropbox Login Form if auth is in progress */}
      {login ? (
        <View style={styles.loginForm}>
          <Txt variant="body" style={styles.loginTitle}>
            Connect Dropbox
          </Txt>
          <Txt variant="faint">
            Paste the authorization code generated in your browser:
          </Txt>
          <TextInput
            value={code}
            onChangeText={setCode}
            placeholder="Paste authorization code"
            placeholderTextColor={colors.textFaint}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
            onSubmitEditing={() => {
              if (code.trim()) void completeLogin();
            }}
          />
          <View style={styles.loginActions}>
            <Button
              title="Cancel"
              variant="ghost"
              small
              disabled={busy}
              onPress={() => {
                setLogin(null);
                setCode("");
              }}
            />
            <Button
              title="Finish sign-in"
              variant="primary"
              small
              loading={busy}
              disabled={busy || !code.trim()}
              onPress={() => void completeLogin()}
            />
          </View>
        </View>
      ) : null}

      {/* Active Dropbox Status & Actions Bar */}
      {isDropboxActive ? (
        <View style={styles.statusBar}>
          <View style={styles.statusInfo}>
            <View style={styles.statusAccountRow}>
              <Ionicons name="person-circle-outline" size={18} color={colors.textMuted} />
              <Txt variant="body" style={styles.statusAccountText} numberOfLines={1}>
                {status?.account?.name || status?.account?.email || "Connected"}
              </Txt>
            </View>
            <View style={styles.statusSyncRow}>
              {status?.writes?.saving ? (
                <>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Txt variant="faint">Saving changes…</Txt>
                </>
              ) : status?.writes?.lastSavedAt ? (
                <Txt variant="faint">
                  Last synced {new Date(status.writes.lastSavedAt).toLocaleTimeString()}
                </Txt>
              ) : (
                <Txt variant="faint" style={{ color: colors.online }}>
                  Synced with Dropbox
                </Txt>
              )}
            </View>
          </View>
          <Button
            title="Save now"
            variant="secondary"
            small
            loading={busy}
            icon={
              <Ionicons
                name="sync-outline"
                size={13}
                color={colors.text}
                style={{ marginRight: 4 }}
              />
            }
            onPress={() => void saveNow()}
          />
        </View>
      ) : null}

      {hasAccounts ? (
        <View style={styles.statusBar}>
          <Txt variant="faint" style={styles.grow}>
            {isDropboxActive
              ? "Copy your Dropbox data to Device Storage."
              : "Copy your device data to Dropbox."}
          </Txt>
          <Button
            title={isDropboxActive ? "Copy to device" : "Copy to Dropbox"}
            variant="secondary"
            small
            disabled={busy || Boolean(login)}
            onPress={confirmTransfer}
          />
        </View>
      ) : null}

      {/* Connected Accounts */}
      {hasAccounts ? (
        <View style={styles.accountsSection}>
          <View style={styles.accountsHeader}>
            <Txt variant="body" style={styles.accountsTitle}>
              Dropbox accounts
            </Txt>
            {!login ? (
              <Button
                title="Add account"
                variant="secondary"
                small
                disabled={busy}
                icon={
                  <Ionicons
                    name="add"
                    size={14}
                    color={colors.text}
                    style={{ marginRight: 2 }}
                  />
                }
                onPress={() => void beginLogin()}
              />
            ) : null}
          </View>

          <View style={styles.accountsList}>
            {status?.accounts.map((account) => {
              const active = isDropboxActive && status?.account?.id === account.id;
              return (
                <View key={account.id} style={styles.accountRow}>
                  <View style={styles.accountIconBox}>
                    <Ionicons name="person-outline" size={16} color={colors.textMuted} />
                  </View>
                  <View style={styles.grow}>
                    <Txt variant="body" numberOfLines={1} style={styles.accountName}>
                      {account.name || account.email || account.id}
                    </Txt>
                    {account.name && account.email ? (
                      <Txt variant="faint" numberOfLines={1}>
                        {account.email}
                      </Txt>
                    ) : null}
                  </View>
                  {active ? (
                    <View style={styles.activeTag}>
                      <Ionicons name="checkmark-circle" size={13} color={colors.online} />
                      <Txt variant="faint" style={styles.activeTagText}>
                        ACTIVE
                      </Txt>
                    </View>
                  ) : (
                    <View style={styles.accountActions}>
                      <Button
                        title="Use"
                        variant="secondary"
                        small
                        disabled={busy}
                        onPress={() => confirmSwitch("dropbox", account.id)}
                      />
                      <Button
                        title="Unlink"
                        variant="ghost"
                        small
                        disabled={busy}
                        icon={
                          <Ionicons
                            name="trash-outline"
                            size={14}
                            color={colors.danger}
                          />
                        }
                        onPress={() => confirmDisconnect(account.id)}
                      />
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      ) : null}

      {/* Subtle Error Display */}
      {displayError ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
          <Txt variant="muted" style={styles.errorText}>
            {displayError}
          </Txt>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  headerBlock: {
    gap: 4,
  },
  headerTitle: {
    fontSize: font.size.sm,
    fontWeight: "600",
    color: colors.text,
  },
  cardsContainer: {
    gap: spacing.sm,
  },
  modeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  modeCardActive: {
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  modeCardPressed: {
    backgroundColor: colors.surfaceHover,
  },
  modeIconBox: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  modeIconBoxActive: {
    backgroundColor: colors.primarySoft,
  },
  modeTitle: {
    fontWeight: "600",
    marginBottom: 2,
  },
  activeTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radii.sm,
    backgroundColor: colors.successSoft,
  },
  activeTagText: {
    color: colors.online,
    fontWeight: "700",
    fontSize: 11,
    letterSpacing: 0.5,
  },
  loginForm: {
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    gap: spacing.sm,
  },
  loginTitle: {
    fontWeight: "600",
  },
  input: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
    color: colors.text,
    fontSize: font.size.sm,
  },
  loginActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  statusBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  statusInfo: {
    flex: 1,
    gap: 4,
  },
  statusAccountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  statusAccountText: {
    fontWeight: "500",
    fontSize: font.size.caption,
  },
  statusSyncRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  accountsSection: {
    gap: spacing.sm,
  },
  accountsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  accountsTitle: {
    fontWeight: "600",
  },
  accountsList: {
    gap: spacing.xs,
  },
  accountRow: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.bgElevated,
  },
  accountIconBox: {
    width: 30,
    height: 30,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  accountName: {
    fontSize: font.size.sm,
  },
  accountActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.dangerSoft,
  },
  errorText: {
    color: colors.danger,
    flex: 1,
    fontSize: font.size.caption,
  },
  grow: {
    flex: 1,
  },
});
