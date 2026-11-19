import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useClient } from "../net/ConnectionProvider";
import { actions, type ScriptUiRequest, useStore } from "../store/store";
import {
  buildAltUpdateReview,
  buildApprovedAltUpdates,
  defaultApprovedFieldIds,
} from "../features/altUpdateRequests";
import { scriptUiResponse } from "../features/scriptUiResponses";
import { Badge, Button, Card, EmptyState, Txt } from "./ui";
import { ToastViewport } from "./ToastViewport";
import { openNotificationButton } from "../notifications/notificationButtons";
import { MicrosoftLoginModal } from "./MicrosoftLoginModal";
import { colors, font, radii, spacing } from "../theme/theme";

type FeedbackContextValue = {
  openNotifications: () => void;
  showMessage: (
    title: string,
    type?: "success" | "error" | "warning" | "info",
  ) => void;
};

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

export function AppFeedbackProvider({ children }: { children: React.ReactNode }) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const value = useMemo<FeedbackContextValue>(
    () => ({
      openNotifications: () => setNotificationsOpen(true),
      showMessage: (title, type = "info") =>
        actions.enqueueToast({
          id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          title,
          type,
        }),
    }),
    [],
  );
  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <ToastViewport />
      <OptionErrorNavigator />
      <ScriptRequestModal />
      <MicrosoftLoginModal />
      <NotificationCenter
        visible={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
      />
    </FeedbackContext.Provider>
  );
}

function OptionErrorNavigator() {
  const router = useRouter();
  const errors = useStore((state) => state.optionErrors);
  const lastOpened = React.useRef<string | null>(null);
  useEffect(() => {
    const pluginId = Object.keys(errors).find(
      (id) => Object.keys(errors[id] ?? {}).length > 0,
    );
    if (!pluginId) {
      lastOpened.current = null;
      return;
    }
    if (lastOpened.current === pluginId) return;
    lastOpened.current = pluginId;
    router.push({
      pathname: "/(app)/automation",
      params: { scriptId: pluginId, source: "option-error" },
    });
  }, [errors, router]);
  return null;
}

export function useFeedback() {
  const value = useContext(FeedbackContext);
  if (!value)
    throw new Error("useFeedback must be used inside AppFeedbackProvider.");
  return value;
}


function NotificationCenter({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const notifications = useStore((state) => state.notifications);
  const router = useRouter();
  useEffect(() => {
    if (visible) actions.clearUnread();
  }, [visible]);
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.sheetSafe}>
        <SheetHeader
          title="Notifications"
          subtitle={`${notifications.length} this session`}
          onClose={onClose}
          right={
            notifications.length ? (
              <Button
                title="Clear"
                small
                variant="ghost"
                onPress={actions.clearNotifications}
              />
            ) : undefined
          }
        />
        <ScrollView contentContainerStyle={styles.notificationList}>
          {notifications.length ? (
            notifications.map((item) => {
              const meta = severityMeta(item.type);
              return (
                <Card key={item.id} style={styles.notificationCard}>
                  <View
                    style={[styles.noticeIcon, { backgroundColor: meta.soft }]}
                  >
                    <Ionicons name={meta.icon} size={20} color={meta.color} />
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Txt variant="heading">{item.title}</Txt>
                    {item.message ? (
                      <Txt variant="muted">{item.message}</Txt>
                    ) : null}
                    {item.buttons?.length ? (
                      <View style={styles.noticeButtons}>
                        {item.buttons.map((button) => (
                          <Button
                            key={button.label}
                            title={button.label}
                            small
                            variant="secondary"
                            onPress={() => {
                              onClose();
                              openNotificationButton(router, button);
                            }}
                          />
                        ))}
                      </View>
                    ) : null}
                    <Txt variant="faint">
                      {new Date(item.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Txt>
                  </View>
                  <Pressable
                    accessibilityLabel={`Remove ${item.title}`}
                    hitSlop={10}
                    onPress={() => actions.removeNotification(item.id)}
                  >
                    <Ionicons name="close" size={18} color={colors.textFaint} />
                  </Pressable>
                </Card>
              );
            })
          ) : (
            <EmptyState
              icon={
                <Ionicons
                  name="notifications-outline"
                  size={42}
                  color={colors.textFaint}
                />
              }
              title="No notifications"
              subtitle="Script and bot notifications from this session appear here."
            />
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function ScriptRequestModal() {
  const request = useStore((state) => state.uiRequests[0]);
  if (!request) return null;
  if (request.kind === "alt-update")
    return <AltUpdateReview request={request} />;
  return <InteractiveRequest request={request} />;
}

function InteractiveRequest({ request }: { request: ScriptUiRequest }) {
  const client = useClient();
  const [value, setValue] = useState("");
  useEffect(() => {
    setValue(request.kind === "prompt" ? request.data.defaultValue ?? "" : "");
  }, [request.id, request.kind]);

  if (request.kind === "alt-update") return null;
  const dismiss = () => actions.dismissUiRequest(request.kind, request.id);
  const respond = (response: string | null, cancel = false) => {
    if (!client) return;
    const packet = scriptUiResponse(request, response, value, cancel);
    client.sendToAddress(packet.event, packet.address, packet.data);
    dismiss();
  };
  const title = request.data.title || "Script request";
  const body =
    request.kind === "prompt"
      ? request.data.description
      : request.data.body;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => respond(null, true)}>
      <KeyboardAvoidingView
        style={styles.modalBackdrop}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Card style={styles.requestCard}>
          <View style={styles.requestTitleRow}>
            <View style={styles.requestIcon}>
              <Ionicons
                name={request.kind === "prompt" ? "create-outline" : "help-circle-outline"}
                size={22}
                color={colors.primary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Txt variant="heading">{title}</Txt>
              {body ? <Txt variant="muted">{body}</Txt> : null}
            </View>
          </View>
          {request.kind === "prompt" ? (
            <View style={{ gap: spacing.sm }}>
              {request.data.image ? (
                <Image source={{ uri: request.data.image }} style={styles.requestImage} />
              ) : null}
              {request.data.label ? <Txt variant="label">{request.data.label}</Txt> : null}
              <TextInput
                autoFocus
                value={value}
                onChangeText={setValue}
                onSubmitEditing={() => respond(value)}
                placeholder={request.data.placeholder}
                placeholderTextColor={colors.textFaint}
                style={styles.requestInput}
              />
              <View style={styles.modalActions}>
                <Button title="Cancel" variant="ghost" onPress={() => respond(null, true)} />
                <Button title="Submit" onPress={() => respond(value)} />
              </View>
            </View>
          ) : (
            <View style={styles.dialogButtons}>
              {(request.data.buttons ?? []).map((button) => {
                const label = button.label;
                const response =
                  request.kind === "buttons" && "id" in button
                    ? button.id
                    : label;
                const primary = "type" in button && button.type === "primary";
                return (
                  <Button
                    key={response}
                    title={label}
                    variant={primary ? "primary" : "secondary"}
                    full
                    onPress={() => respond(response)}
                  />
                );
              })}
              <Button title="Dismiss" variant="ghost" full onPress={() => respond(null, true)} />
            </View>
          )}
        </Card>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function AltUpdateReview({
  request,
}: {
  request: Extract<ScriptUiRequest, { kind: "alt-update" }>;
}) {
  const client = useClient();
  const alts = useStore((state) => state.alts);
  const jndata = useStore((state) => state.JNdata);
  const profileKey = useStore((state) => state.activeProfileKey);
  const rows = useMemo(
    () => buildAltUpdateReview(request.data, alts, jndata, profileKey),
    [alts, jndata, profileKey, request.data],
  );
  const [approved, setApproved] = useState<Set<string>>(
    () => defaultApprovedFieldIds(rows),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setApproved(defaultApprovedFieldIds(rows));
    setError(null);
  }, [request.id]);
  const groups = useMemo(
    () =>
      Object.entries(
        rows.reduce<Record<string, typeof rows>>((output, row) => {
          (output[row.username] ??= []).push(row);
          return output;
        }, {}),
      ),
    [rows],
  );
  const close = () => actions.dismissUiRequest(request.kind, request.id);
  const apply = async () => {
    if (!client || busy) return;
    const payload = buildApprovedAltUpdates(request.data, rows, approved);
    const existing = new Set(alts.map((alt) => alt.username.toLowerCase()));
    for (const [username, update] of Object.entries(payload)) {
      if (!existing.has(username.toLowerCase()) && update && !update.password)
        delete payload[username];
    }
    if (!Object.keys(payload).length) return;
    setBusy(true);
    setError(null);
    try {
      await client.applyAltUpdates(payload);
      actions.enqueueToast({
        id: `alt-update-success-${request.id}`,
        title: "Account changes applied.",
        type: "success",
      });
      close();
    } catch (cause) {
      const changed = JSON.stringify(useStore.getState().alts) !== JSON.stringify(alts);
      const message = cause instanceof Error ? cause.message : "Some changes could not be applied.";
      setError(
        changed
          ? `Some account changes were applied. ${message} Unapplied changes remain available for review.`
          : message,
      );
    } finally {
      setBusy(false);
    }
  };
  const pending = rows.filter(
    (row) => approved.has(row.id) && !row.error && !row.noop,
  ).length;
  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
      <SafeAreaView style={styles.sheetSafe}>
        <SheetHeader
          title="Account update request"
          subtitle={request.data.scriptName}
          onClose={close}
        />
        <ScrollView contentContainerStyle={styles.altReviewList}>
          <View style={styles.reviewNotice}>
            <Ionicons name="shield-checkmark-outline" size={20} color={colors.info} />
            <Txt variant="muted" style={{ flex: 1 }}>
              Review every requested change. Passwords remain hidden and invalid fields cannot be selected.
            </Txt>
          </View>
          {groups.length ? (
            groups.map(([username, groupRows]) => (
              <Card key={username} style={{ gap: spacing.sm }}>
                <View style={styles.groupTitle}>
                  <Txt variant="heading" style={{ flex: 1 }}>{username}</Txt>
                  <Badge label={groupRows[0]?.action ?? "update"} />
                </View>
                {groupRows.map((row) => {
                  const disabled = Boolean(row.error || row.noop);
                  const checked = approved.has(row.id) && !disabled;
                  return (
                    <Pressable
                      key={row.id}
                      disabled={disabled}
                      onPress={() =>
                        setApproved((current) => {
                          const next = new Set(current);
                          if (next.has(row.id)) next.delete(row.id);
                          else next.add(row.id);
                          return next;
                        })
                      }
                      style={[styles.reviewRow, disabled && { opacity: 0.5 }]}
                    >
                      <Ionicons
                        name={checked ? "checkbox" : "square-outline"}
                        size={23}
                        color={checked ? colors.primary : colors.textFaint}
                      />
                      <View style={{ flex: 1, gap: 4 }}>
                        <View style={styles.groupTitle}>
                          <Txt style={{ flex: 1 }}>{row.label}</Txt>
                          {row.noop ? <Badge label="No change" /> : null}
                        </View>
                        <Txt variant="muted">{row.current}  →  {row.next}</Txt>
                        {row.error ? (
                          <Txt variant="faint" style={{ color: colors.danger }}>{row.error}</Txt>
                        ) : null}
                      </View>
                    </Pressable>
                  );
                })}
              </Card>
            ))
          ) : (
            <EmptyState title="No changes to apply" />
          )}
          {error ? (
            <View style={[styles.reviewNotice, { backgroundColor: colors.dangerSoft }]}>
              <Ionicons name="alert-circle" size={20} color={colors.danger} />
              <Txt variant="muted" style={{ flex: 1, color: colors.danger }}>{error}</Txt>
            </View>
          ) : null}
        </ScrollView>
        <View style={styles.sheetFooter}>
          <Button title="Discard" variant="danger" style={{ flex: 1 }} onPress={close} />
          <Button
            title={`Apply${pending ? ` (${pending})` : ""}`}
            style={{ flex: 1 }}
            loading={busy}
            disabled={!pending || busy}
            onPress={() => void apply()}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function SheetHeader({
  title,
  subtitle,
  onClose,
  right,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.sheetHeader}>
      <View style={{ flex: 1 }}>
        <Txt variant="heading">{title}</Txt>
        {subtitle ? <Txt variant="muted">{subtitle}</Txt> : null}
      </View>
      {right}
      <Pressable accessibilityLabel="Close" hitSlop={10} onPress={onClose}>
        <Ionicons name="close" size={26} color={colors.text} />
      </Pressable>
    </View>
  );
}

function severityMeta(type: string) {
  if (type === "success")
    return { color: colors.success, soft: colors.successSoft, icon: "checkmark-circle" as const };
  if (type === "error")
    return { color: colors.danger, soft: colors.dangerSoft, icon: "alert-circle" as const };
  if (type === "warning")
    return { color: colors.warning, soft: colors.warningSoft, icon: "warning" as const };
  return { color: colors.info, soft: colors.infoSoft, icon: "information-circle" as const };
}

const styles = StyleSheet.create({
  sheetSafe: { flex: 1, backgroundColor: colors.bg },
  sheetHeader: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderSubtle },
  notificationList: { padding: spacing.lg, gap: spacing.md, flexGrow: 1 },
  notificationCard: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md, padding: spacing.md },
  noticeIcon: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  noticeButtons: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.xs },
  modalBackdrop: { flex: 1, justifyContent: "center", padding: spacing.xl, backgroundColor: colors.overlay },
  requestCard: { width: "100%", maxWidth: 520, alignSelf: "center", gap: spacing.lg, backgroundColor: colors.bgElevated },
  requestTitleRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  requestIcon: { width: 42, height: 42, borderRadius: radii.md, alignItems: "center", justifyContent: "center", backgroundColor: colors.primarySoft },
  requestInput: { minHeight: 48, color: colors.text, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surface, paddingHorizontal: spacing.md, fontSize: font.size.base },
  requestImage: { width: 256, height: 256, alignSelf: "center", borderRadius: radii.md },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: spacing.sm },
  dialogButtons: { gap: spacing.sm },
  altReviewList: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  reviewNotice: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, padding: spacing.md, borderRadius: radii.md, backgroundColor: colors.infoSoft },
  groupTitle: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  reviewRow: { minHeight: 58, flexDirection: "row", alignItems: "flex-start", gap: spacing.md, paddingVertical: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderSubtle },
  sheetFooter: { flexDirection: "row", gap: spacing.md, padding: spacing.lg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderSubtle, backgroundColor: colors.bgElevated },
});
