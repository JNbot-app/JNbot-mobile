import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  View,
} from "react-native";
import { Screen } from '../../src/components/Screen';
import { SearchField } from '../../src/components/SearchField';
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { EmptyState, IconButton, Txt } from "../../src/components/ui";
import { RichText, parseRichText } from "../../src/components/RichText";
import { useClient } from "../../src/net/ConnectionProvider";
import { actions, useStore, type NormalizedLog } from "../../src/store/store";
import { colors, font, radii, spacing } from "../../src/theme/theme";

type Level = "all" | 0 | 1 | 2 | 3;
const levels: Array<{ value: Level; label: string }> = [
  { value: "all", label: "All" },
  { value: 0, label: "Info" },
  { value: 1, label: "Warnings" },
  { value: 2, label: "Errors" },
  { value: 3, label: "Success" },
];

export default function Logs() {
  const router = useRouter();
  const params = useLocalSearchParams<{ scriptId?: string }>();
  const client = useClient();
  const logs = useStore((state) => state.logs);
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState<Level>("all");
  const [scriptId, setScriptId] = useState(params.scriptId ?? "all");
  const [loading, setLoading] = useState(false);
  const scripts = useMemo(() => {
    const seen = new Map<string, string>();
    logs.forEach((entry) => {
      if (entry.scriptId || entry.scriptName)
        seen.set(entry.scriptId || entry.scriptName, entry.scriptName || entry.scriptId);
    });
    return [...seen.entries()];
  }, [logs]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return logs.filter(
      (entry) =>
        (level === "all" || entry.level === level) &&
        (scriptId === "all" || entry.scriptId === scriptId || entry.scriptName === scriptId) &&
        (!needle || `${entry.message} ${entry.scriptName}`.toLowerCase().includes(needle)),
    );
  }, [level, logs, query, scriptId]);
  const refresh = async () => {
    if (!client || loading) return;
    setLoading(true);
    try {
      const snapshot = await client.getLogs();
      actions.setLogs(snapshot?.logs ?? []);
    } catch (error) {
      actions.enqueueToast({
        id: `logs-${Date.now()}`,
        title: error instanceof Error ? error.message : "Could not load logs.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void refresh();
  }, [client]);
  const clear = () => {
    const selectedName =
      scriptId === "all"
        ? undefined
        : scripts.find(([id]) => id === scriptId)?.[1] ?? scriptId;
    Alert.alert(
      selectedName ? `Clear ${selectedName} logs?` : "Clear all logs?",
      "This removes the selected console history from the running profile.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () =>
            void client
              ?.clearLogs(selectedName)
              .then(() => actions.clearLogs(selectedName))
              .catch((error) =>
                actions.enqueueToast({
                  id: `clear-logs-${Date.now()}`,
                  title: error instanceof Error ? error.message : "Could not clear logs.",
                  type: "error",
                }),
              ),
        },
      ],
    );
  };
  const share = () => {
    const text = filtered
      .map((entry) => {
        const time = new Date(entry.timestamp).toLocaleTimeString();
        const message = parseRichText(entry.message).map((chunk) => chunk.content).join("");
        return `[${time}]${entry.scriptName ? ` [${entry.scriptName}]` : ""} ${message}`;
      })
      .join("\n");
    void Share.share({ title: "JNbot console logs", message: text }).catch(() => undefined);
  };
  return (
    <Screen
      back
      title="Console logs"
      subtitle={`${filtered.length} visible · ${logs.length} loaded`}
      right={<>
        <IconButton accessibilityLabel="Share logs" bg="transparent" disabled={!filtered.length} onPress={share}>
          <Ionicons name="share-outline" size={22} color={filtered.length ? colors.text : colors.textFaint} />
        </IconButton>
        <IconButton accessibilityLabel="Clear logs" bg="transparent" onPress={clear}>
          <Ionicons name="trash-outline" size={22} color={colors.danger} />
        </IconButton>
      </>}
    >
      <SearchField value={query} onChangeText={setQuery} placeholder="Search messages or scripts" style={styles.search}>
        <Pressable accessibilityLabel="Refresh logs" hitSlop={10} onPress={() => void refresh()}>
          <Ionicons name="refresh" size={19} color={loading ? colors.primary : colors.textMuted} />
        </Pressable>
      </SearchField>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroller}
        contentContainerStyle={styles.filters}
      >
        {levels.map((item) => <Chip key={String(item.value)} label={item.label} active={level === item.value} onPress={() => setLevel(item.value)} />)}
        {scripts.length ? <View style={styles.filterDivider} /> : null}
        {scripts.length ? <>
          <Chip label="All scripts" active={scriptId === "all"} onPress={() => setScriptId("all")} />
          {scripts.map(([id, name]) => <Chip key={id} label={name || id} active={scriptId === id} onPress={() => setScriptId(id)} />)}
        </> : null}
      </ScrollView>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <LogLine log={item} />}
        ListEmptyComponent={<EmptyState icon={<Ionicons name="terminal-outline" size={42} color={colors.textFaint} />} title="No matching logs" subtitle="Run a script or change the active filters." />}
      />
    </Screen>
  );
}

function LogLine({ log }: { log: NormalizedLog }) {
  const meta = levelMeta(log.level);
  return (
    <View style={styles.logLine}>
      <View style={[styles.levelBar, { backgroundColor: meta.color }]} />
      <View style={{ flex: 1, gap: 4 }}>
        <View style={styles.logMeta}>
          <Txt variant="faint" style={{ color: meta.color }}>{meta.label}</Txt>
          <Txt variant="faint" numberOfLines={1} style={{ flex: 1 }}>{log.scriptName || "JNbot"}</Txt>
          <Txt variant="faint">{new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</Txt>
        </View>
        <RichText selectable style={styles.logText}>{log.message}</RichText>
      </View>
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable hitSlop={6} onPress={onPress} style={[styles.chip, active && styles.activeChip]}>
      <Txt variant="faint" numberOfLines={1} style={[styles.chipText, { color: active ? colors.primaryOn : colors.textMuted }]}>
        {label}
      </Txt>
    </Pressable>
  );
}

const levelMeta = (level: number) =>
  level === 1 ? { label: "WARN", color: colors.warning } : level === 2 ? { label: "ERROR", color: colors.danger } : level === 3 ? { label: "OK", color: colors.success } : { label: "INFO", color: colors.info };

const styles = StyleSheet.create({
  search: { marginHorizontal: spacing.lg },
  filterScroller: { flexGrow: 0, flexShrink: 0 },
  filters: { alignItems: "center", paddingHorizontal: spacing.lg, paddingTop: spacing.xs, paddingBottom: spacing.xs, gap: 5 },
  filterDivider: { width: 1, height: 16, marginHorizontal: 3, backgroundColor: colors.border },
  chip: { height: 26, maxWidth: 140, justifyContent: "center", paddingHorizontal: 8, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.borderSubtle, backgroundColor: colors.surface },
  chipText: { fontSize: 12, fontWeight: "500" },
  activeChip: { borderColor: colors.primary, backgroundColor: colors.primary },
  list: { padding: spacing.lg, paddingBottom: spacing.xxl, flexGrow: 1 },
  logLine: { flexDirection: "row", gap: spacing.sm, paddingVertical: spacing.sm, paddingRight: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderSubtle },
  levelBar: { width: 3, borderRadius: 2 },
  logMeta: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  logText: { color: colors.text, fontSize: font.size.caption, lineHeight: 19, fontFamily: Platform.select({ ios: "Menlo", android: "monospace" }) },
});
