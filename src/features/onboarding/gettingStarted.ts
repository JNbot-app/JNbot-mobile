import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';

const DISMISSED_KEY = '@jnbot/onboarding/getting-started-dismissed-v1';

export type GettingStartedStepId = 'server' | 'account' | 'bot' | 'script';

export type GettingStartedStep = { id: GettingStartedStepId; title: string; done: boolean };

export type GettingStartedProgress = {
  accounts: number;
  botsJoined: number;
  scriptsStarted: number;
  liveBots: number;
  runningScripts: number;
};

/** Derives checklist progress from existing profile data, so nothing besides the dismissal is stored. */
export function getGettingStartedSteps(progress: GettingStartedProgress): GettingStartedStep[] {
  return [
    { id: 'server', title: 'Choose a server', done: true },
    { id: 'account', title: 'Add a Minecraft account', done: progress.accounts > 0 },
    { id: 'bot', title: 'Join your first bot', done: progress.botsJoined > 0 || progress.liveBots > 0 },
    { id: 'script', title: 'Run a script', done: progress.scriptsStarted > 0 || progress.runningScripts > 0 },
  ];
}

export function useGettingStarted(enabled: boolean, progress: GettingStartedProgress) {
  const [dismissed, setDismissed] = useState(true);
  const { accounts, botsJoined, scriptsStarted, liveBots, runningScripts } = progress;

  useEffect(() => {
    if (!enabled) return;
    let mounted = true;
    void AsyncStorage.getItem(DISMISSED_KEY)
      .then((value) => mounted && setDismissed(value === '1'))
      .catch(() => mounted && setDismissed(false));
    return () => {
      mounted = false;
    };
  }, [enabled]);

  const steps = useMemo(
    () => getGettingStartedSteps({ accounts, botsJoined, scriptsStarted, liveBots, runningScripts }),
    [accounts, botsJoined, scriptsStarted, liveBots, runningScripts],
  );

  const dismiss = useCallback(() => {
    setDismissed(true);
    void AsyncStorage.setItem(DISMISSED_KEY, '1').catch(() => undefined);
  }, []);

  return { steps, visible: enabled && !dismissed && steps.some((step) => !step.done), dismiss };
}
