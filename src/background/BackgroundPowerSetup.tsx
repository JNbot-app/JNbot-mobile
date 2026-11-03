import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AppState, Platform, type AppStateStatus } from "react-native";
import { useConnection } from "../net/ConnectionProvider";
import { useStore } from "../store/store";
import type { BackgroundPowerStatus } from "./BackgroundService";
import {
  getBackgroundPowerStatus,
  openManufacturerPowerSettings,
  requestIgnoreBatteryOptimization,
} from "./BackgroundService";
import {
  clearDismissedBackgroundPowerRun,
  loadDismissedBackgroundPowerRun,
  loadManufacturerPowerSetupConfirmed,
  saveDismissedBackgroundPowerRun,
  saveManufacturerPowerSetupConfirmed,
} from "./BackgroundPowerPreferences";

export type BackgroundPowerSetupState =
  | "needs-standard-exemption"
  | "needs-oem-setup"
  | "awaiting-oem-confirmation"
  | "complete"
  | "error";

type BackgroundPowerSetupContextValue = {
  state: BackgroundPowerSetupState;
  visible: boolean;
  powerStatus: BackgroundPowerStatus | null;
  requestBackgroundAccess: () => Promise<void>;
  confirmManufacturerSetup: () => Promise<void>;
  dismissForCurrentRun: () => Promise<void>;
  refresh: () => Promise<void>;
};

const BackgroundPowerSetupContext = createContext<BackgroundPowerSetupContextValue | null>(null);

export function getBackgroundPowerSetupState({
  powerStatus,
  manufacturerSetupConfirmed,
  manufacturerSettingsOpened,
  hasError,
}: {
  powerStatus: BackgroundPowerStatus | null;
  manufacturerSetupConfirmed: boolean;
  manufacturerSettingsOpened: boolean;
  hasError: boolean;
}): BackgroundPowerSetupState {
  if (hasError) return "error";
  if (!powerStatus || powerStatus.isBatteryOptimizationIgnored === false) {
    return "needs-standard-exemption";
  }
  if (!powerStatus.requiresManufacturerSetup || manufacturerSetupConfirmed) {
    return "complete";
  }
  return manufacturerSettingsOpened ? "awaiting-oem-confirmation" : "needs-oem-setup";
}

function isDismissedForActiveRun(activeScriptIds: string[], dismissedScriptIds: string[]): boolean {
  return activeScriptIds.length > 0 && activeScriptIds.every((id) => dismissedScriptIds.includes(id));
}

export function shouldShowBackgroundPowerReminder({
  isAndroid,
  mode,
  activeScriptIds,
  dismissedScriptIds,
  dismissalLoaded,
  state,
}: {
  isAndroid: boolean;
  mode: "local" | "remote" | null;
  activeScriptIds: string[];
  dismissedScriptIds: string[];
  dismissalLoaded: boolean;
  state: BackgroundPowerSetupState;
}): boolean {
  return isAndroid
    && mode === "local"
    && activeScriptIds.length > 0
    && dismissalLoaded
    && state !== "complete"
    && !isDismissedForActiveRun(activeScriptIds, dismissedScriptIds);
}

export function BackgroundPowerProvider({ children }: { children: React.ReactNode }) {
  const { mode } = useConnection();
  const activeScripts = useStore((state) => state.activeScripts);
  const activeScriptIds = useMemo(() => Object.keys(activeScripts).sort(), [activeScripts]);
  const [powerStatus, setPowerStatus] = useState<BackgroundPowerStatus | null>(null);
  const [manufacturerSetupConfirmed, setManufacturerSetupConfirmed] = useState(false);
  const [manufacturerSettingsOpened, setManufacturerSettingsOpened] = useState(false);
  const [dismissedScriptIds, setDismissedScriptIds] = useState<string[]>([]);
  const [dismissalLoaded, setDismissalLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const refresh = useCallback(async () => {
    if (Platform.OS !== "android") return;
    const nextStatus = await getBackgroundPowerStatus();
    setPowerStatus(nextStatus);
    setHasError(false);
    if (!nextStatus.requiresManufacturerSetup) {
      setManufacturerSetupConfirmed(false);
      setManufacturerSettingsOpened(false);
      return;
    }
    const isConfirmed = await loadManufacturerPowerSetupConfirmed(
      nextStatus.manufacturer,
      nextStatus.model,
    );
    setManufacturerSetupConfirmed(isConfirmed);
  }, []);

  useEffect(() => {
    let mounted = true;
    void loadDismissedBackgroundPowerRun().then((ids) => {
      if (!mounted) return;
      setDismissedScriptIds(ids);
      setDismissalLoaded(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    void refresh();
    const subscription = AppState.addEventListener("change", (nextState: AppStateStatus) => {
      if (nextState === "active") void refresh();
    });
    return () => subscription.remove();
  }, [refresh]);

  const activeRunKey = activeScriptIds.join("|");
  useEffect(() => {
    if (!dismissalLoaded) return;
    const hasNewScript = activeScriptIds.some((id) => !dismissedScriptIds.includes(id));
    if (activeScriptIds.length > 0 && !hasNewScript) return;
    if (dismissedScriptIds.length === 0) return;
    setDismissedScriptIds([]);
    void clearDismissedBackgroundPowerRun();
  }, [activeRunKey, activeScriptIds, dismissalLoaded, dismissedScriptIds]);

  const state = getBackgroundPowerSetupState({
    powerStatus,
    manufacturerSetupConfirmed,
    manufacturerSettingsOpened,
    hasError,
  });
  const visible = powerStatus !== null && shouldShowBackgroundPowerReminder({
    isAndroid: Platform.OS === "android",
    mode,
    activeScriptIds,
    dismissedScriptIds,
    dismissalLoaded,
    state,
  });

  const requestBackgroundAccess = useCallback(async () => {
    if (state === "needs-standard-exemption") {
      await requestIgnoreBatteryOptimization();
      return;
    }

    const result = await openManufacturerPowerSettings();
    if (result.opened) {
      setManufacturerSettingsOpened(true);
      setHasError(false);
    } else {
      setHasError(true);
    }
  }, [state]);

  const confirmManufacturerSetup = useCallback(async () => {
    if (!powerStatus?.requiresManufacturerSetup) return;
    await saveManufacturerPowerSetupConfirmed(powerStatus.manufacturer, powerStatus.model);
    setManufacturerSetupConfirmed(true);
    setManufacturerSettingsOpened(false);
    setHasError(false);
  }, [powerStatus]);

  const dismissForCurrentRun = useCallback(async () => {
    if (activeScriptIds.length === 0) return;
    await saveDismissedBackgroundPowerRun(activeScriptIds);
    setDismissedScriptIds(activeScriptIds);
  }, [activeScriptIds]);

  const value = useMemo<BackgroundPowerSetupContextValue>(() => ({
    state,
    visible,
    powerStatus,
    requestBackgroundAccess,
    confirmManufacturerSetup,
    dismissForCurrentRun,
    refresh,
  }), [
    state,
    visible,
    powerStatus,
    requestBackgroundAccess,
    confirmManufacturerSetup,
    dismissForCurrentRun,
    refresh,
  ]);

  return (
    <BackgroundPowerSetupContext.Provider value={value}>
      {children}
    </BackgroundPowerSetupContext.Provider>
  );
}

export function useBackgroundPowerSetup(): BackgroundPowerSetupContextValue {
  const context = useContext(BackgroundPowerSetupContext);
  if (!context) {
    throw new Error("useBackgroundPowerSetup must be used within BackgroundPowerProvider");
  }
  return context;
}
