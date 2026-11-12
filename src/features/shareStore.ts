import { create } from "zustand";
import type { MarketEntry, ShareState } from "../generated/client-contract/share";

const EMPTY_SHARES: ShareState = { owned: {}, installed: {}, appVersion: "", reviewer: false };
type MarketState = { entries: MarketEntry[] | null; loading: boolean; error: string | null };
const EMPTY_MARKET: MarketState = { entries: null, loading: false, error: null };

/** Owned and installed shares of the active runtime (this phone or the paired desktop). */
export const useShares = create<ShareState>(() => EMPTY_SHARES);

/** Marketplace catalog; the backend caches it and revalidates with an ETag. */
export const useMarket = create<MarketState>(() => EMPTY_MARKET);

/** Shares and the catalog belong to one runtime; clear them when it changes. */
export function resetShareStores() {
  useShares.setState(EMPTY_SHARES, true);
  useMarket.setState(EMPTY_MARKET, true);
}
