import React, { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SearchField } from "../../../src/components/SearchField";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Screen } from "../../../src/components/Screen";
import { BotCard } from "../../../src/components/cards";
import { Button, EmptyState, Txt } from "../../../src/components/ui";
import { PickerField, type Choice } from "../../../src/components/PickerField";
import { useClient } from "../../../src/net/ConnectionProvider";
import { useCommands } from "../../../src/hooks/useCommands";
import { SwipeAction } from "../../../src/components/SwipeAction";
import {
  selectCanUseAccounts,
  selectCanUseActiveBots,
  selectCanUseScripts,
  useStore,
} from "../../../src/store/store";
import { useMonetization } from "../../../src/monetization/MonetizationProvider";
import { colors, radii, spacing } from "../../../src/theme/theme";
import { ActiveBotDrawer } from "../../../src/components/dashboard/ActiveBotDrawer";
import { ActiveScriptDrawer } from "../../../src/components/dashboard/ActiveScriptDrawer";
import type { ActiveBot, ActiveScript } from "../../../src/store/types";

const EMPTY_VERSIONS: string[] = [];
const EMPTY_CHAT_SETTINGS: Record<string, unknown> = {};
export default function Bots() {
  const router = useRouter();
  const params = useLocalSearchParams<{ join?: string; username?: string }>();
  const client = useClient();
  const commands = useCommands();
  const { executeWithMonetization } = useMonetization();
  const profileReady = useStore((s) => s.profileReady);
  const activeBots = useStore((s) => s.activeBots);
  const alts = useStore((s) => s.alts);
  const jndata = useStore((s) => s.JNdata);
  const versions = jndata?.versions ?? EMPTY_VERSIONS;
  const chatSettings = useStore(
    (s) => s.settings.scripts?.chat ?? EMPTY_CHAT_SETTINGS,
  );
  const canUseActiveBots = useStore(selectCanUseActiveBots);
  const canUseScripts = useStore(selectCanUseScripts);
  const canUseAccounts = useStore(selectCanUseAccounts);
  const canJoin = canUseScripts && canUseAccounts && useStore((s) => s.capabilities.includes("scripts"));
  const [query, setQuery] = useState("");
  const [joining, setJoining] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [selectedBot, setSelectedBot] = useState<ActiveBot | null>(null);
  const [selectedScript, setSelectedScript] = useState<ActiveScript | null>(null);
  const [username, setUsername] = useState(String(chatSettings.username ?? ""));
  const [version, setVersion] = useState(
    String(
      chatSettings.version ??
      (versions.includes("1.8.9") ? "1.8.9" : versions[0] ?? ""),
    ),
  );
  const [error, setError] = useState<string | null>(null);
  const bots = useMemo(
    () =>
      activeBots.filter(
        (bot) =>
        (!query ||
          `${bot.username} ${bot.SCRIPT_NAME}`
            .toLowerCase()
            .includes(query.toLowerCase())),
      ),
    [activeBots, query],
  );
  const altOptions = useMemo<Choice[]>(
    () =>
      alts.map((alt) => ({
        label: alt.username,
        value: alt.username,
        description: alt.data.premium ? "Premium" : "Offline",
      })),
    [alts],
  );
  const versionOptions = useMemo<Choice[]>(
    () =>
      versions.map((ver) => ({
        label: ver,
        value: ver,
      })),
    [versions],
  );
  useEffect(() => {
    if (params.join !== "1") return;
    if (params.username) setUsername(params.username);
    setShowJoin(true);
    router.setParams({ join: undefined, username: undefined });
  }, [params.join, params.username, router]);
  const startJoin = async () => {
    if (!client || !profileReady || !username.trim() || !version || joining)
      return;
    setJoining(true);
    setError(null);
    try {
      await executeWithMonetization("bot_join", () =>
        client.joinBot(username, version),
      );
      setShowJoin(false);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not start this bot.",
      );
    } finally {
      setJoining(false);
    }
  };
  if (!canUseActiveBots) {
    return (
      <Screen title="Bots" subtitle="Active bots">
        <EmptyState
          icon={<Ionicons name="lock-closed-outline" size={32} color={colors.textFaint} />}
          title="Active Bots Disabled"
          subtitle="Your access link does not have permission to view or control active bots."
        />
      </Screen>
    );
  }

  return (
    <Screen
      title="Bots"
      subtitle={`${activeBots.length} bot${activeBots.length === 1 ? '' : 's'} in this profile`}
      right={
        canJoin && profileReady ? (
          <Button title="Join bot" small onPress={() => setShowJoin(true)} />
        ) : undefined
      }
    >
      <SearchField value={query} onChangeText={setQuery} placeholder="Search bots" style={styles.search} />
      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        data={bots}
        keyExtractor={(bot) => String(bot.botId)}
        contentContainerStyle={styles.list}
        initialNumToRender={12}
        maxToRenderPerBatch={18}
        windowSize={11}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        renderItem={({ item }) => (
          <SwipeAction
            label="Disconnect"
            sf="power"
            material="power-settings-new"
            enabled={!!commands && item.status === "connected" && item.origin !== "minecraft"}
            onPress={() => void commands?.botAction(item, "leave")}
            containerStyle={styles.swipeCard}
          >
            <BotCard
              bot={item}
              onPress={
                item.status === "connected" &&
                  item.origin !== "minecraft" &&
                  typeof item.MESSAGE_ADDRESS === "number"
                  ? () => setSelectedBot(item)
                  : undefined
              }
            />
          </SwipeAction>
        )}
        ListEmptyComponent={
          <EmptyState
            icon={
              <Ionicons
                name="people-outline"
                size={42}
                color={colors.textFaint}
              />
            }
            title={query ? "No matching bots" : "No bots yet"}
            subtitle={query ? "Try a different search." : "Join with an account to see it here."}
          />
        }
      />
      <Modal
        visible={showJoin}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowJoin(false)}
      >
        <SafeAreaView style={styles.sheetSafeArea}>
          <KeyboardAvoidingView style={styles.sheet} behavior={Platform.OS === "ios" ? "padding" : "height"}>
            <View style={styles.sheetHeader}>
              <Txt variant="heading">Join bot</Txt>
              <Pressable accessibilityRole="button" accessibilityLabel="Close" hitSlop={12} onPress={() => setShowJoin(false)}>
                <Ionicons name="close" size={25} color={colors.text} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.joinContent} keyboardShouldPersistTaps="handled">
              <Txt variant="label">Minecraft account</Txt>
              <PickerField
                title="Minecraft account"
                placeholder={
                  altOptions.length
                    ? "Choose Minecraft account"
                    : "No accounts available"
                }
                options={altOptions}
                value={username}
                freeSolo
                clearable
                onChange={(next) =>
                  setUsername(typeof next === "string" ? next : "")
                }
              />
              <Txt variant="label" style={{ marginTop: spacing.md }}>
                Minecraft version
              </Txt>
              <PickerField
                title="Minecraft version"
                placeholder={
                  versionOptions.length
                    ? "Choose version"
                    : "No versions available"
                }
                options={versionOptions}
                value={version}
                clearable
                onChange={(next) =>
                  setVersion(typeof next === "string" ? next : "")
                }
              />
              {error ? (
                <View style={styles.error}>
                  <Txt style={{ color: colors.danger }}>{error}</Txt>
                </View>
              ) : null}
            </ScrollView>
            <View style={styles.joinFooter}>
              <Button
                title={joining ? "Joining…" : "Start bot"}
                onPress={() => void startJoin()}
                disabled={!username.trim() || !version || joining}
              />
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
      <ActiveBotDrawer
        bot={selectedBot}
        visible={!!selectedBot}
        onClose={() => setSelectedBot(null)}
        onOpenScript={(script) => {
          setSelectedBot(null);
          setSelectedScript(script);
        }}
      />
      <ActiveScriptDrawer
        script={selectedScript}
        visible={!!selectedScript}
        onClose={() => setSelectedScript(null)}
        onSelectBot={(bot) => {
          setSelectedScript(null);
          setSelectedBot(bot);
        }}
      />
    </Screen>
  );
}
const styles = StyleSheet.create({
  swipeCard: { borderRadius: radii.lg, borderCurve: "continuous", overflow: "hidden" },
  search: { marginHorizontal: spacing.lg },
  list: { padding: spacing.lg, paddingBottom: spacing.xxl },
  sheet: {
    flex: 1,
    padding: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.bg,
  },
  sheetSafeArea: { flex: 1, backgroundColor: colors.bg },
  joinContent: { paddingBottom: spacing.lg, gap: spacing.sm },
  joinFooter: { paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderSubtle },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.md,
  },
  error: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.dangerSoft,
  },
});
