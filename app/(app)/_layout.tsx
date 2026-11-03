import React, { useEffect, useState } from "react";
import { Stack, useRouter } from "expo-router";
import { useConnection } from "../../src/net/ConnectionProvider";
import { useStore } from "../../src/store/store";
import { colors, useTheme } from "../../src/theme/theme";
import { RemoteReconnectScreen } from "../../src/components/RemoteReconnectScreen";

const REMOTE_RECOVERY_DELAY_MS = 5_000;

export default function AppLayout() {
  useTheme();
  const { ready, hasTarget, mode, status, target } = useConnection();
  const router = useRouter();
  const activeProfileKey = useStore((state) => state.activeProfileKey);
  const [showReconnectScreen, setShowReconnectScreen] = useState(false);
  useEffect(() => {
    if (!ready) return;
    if (!hasTarget) {
      router.replace("/connect");
      return;
    }
    if (status === "connected" && !activeProfileKey)
      router.replace("/(app)/profiles");
    else if ((status === "error" || status === "disconnected") && !activeProfileKey)
      router.replace("/connect");
  }, [activeProfileKey, hasTarget, ready, router, status]);

  const isRecoveringRemote =
    ready &&
    target?.kind === "remote" &&
    mode === "remote" &&
    status !== "connected";

  useEffect(() => {
    if (!isRecoveringRemote) {
      setShowReconnectScreen(false);
      return;
    }
    const timer = setTimeout(
      () => setShowReconnectScreen(true),
      REMOTE_RECOVERY_DELAY_MS,
    );
    return () => clearTimeout(timer);
  }, [isRecoveringRemote]);

  return (
    <>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: "slide_from_right" }}>
        <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
        <Stack.Screen name="profiles" options={{ gestureEnabled: Boolean(activeProfileKey) }} />
        <Stack.Screen name="plugin-marketplace" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="info" />
        <Stack.Screen name="shop" />
        <Stack.Screen name="logs" />
        <Stack.Screen name="bot/[botId]" />
        <Stack.Screen name="alt/[username]" />
        <Stack.Screen name="alt/editor" />
        <Stack.Screen name="scripts" />
        <Stack.Screen name="plugins" />
        <Stack.Screen name="plugin-import" />
        <Stack.Screen name="share/[id]" />
        <Stack.Screen name="share-link" />
        <Stack.Screen name="chains/[chainId]" />
        <Stack.Screen name="chains/settings/[chainId]" />
        <Stack.Screen name="chains/step/[chainId]" />
        <Stack.Screen name="recording/[pluginId]" />
      </Stack>
      {showReconnectScreen ? <RemoteReconnectScreen /> : null}
    </>
  );
}
