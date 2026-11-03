import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, Share, StyleSheet, TextInput, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Screen } from "../../src/components/Screen";
import { Badge, Button, EmptyState, Txt } from "../../src/components/ui";
import { useAsyncAction } from "../../src/hooks/useAsyncAction";
import { PUBLISHER_NAME_REQUIRED } from "../../src/runtime/JNbotRuntime";
import { findShare, useShareActions, useShares, type ShareTarget } from "../../src/features/shares";
import {
  SHARE_KIND_LABELS,
  isShareKind,
  shareStatusLabel,
  shareUpdateAvailable,
  shareUrl,
  type OwnedShare,
  type ShareKind,
  type ShareStatusTone,
  type ShareVisibility,
} from "../../src/generated/client-contract/share";
import { colors, radii, spacing } from "../../src/theme/theme";

const TONE_COLORS: Record<ShareStatusTone, { color?: string; bg?: string }> = {
  default: {},
  processing: { color: colors.primary, bg: colors.primarySoft },
  success: { color: colors.success, bg: colors.successSoft },
  warning: { color: colors.warning, bg: colors.warningSoft },
  error: { color: colors.danger, bg: colors.dangerSoft },
};

function VisibilityPicker({ value, onChange }: { value: ShareVisibility; onChange: (value: ShareVisibility) => void }) {
  return (
    <View style={styles.row}>
      {(["link", "public"] as const).map((option) => (
        <Pressable
          key={option}
          accessibilityRole="button"
          accessibilityState={{ selected: value === option }}
          onPress={() => onChange(option)}
          style={[styles.choice, value === option && styles.choiceActive]}
        >
          <Txt variant="label" style={{ color: value === option ? colors.primary : colors.textMuted }}>
            {option === "link" ? "Private link" : "Marketplace"}
          </Txt>
        </Pressable>
      ))}
    </View>
  );
}

function VisibilityHelp({ kind, visibility }: { kind: ShareKind; visibility: ShareVisibility }) {
  const appVersion = useShares((state) => state.appVersion);
  const label = SHARE_KIND_LABELS[kind].toLowerCase();
  return (
    <Txt variant="muted">
      {visibility === "link"
        ? `Only people you send the link to can see and install this ${label}.`
        : `Everyone can find this ${label} on the marketplace once the JNbot team has reviewed it. Updates are reviewed too; the approved version stays live in the meantime.`}{" "}
      It is signed with your publisher name and needs JNbot {appVersion} or newer.
    </Txt>
  );
}

/** Asks for the publisher name that signs links, when this phone has none yet. */
function PublisherNameForm({ onSaved }: { onSaved: () => void }) {
  const { run: runShare } = useShareActions();
  const { busy, run } = useAsyncAction();
  const [name, setName] = useState("");
  return (
    <View style={{ gap: spacing.sm }}>
      <Txt variant="muted">Choose the name others see when you share something.</Txt>
      <TextInput
        value={name}
        onChangeText={setName}
        maxLength={100}
        placeholder="Publisher name"
        placeholderTextColor={colors.textFaint}
        style={styles.input}
      />
      <Button
        title="Save and continue"
        full
        loading={busy}
        disabled={!name.trim()}
        onPress={() =>
          void run(async () => {
            const result = await runShare<{ status: string; message?: string }>("SET_PUBLISHER_NAME", name);
            if (result.status !== "success") throw new Error(result.message ?? "Could not save the name.");
            onSaved();
          })
        }
      />
    </View>
  );
}

function PublishedShare({ share, visibility }: { share: OwnedShare; visibility: ShareVisibility }) {
  const router = useRouter();
  const { run: runShare } = useShareActions();
  const { busy, run } = useAsyncAction();
  const url = shareUrl(share.id);
  const [changes, setChanges] = useState<boolean | "deleted" | undefined>();
  const status = shareStatusLabel(share);
  const isPublic = share.visibility === "public";

  useEffect(() => {
    runShare<boolean | "deleted">("SHARE_HAS_CHANGES", share.id)
      .then(setChanges)
      .catch(() => setChanges(false));
  }, [runShare, share.id, share.revision]);

  return (
    <View style={{ gap: spacing.sm }}>
      <Txt selectable style={styles.link}>{url}</Txt>
      <View style={styles.row}>
        <Button title="Share" style={{ flex: 1 }} onPress={() => void Share.share({ message: url })} />
        <Button
          title="Copy"
          variant="secondary"
          style={{ flex: 1 }}
          onPress={() => void run(() => Clipboard.setStringAsync(url), "Link copied")}
        />
      </View>
      <View style={[styles.row, { alignItems: "center" }]}>
        <Badge label={status.label} {...TONE_COLORS[status.tone]} />
        <Txt variant="faint">Last published {new Date(share.updatedAt).toLocaleString()}</Txt>
      </View>
      {share.note ? <Txt style={{ color: colors.danger }}>Review note: {share.note}</Txt> : null}
      {visibility !== share.visibility ? (
        <Button
          title={visibility === "public" ? "Submit for review" : "Remove from marketplace"}
          variant={visibility === "public" ? "primary" : "secondary"}
          full
          loading={busy}
          disabled={changes === "deleted"}
          onPress={() =>
            void run(
              () => runShare("SHARE_VISIBILITY", { id: share.id, visibility }),
              visibility === "public" ? "Submitted for review" : "Removed from the marketplace",
            )
          }
        />
      ) : (
        <>
          <Txt variant="muted">
            {changes === undefined
              ? "Checking for changes…"
              : changes === "deleted"
                ? "You deleted the original, so this share can no longer be updated. You can still delete it."
                : changes
                  ? "You changed this since the last publish."
                  : "The share has your latest version."}
          </Txt>
          <Button
            title={isPublic ? "Submit update" : "Publish update"}
            variant="secondary"
            full
            loading={busy}
            disabled={changes !== true}
            onPress={() =>
              void run(() => runShare("SHARE_UPDATE", share.id), isPublic ? "Update submitted for review" : "Share updated")
            }
          />
        </>
      )}
      <Button
        title="Delete share"
        variant="danger"
        full
        disabled={busy}
        onPress={() =>
          void run(async () => {
            await runShare("SHARE_DELETE", share.id);
            router.back();
          }, "Share deleted")
        }
      />
    </View>
  );
}

function NewShare({ target, visibility }: { target: ShareTarget; visibility: ShareVisibility }) {
  const { run: runShare } = useShareActions();
  const { busy, run } = useAsyncAction();
  const [needsName, setNeedsName] = useState(false);
  const { title: _title, ...input } = target;

  const create = () =>
    run(async () => {
      try {
        await runShare("SHARE_CREATE", { ...input, visibility });
      } catch (error) {
        if (error instanceof Error && error.message === PUBLISHER_NAME_REQUIRED) setNeedsName(true);
        else throw error;
      }
    });

  if (needsName) {
    return (
      <PublisherNameForm
        onSaved={() => {
          setNeedsName(false);
          void create();
        }}
      />
    );
  }
  return (
    <Button
      title={visibility === "public" ? "Submit for review" : "Create link"}
      full
      loading={busy}
      onPress={() => void create()}
    />
  );
}

/** Create, share, update or delete the link of one item (route params = {@link ShareTarget}). */
export default function ShareLinkScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<Record<keyof ShareTarget, string>>();
  const { local, refresh } = useShareActions();
  const target: ShareTarget | null =
    isShareKind(params.kind) && params.ref
      ? { kind: params.kind, ref: params.ref, title: params.title ?? params.ref, ...(params.profileKey ? { profileKey: params.profileKey } : {}) }
      : null;
  const owned = useShares((state) =>
    target
      ? findShare(state.owned, target.kind, (share) => share.ref === target.ref && share.profileKey === target.profileKey)
      : undefined,
  );
  const appVersion = useShares((state) => state.appVersion);
  const installed = useShares((state) =>
    target ? findShare(state.installed, target.kind, (share) => share.localRef === target.ref) : undefined,
  );

  const [visibility, setVisibility] = useState<ShareVisibility>("link");

  useEffect(() => {
    void refresh().catch(() => {});
  }, [refresh]);
  useEffect(() => {
    if (owned) setVisibility(owned.visibility);
  }, [owned?.visibility]);

  if (!target || !local) {
    return (
      <Screen title="Share" back>
        <EmptyState
          title="Cannot share this here"
          subtitle="Shares are created on the device that has the plugins and profiles. Switch to this phone first."
        />
      </Screen>
    );
  }

  return (
    <Screen title={`Share ${target.title}`} subtitle={SHARE_KIND_LABELS[target.kind]} back>
      <ScrollView contentContainerStyle={styles.content}>
        {installed && shareUpdateAvailable(installed, appVersion) ? (
          <Button
            title={`Review update from ${installed.ownerName}`}
            variant="secondary"
            full
            onPress={() => router.push({ pathname: "/(app)/share/[id]", params: { id: installed.id } })}
          />
        ) : null}
        <VisibilityPicker value={visibility} onChange={setVisibility} />
        <VisibilityHelp kind={target.kind} visibility={visibility} />
        {owned ? (
          <PublishedShare share={owned} visibility={visibility} />
        ) : (
          <NewShare target={target} visibility={visibility} />
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  row: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  link: {
    padding: spacing.sm,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceAlt,
    color: colors.text,
  },
  choice: {
    flex: 1,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.md,
    backgroundColor: colors.surfaceAlt,
  },
  choiceActive: {
    backgroundColor: colors.primarySoft,
  },
  input: {
    padding: spacing.sm,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceAlt,
    color: colors.text,
  },
});
