import React, { useState } from "react";
import { Redirect } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Screen } from "../../src/components/Screen";
import { ActiveScriptCard } from "../../src/components/cards";
import {
  Badge,
  Button,
  EmptyState,
  PressableCard,
  SectionHeader,
  Txt,
} from "../../src/components/ui";
import { useCommands } from "../../src/hooks/useCommands";
import { useClient } from "../../src/net/ConnectionProvider";
import { isBotAssignedToScript, useStore } from "../../src/store/store";
import type { MacroInfo } from "../../src/store/types";
import { colors, radii, spacing } from "../../src/theme/theme";
import { useProfileScriptInfos } from "../../src/hooks/useProfileScriptInfos";

export function LegacyScripts() {
  const commands = useCommands();
  const client = useClient();
  const [tab, setTab] = useState<"available" | "running">("available");
  const activeScripts = useStore((state) => state.activeScripts);
  const activeBots = useStore((state) => state.activeBots);
  const available = useProfileScriptInfos();
  const running = Object.values(activeScripts);
  const runProfileScript = async (script: unknown) => {
    if (!client || !commands) return;
    const resolved = await client.profileAction<{
      info?: MacroInfo;
      error?: string;
    }>("RESOLVE_PROFILE_SCRIPT_INFO", script);
    if (!resolved.info)
      throw new Error(
        resolved.error ?? "The desktop could not resolve this profile script.",
      );
    await commands.runPlugin(resolved.info);
  };
  return (
    <Screen
      title="Scripts"
      subtitle={
        tab === "available"
          ? `${available.length} available`
          : `${running.length} running`
      }
    >
      <View style={styles.tabs}>
        {(["available", "running"] as const).map((item) => (
          <Pressable
            key={item}
            onPress={() => setTab(item)}
            style={[styles.tab, tab === item && styles.activeTab]}
          >
            <Txt
              variant="body"
              style={{
                color: tab === item ? colors.text : colors.textMuted,
                fontWeight: tab === item ? "600" : "400",
              }}
            >
              {item === "available" ? "Available" : "Running"}
            </Txt>
          </Pressable>
        ))}
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        {tab === "available" ? (
          <>
            <Txt variant="muted" style={{ marginBottom: spacing.md }}>
              Profile scripts are resolved and executed by your desktop JNbot.
            </Txt>
            {available.length ? (
              <View style={{ gap: spacing.md }}>
                {available.map((script) => (
                  <PressableCard
                    key={script.id}
                    style={styles.script}
                    onPress={() => void runProfileScript(script)}
                  >
                    <View style={styles.icon}>
                      <Ionicons name="flash" size={19} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1, gap: 3 }}>
                      <Txt variant="heading" numberOfLines={1}>
                        {script.name}
                      </Txt>
                      <Txt variant="muted" numberOfLines={2}>
                        {script.description ||
                          "Tap to run with its saved desktop configuration."}
                      </Txt>
                      <Badge
                        label={
                          script.source?.kind === "url"
                            ? "Remote source"
                            : "Profile script"
                        }
                      />
                    </View>
                    <Ionicons name="play" color={colors.primary} size={19} />
                  </PressableCard>
                ))}
              </View>
            ) : (
              <EmptyState
                title="No profile scripts"
                subtitle="This profile does not expose any runnable scripts."
              />
            )}
          </>
        ) : (
          <>
            {running.length ? (
              <View style={{ gap: spacing.md }}>
                {running.map((script) => (
                  <ActiveScriptCard
                    key={script.instanceId}
                    script={script}
                    botCount={
                      activeBots.filter((bot) =>
                        isBotAssignedToScript(bot, script),
                      ).length
                    }
                    onControl={(control) =>
                      commands?.sendControl(script.instanceId, control)
                    }
                    onStop={() => commands?.stopScript(script.instanceId)}
                    onRestart={() => commands?.restartScript(script.instanceId)}
                  />
                ))}
              </View>
            ) : (
              <EmptyState
                icon={
                  <Ionicons
                    name="flash-outline"
                    size={42}
                    color={colors.textFaint}
                  />
                }
                title="No scripts running"
                subtitle="Run a profile script or installed plugin to see it here."
              />
            )}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
export default function ScriptsRedirect() {
  return <Redirect href="/(app)/automation" />;
}
const styles = StyleSheet.create({
  tabs: {
    flexDirection: "row",
    marginHorizontal: spacing.lg,
    padding: 4,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 9,
    borderRadius: radii.sm,
  },
  activeTab: { backgroundColor: colors.surfaceAlt },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  script: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
  },
  icon: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
  },
});
