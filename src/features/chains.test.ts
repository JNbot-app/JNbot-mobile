import {
  DEFAULT_CHAIN_OPTIONS,
  chainOptions,
  createChainPatches,
  createChainStep,
  deleteChainPatches,
  isChainScript,
  isRunnableChain,
  moveChainStep,
  removeChainStep,
  setChainOption,
} from "./chains";
import type { ChainStep } from "../store/types";

describe("chains", () => {
  // Saved before step ids were strings and steps had a delay.
  const chain = {
    id: "one",
    chains: [
      { id: 4, name: "First", scriptId: "first", delay: 0 },
      { id: 8, name: "Second", scriptId: "second", delay: 300 },
    ] as unknown as ChainStep[],
  };

  it("uses desktop-compatible defaults and migrates legacy nested options", () => {
    expect(DEFAULT_CHAIN_OPTIONS).toMatchObject({ name: "New chain", gamemode: "" });
    expect(chainOptions({
      ...chain,
      name: "Legacy",
      options: { startWith: "A", endsWith: "B", ignoreNoRanks: true, ignoreNoGkits: true },
    })).toEqual(expect.objectContaining({
      name: "Legacy",
      altRange: ["A", "B"],
      withRanks: true,
      withGkits: true,
    }));
  });

  it("moves steps keeping their ids and drops the legacy delay", () => {
    expect(moveChainStep(chain, 0, 1).chains).toEqual([
      { id: "8", name: "Second", scriptId: "second" },
      { id: "4", name: "First", scriptId: "first" },
    ]);
    expect(createChainStep()).toMatchObject({ scriptId: "", id: expect.any(String) });
  });

  it("clears jumps to a removed step", () => {
    const next = removeChainStep({
      id: "one",
      chains: [
        { id: "a", name: "A", scriptId: "a", onFail: "step:b", onSuccess: "stop" },
        { id: "b", name: "B", scriptId: "b" },
      ],
    }, 1);
    expect(next.chains).toEqual([{ id: "a", name: "A", scriptId: "a", onFail: undefined, onSuccess: "stop" }]);
  });

  it("matches running chains by their plugin id", () => {
    expect(isChainScript("one", { scriptId: "chain:one" })).toBe(true);
    expect(isChainScript("one", { scriptId: "chain" })).toBe(false);
  });

  it("requires a populated, available action for every step", () => {
    expect(isRunnableChain(chain, new Set(["first", "second"]))).toBe(true);
    expect(isRunnableChain(chain, new Set(["first"]))).toBe(false);
    expect(isRunnableChain({ ...chain, chains: [{ ...chain.chains[0], scriptId: "" }] })).toBe(false);
  });

  it("writes and removes both desktop storage paths", () => {
    expect(createChainPatches({ ...chain, chains: [] }).map((patch) => patch.path)).toEqual([
      ["scripts", "chains", "one"],
      ["scripts", "one"],
    ]);
    expect(deleteChainPatches("one")).toEqual([
      { path: ["scripts", "chains", "one"], remove: true },
      { path: ["scripts", "one"], remove: true },
    ]);
  });

  it("accepts only valid values from mobile settings controls", () => {
    expect(setChainOption(DEFAULT_CHAIN_OPTIONS, "withTags", ["daily", 3])).toMatchObject({ withTags: ["daily"] });
    expect(setChainOption(DEFAULT_CHAIN_OPTIONS, "gamemode", 3)).toEqual(DEFAULT_CHAIN_OPTIONS);
    expect(setChainOption(DEFAULT_CHAIN_OPTIONS, "altRange", ["A", "B"])).toMatchObject({ altRange: ["A", "B"] });
  });
});
