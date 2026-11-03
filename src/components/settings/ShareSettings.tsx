import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Button, Txt } from "../ui";
import { SettingsToggle } from "./SettingsFields";
import { useAsyncAction } from "../../hooks/useAsyncAction";
import { useConnection } from "../../net/ConnectionProvider";
import { useStore } from "../../store/store";
import { useOpenShareLink, useShareActions, useShares } from "../../features/shares";
import { SHARE_KIND_LABELS, shareStatusLabel } from "../../generated/client-contract/share";
import { colors, radii, spacing } from "../../theme/theme";

type Identity = { status: string; name?: string; fingerprint?: string; message?: string };

/** Publisher name that signs this phone's shares, and every share it published. */
export function ShareSettings() {
  const { run: runShare, refresh } = useShareActions();
  const openShareLink = useOpenShareLink();
  const { client } = useConnection();
  const autoUpdate = useStore((state) => (state.appSettings as { autoUpdateShares?: boolean }).autoUpdateShares !== false);
  const owned = useShares((state) => state.owned);
  const { busy, run } = useAsyncAction();
  const [name, setName] = useState("");
  const [fingerprint, setFingerprint] = useState("");

  useEffect(() => {
    void refresh().catch(() => {});
    runShare<Identity>("GET_PUBLISHER_IDENTITY")
      .then((identity) => {
        setName(identity.name ?? "");
        setFingerprint(identity.fingerprint ?? "");
      })
      .catch(() => {});
  }, [refresh, runShare]);

  const save = () =>
    run(async () => {
      const result = await runShare<Identity>("SET_PUBLISHER_NAME", name);
      if (result.status !== "success") throw new Error(result.message ?? "Could not save the name.");
      setFingerprint(result.fingerprint ?? "");
    }, "Publisher name saved");

  const shares = Object.values(owned);
  return (
    <View style={{ gap: spacing.md }}>
      <SettingsToggle
        label="Auto-update marketplace items"
        description="Install updates of plugins, bundles and profiles from the marketplace automatically. Items from private links show an Update button instead."
        value={autoUpdate}
        onChange={(value) => void client?.updateAppSettings([{ key: "autoUpdateShares", value }]).catch(() => undefined)}
      />
      <View style={{ gap: spacing.xs }}>
        <Txt variant="label">Publisher name</Txt>
        <TextInput
          value={name}
          onChangeText={setName}
          maxLength={100}
          placeholder="Shown to people you share with"
          placeholderTextColor={colors.textFaint}
          style={styles.input}
        />
        {fingerprint ? (
          <Txt variant="faint" selectable>
            Fingerprint {fingerprint.match(/.{1,4}/g)?.join(" ")}
          </Txt>
        ) : null}
        <Button title="Save name" small loading={busy} disabled={!name.trim()} onPress={() => void save()} />
      </View>
      <View style={{ gap: spacing.xs }}>
        <Txt variant="label">Your shares</Txt>
        {shares.length ? (
          shares.map((share) => (
            <Pressable
              key={share.id}
              accessibilityRole="button"
              onPress={() =>
                openShareLink({
                  kind: share.kind,
                  ref: share.ref,
                  title: share.title,
                  ...(share.profileKey ? { profileKey: share.profileKey } : {}),
                })
              }
              style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceHover }]}
            >
              <View style={{ flex: 1 }}>
                <Txt numberOfLines={1}>{share.title}</Txt>
                <Txt variant="faint">
                  {SHARE_KIND_LABELS[share.kind]} · {shareStatusLabel(share).label}
                </Txt>
                {share.note ? <Txt variant="faint" style={{ color: colors.danger }}>{share.note}</Txt> : null}
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
            </Pressable>
          ))
        ) : (
          <Txt variant="muted">You have not shared anything yet.</Txt>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    padding: spacing.sm,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceAlt,
    color: colors.text,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceAlt,
  },
});
