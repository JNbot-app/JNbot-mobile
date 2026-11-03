import { create } from "zustand";
import type { MarketEntry, ShareState } from "../generated/client-contract/share";

/** Owned and installed shares of the phone runtime. */
export const useShares = create<ShareState>(() => ({
  owned: {},
  installed: {},
  appVersion: "",
  reviewer: false,
}));

/** Marketplace catalog; the phone backend caches it and revalidates with an ETag. */
export const useMarket = create<{ entries: MarketEntry[] | null; loading: boolean; error: string | null }>(() => ({
  entries: null,
  loading: false,
  error: null,
}));
