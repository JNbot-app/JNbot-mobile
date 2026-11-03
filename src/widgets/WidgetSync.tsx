import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { requireOptionalNativeModule } from "expo";
import { useConnection } from "../net/ConnectionProvider";
import { useStore } from "../store/store";
import { colors, useTheme } from "../theme/theme";
import { buildWidgetSnapshot } from "./widgetSnapshot";

const widgets = requireOptionalNativeModule<{ setSnapshot(json: string): Promise<void> }>("JNbotWidgets");

/** Mirrors the active profile's bots and cooldowns into the home screen widgets. */
export function WidgetSync() {
  if (!widgets) return null;
  return <NativeWidgetSync />;
}

function NativeWidgetSync() {
  const bots = useStore((state) => state.activeBots);
  const reminders = useStore((state) => state.settings.reminders);
  const profile = useStore((state) => state.profiles.find((item) => item.id === state.activeProfileKey)?.name ?? null);
  const { status } = useConnection();
  const { theme } = useTheme();
  const lastKeyRef = useRef("");
  const writeRef = useRef<(force?: boolean) => void>(() => {});

  writeRef.current = (force = false) => {
    const snapshot = buildWidgetSnapshot({ bots, reminders: reminders ?? [], profile, status, colors });
    const { updatedAt: _, ...content } = snapshot;
    const key = JSON.stringify(content);
    if (!force && key === lastKeyRef.current) return;
    lastKeyRef.current = key;
    void widgets!.setSnapshot(JSON.stringify(snapshot)).catch(() => {});
  };

  useEffect(() => writeRef.current(), [bots, reminders, profile, status, theme]);

  // Stamp the moment the app stops observing, so widgets can show how fresh their data is.
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (next) => {
      if (next === "background") writeRef.current(true);
    });
    return () => subscription.remove();
  }, []);

  return null;
}
