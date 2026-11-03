export const AD_COOLDOWN_MS = 60 * 1000;

export type MonetizedAction = "bot_join" | "script_start" | "automation_start";

export type AdGateState = {
  isAdFree: boolean;
  consentAllowsAds: boolean;
  adLoaded: boolean;
  gateRunning: boolean;
  historyReady: boolean;
  lastShownAt: number | null;
};

export function shouldShowAd(state: AdGateState, now: number): boolean {
  if (
    state.isAdFree ||
    !state.consentAllowsAds ||
    !state.adLoaded ||
    state.gateRunning ||
    !state.historyReady
  )
    return false;

  return (
    state.lastShownAt === null || now - state.lastShownAt >= AD_COOLDOWN_MS
  );
}

export async function runAfterOptionalAd<T>(
  present: boolean,
  showAd: () => Promise<void>,
  action: () => Promise<T>,
): Promise<T> {
  if (present) {
    try {
      await showAd();
    } catch {
      // Monetization must never prevent the requested action.
    }
  }
  return action();
}

export class ActionExecutionLock {
  private active: Promise<unknown> | null = null;

  run<T>(action: () => Promise<T>): Promise<T> {
    if (this.active) return this.active as Promise<T>;
    const execution = action();
    this.active = execution;
    const clear = () => {
      if (this.active === execution) this.active = null;
    };
    void execution.then(clear, clear);
    return execution;
  }
}
