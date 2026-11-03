import { useEffect, useRef, useState } from "react";
import { AppState, Platform } from "react-native";
import { useStore } from "../store/store";
import { useConnection } from "../net/ConnectionProvider";
import {
  startBackgroundService,
  stopBackgroundService,
  updateBackgroundNotification,
  requestBackgroundNotificationPermission,
} from "./BackgroundService";
import { loadBackgroundKeepAlivePreference } from "./BackgroundPreferences";
import { buildBackgroundNotification } from "./BackgroundNotification";

export function BackgroundSync() {
  if (Platform.OS !== "android") {
    return null;
  }

  return <AndroidBackgroundSync />;
}

function AndroidBackgroundSync() {
  const activeBots = useStore((state) => state.activeBots);
  const activeScripts = useStore((state) => state.activeScripts);
  const { mode, status } = useConnection();
  const [enabled, setEnabled] = useState<boolean>(false);
  const isRunningRef = useRef<boolean>(false);
  const lastNotificationRef = useRef<string>("");
  const pendingRef = useRef<Promise<void>>(Promise.resolve());
  const permissionRequestedRef = useRef(false);
  const shouldRun = enabled && (
    activeBots.length > 0 || Object.keys(activeScripts).length > 0 ||
    (mode === "local" && status === "connected")
  );

  useEffect(() => {
    let cancelled = false;
    void loadBackgroundKeepAlivePreference().then((pref) => {
      if (!cancelled) setEnabled(pref);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!shouldRun) return;
    const requestPermission = () => {
      if (AppState.currentState !== "active" || permissionRequestedRef.current) return;
      permissionRequestedRef.current = true;
      void requestBackgroundNotificationPermission();
    };
    requestPermission();
    const subscription = AppState.addEventListener("change", requestPermission);
    return () => subscription.remove();
  }, [shouldRun]);

  useEffect(() => {
    let cancelled = false;
    // Serialize native calls so a fast state change cannot update before start completes.
    pendingRef.current = pendingRef.current.then(async () => {
      if (cancelled) return;
      if (!shouldRun) {
        if (isRunningRef.current) await stopBackgroundService();
        isRunningRef.current = false;
        lastNotificationRef.current = "";
        return;
      }
      const { message, details } = buildBackgroundNotification({
        bots: activeBots, scripts: activeScripts, mode, status,
      });
      const key = `${message}\n${details}`;
      if (!isRunningRef.current) {
        isRunningRef.current = await startBackgroundService("JNbot", message, details);
        if (isRunningRef.current) lastNotificationRef.current = key;
      } else if (lastNotificationRef.current !== key) {
        if (await updateBackgroundNotification("JNbot", message, details)) {
          lastNotificationRef.current = key;
        }
      }
    });
    return () => { cancelled = true; };
  }, [activeBots, activeScripts, shouldRun, mode, status]);

  useEffect(() => {
    return () => {
      pendingRef.current = pendingRef.current.then(async () => {
        if (isRunningRef.current) await stopBackgroundService();
        isRunningRef.current = false;
      });
    };
  }, []);

  return null;
}
