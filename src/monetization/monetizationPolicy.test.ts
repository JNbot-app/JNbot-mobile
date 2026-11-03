import {
  AD_COOLDOWN_MS,
  ActionExecutionLock,
  runAfterOptionalAd,
  shouldShowAd,
  type AdGateState,
} from "./monetizationPolicy";

const eligible = (overrides: Partial<AdGateState> = {}): AdGateState => ({
  isAdFree: false,
  consentAllowsAds: true,
  adLoaded: true,
  gateRunning: false,
  historyReady: true,
  lastShownAt: null,
  ...overrides,
});

describe("ad gate policy", () => {
  it("allows a ready first impression", () => {
    expect(shouldShowAd(eligible(), 1_000)).toBe(true);
  });

  it("enforces the one-minute boundary", () => {
    const now = 1_000_000;
    expect(
      shouldShowAd(eligible({ lastShownAt: now - AD_COOLDOWN_MS + 1 }), now),
    ).toBe(false);
    expect(
      shouldShowAd(eligible({ lastShownAt: now - AD_COOLDOWN_MS }), now),
    ).toBe(true);
  });

  it.each([
    ["ad-free entitlement", { isAdFree: true }],
    ["missing consent", { consentAllowsAds: false }],
    ["unloaded ad", { adLoaded: false }],
    ["running gate", { gateRunning: true }],
    ["unloaded history", { historyReady: false }],
  ])("fails open for %s", (_label, override) => {
    expect(shouldShowAd(eligible(override), Date.now())).toBe(false);
  });

  it("deduplicates rapid eligible actions until the first finishes", async () => {
    const lock = new ActionExecutionLock();
    let finish!: (value: string) => void;
    const firstAction = jest.fn(
      () => new Promise<string>((resolve) => (finish = resolve)),
    );
    const secondAction = jest.fn(async () => "second");

    const first = lock.run(firstAction);
    const duplicate = lock.run(secondAction);
    finish("first");

    await expect(first).resolves.toBe("first");
    await expect(duplicate).resolves.toBe("first");
    expect(firstAction).toHaveBeenCalledTimes(1);
    expect(secondAction).not.toHaveBeenCalled();
  });

  it("runs the action once when ad presentation fails", async () => {
    const action = jest.fn(async () => "joined");

    await expect(
      runAfterOptionalAd(
        true,
        async () => {
          throw new Error("presentation failed");
        },
        action,
      ),
    ).resolves.toBe("joined");
    expect(action).toHaveBeenCalledTimes(1);
  });
});
