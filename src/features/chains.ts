import type { SettingsPatch } from "../generated/client-contract/mobileClientContract";
import type { Chain, ChainNext, ChainOptions, ChainStep, SettingsObj } from "../store/types";
import { chainPluginId, normalizeChainStep } from "../generated/client-contract/chains";

export { createChainStep } from "../generated/client-contract/chains";

export const DEFAULT_CHAIN_OPTIONS: ChainOptions = {
  name: "New chain",
  description: "",
  gamemode: "",
  altRange: [null, null],
  withTags: [],
  ignoreAlts: [],
  withRanks: false,
  withGkits: false,
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

const stringList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

const altRange = (value: unknown): [string | null, string | null] => {
  if (!Array.isArray(value)) return [null, null];
  return [typeof value[0] === "string" ? value[0] : null, typeof value[1] === "string" ? value[1] : null];
};

export function chainOptions(chain: Chain): ChainOptions {
  const legacy = isRecord(chain.options) ? chain.options : {};
  return {
    name: chain.name ?? DEFAULT_CHAIN_OPTIONS.name,
    description: typeof legacy.description === "string" ? legacy.description : "",
    gamemode: typeof legacy.gamemode === "string" ? legacy.gamemode : DEFAULT_CHAIN_OPTIONS.gamemode,
    altRange: altRange(legacy.altRange ?? [legacy.startWith, legacy.endsWith]),
    withTags: stringList(legacy.withTags),
    ignoreAlts: stringList(legacy.ignoreAlts),
    withRanks: legacy.withRanks === true || legacy.ignoreNoRanks === true,
    withGkits: legacy.withGkits === true || legacy.ignoreNoGkits === true,
  };
}

export function getChainOptions(settings: SettingsObj, chain: Chain): ChainOptions {
  return getChainOptionsFromScripts(settings.scripts, chain);
}

export function getChainOptionsFromScripts(
  scripts: SettingsObj["scripts"],
  chain: Chain,
): ChainOptions {
  const flat = scripts?.[chain.id];
  const base = chainOptions(chain);
  if (!isRecord(flat)) return base;
  return {
    name: typeof flat.name === "string" ? flat.name : base.name,
    description: typeof flat.description === "string" ? flat.description : base.description,
    gamemode: typeof flat.gamemode === "string" ? flat.gamemode : base.gamemode,
    altRange: flat.altRange === undefined ? base.altRange : altRange(flat.altRange),
    withTags: flat.withTags === undefined ? base.withTags : stringList(flat.withTags),
    ignoreAlts: flat.ignoreAlts === undefined ? base.ignoreAlts : stringList(flat.ignoreAlts),
    withRanks: typeof flat.withRanks === "boolean" ? flat.withRanks : base.withRanks,
    withGkits: typeof flat.withGkits === "boolean" ? flat.withGkits : base.withGkits,
  };
}

export type ChainOptionId = keyof ChainOptions;

export const isChainOptionId = (value: string): value is ChainOptionId =>
  value === "name" ||
  value === "description" ||
  value === "gamemode" ||
  value === "altRange" ||
  value === "withTags" ||
  value === "ignoreAlts" ||
  value === "withRanks" ||
  value === "withGkits";

export function setChainOption(
  options: ChainOptions,
  id: ChainOptionId,
  value: unknown,
): ChainOptions {
  switch (id) {
    case "name":
    case "description":
    case "gamemode":
      return typeof value === "string" ? { ...options, [id]: value } : options;
    case "altRange":
      return { ...options, altRange: altRange(value) };
    case "withTags":
    case "ignoreAlts":
      return { ...options, [id]: stringList(value) };
    case "withRanks":
    case "withGkits":
      return typeof value === "boolean" ? { ...options, [id]: value } : options;
  }
}

export function chainSteps(chain: Chain, steps: ChainStep[]): Chain {
  return { ...chain, chains: steps.map(normalizeChainStep) };
}

/** Remove a step; steps that jumped to it continue instead. */
export function removeChainStep(chain: Chain, index: number): Chain {
  const removed = `step:${chain.chains[index]?.id}`;
  const clear = (next?: ChainNext) => (next === removed ? undefined : next);
  return chainSteps(chain, chain.chains
    .filter((_, stepIndex) => stepIndex !== index)
    .map((step) => ({ ...step, onSuccess: clear(step.onSuccess), onFail: clear(step.onFail) })));
}

export function moveChainStep(chain: Chain, from: number, to: number): Chain {
  if (from === to || from < 0 || from >= chain.chains.length) return chain;
  if (to < 0 || to >= chain.chains.length) return chain;
  const next = [...chain.chains];
  const [step] = next.splice(from, 1);
  next.splice(to, 0, step);
  return chainSteps(chain, next);
}

export function isRunnableChain(chain: Chain, actionIds?: ReadonlySet<string>): boolean {
  return chain.chains.length > 0 && chain.chains.every(
    (step) => Boolean(step.scriptId) && (!actionIds || actionIds.has(step.scriptId)),
  );
}

export function createChainPatches(chain: Chain, options: ChainOptions = DEFAULT_CHAIN_OPTIONS): SettingsPatch[] {
  return [
    { path: ["scripts", "chains", chain.id], value: chain },
    { path: ["scripts", chain.id], value: options },
  ];
}

export function saveChainPatch(chain: Chain): SettingsPatch {
  return { path: ["scripts", "chains", chain.id], value: chain };
}

export function saveChainOptionsPatch(chainId: string, options: ChainOptions): SettingsPatch {
  return { path: ["scripts", chainId], value: options };
}

export function deleteChainPatches(chainId: string): SettingsPatch[] {
  return [
    { path: ["scripts", "chains", chainId], remove: true },
    { path: ["scripts", chainId], remove: true },
  ];
}

export const isChainScript = (chainId: string, script: { scriptId?: string }) =>
  script.scriptId === chainPluginId(chainId);
