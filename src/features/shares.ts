import { useCallback, useEffect } from "react";
import { useRouter } from "expo-router";
import {
  SHARE_KIND_LABELS,
  shareUpdateAvailable,
  type MarketEntry,
  type ShareCreateInput,
  type ShareKind,
  type ShareState,
} from "../generated/client-contract/share";
import { useFeedback } from "../components/AppFeedback";
import { useConnection } from "../net/ConnectionProvider";
import type { ShareAction } from "../runtime/JNbotRuntime";
import { useMarket, useShares } from "./shareStore";

export type ShareTarget = ShareCreateInput & { title: string };

export { useMarket, useShares } from "./shareStore";

/** Opens the share-link screen for one plugin, folder, profile, chain or trigger. */
export function useOpenShareLink() {
  const router = useRouter();
  return useCallback(
    (target: ShareTarget) => router.push({ pathname: "/(app)/share-link", params: { ...target } }),
    [router],
  );
}

/**
 * Update action for an item installed from a share: opens the update when one is
 * known, otherwise checks the server first. Undefined when it was not installed
 * from a share.
 */
export function useShareUpdateAction(kind: ShareKind, localRef: string) {
  const router = useRouter();
  const { shareAction } = useConnection();
  const { showMessage } = useFeedback();
  const share = useShares((state) => findShare(state.installed, kind, (item) => item.localRef === localRef));
  const appVersion = useShares((state) => state.appVersion);
  if (!share) return undefined;

  const available = shareUpdateAvailable(share, appVersion);
  // Resolves to a status message, or undefined once the update screen is opened. `silent` skips
  // the toast for callers that show the message themselves (a toast hides behind modals).
  const run = async (options?: { silent?: boolean }): Promise<string | undefined> => {
    try {
      const state = available ? undefined : await shareAction<ShareState>("SHARE_CHECK_UPDATES", share.id);
      if (state) useShares.setState(state);
      const latest = state?.installed[share.id];
      if (available || (latest && shareUpdateAvailable(latest, state.appVersion))) {
        router.push({ pathname: "/(app)/share/[id]", params: { id: share.id } });
        return undefined;
      }
      const message = `This ${SHARE_KIND_LABELS[kind].toLowerCase()} is up to date`;
      if (!options?.silent) showMessage(message, "success");
      return message;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      if (!options?.silent) showMessage(message, "error");
      return message;
    }
  };
  return { available, run, ownerName: share.ownerName, label: available ? `Update from ${share.ownerName}` : "Check for updates" };
}

const MUTATIONS = new Set<ShareAction>([
  "SHARE_CREATE",
  "SHARE_UPDATE",
  "SHARE_DELETE",
  "SHARE_INSTALL",
  "SHARE_VISIBILITY",
]);

/**
 * Share actions on the active runtime. Browsing and installing work on a paired
 * desktop too; links can only be managed while the phone runs its own profiles
 * (`local`), as they are signed with this device's publisher key.
 */
export function useShareActions() {
  const { shareAction, mode } = useConnection();
  const local = mode === "local";

  const refresh = useCallback(async () => {
    useShares.setState(await shareAction<ShareState>("SHARE_STATE", undefined));
  }, [shareAction]);

  /** Loads the marketplace and the installs it is compared against. */
  const loadMarket = useCallback(
    async (force = false) => {
      if (useMarket.getState().loading) return;
      useMarket.setState({ loading: true });
      try {
        const [entries, state] = await Promise.all([
          shareAction<MarketEntry[]>("SHARE_MARKET", force),
          shareAction<ShareState>("SHARE_STATE", undefined),
        ]);
        useShares.setState(state);
        useMarket.setState({ entries, loading: false, error: null });
      } catch (cause) {
        useMarket.setState({
          loading: false,
          error: cause instanceof Error ? cause.message : "Could not load the marketplace.",
        });
      }
    },
    [shareAction],
  );

  const run = useCallback(
    async <T,>(event: ShareAction, data?: unknown): Promise<T> => {
      const result = await shareAction<T>(event, data);
      if (MUTATIONS.has(event)) await refresh();
      return result;
    },
    [refresh, shareAction],
  );

  return { local, refresh, run, loadMarket };
}

export const findShare = <T extends { kind: ShareKind }>(
  shares: Record<string, T>,
  kind: ShareKind,
  match: (share: T) => boolean,
) => Object.values(shares).find((share) => share.kind === kind && match(share));

/** Profile shares not installed yet, official (built-in) servers first. */
export function useMarketProfiles() {
  const connected = useConnection().status === "connected";
  const { loadMarket } = useShareActions();
  const { entries, loading, error } = useMarket();
  const installed = useShares((state) => state.installed);
  useEffect(() => {
    if (connected) void loadMarket();
  }, [connected, loadMarket]);
  const profiles = (entries ?? [])
    .filter((entry) => entry.kind === "profile" && !installed[entry.id])
    .sort(
      (a, b) =>
        Number(b.publisher.official) - Number(a.publisher.official) || a.listing.title.localeCompare(b.listing.title),
    );
  return { profiles, loading: loading && !entries, error };
}

/** Official server id → name, from the profiles listed on the marketplace. */
export function useServerName() {
  const entries = useMarket((state) => state.entries);
  return (serverId: string) =>
    entries?.find((entry) => entry.kind === "profile" && entry.listing.serverId === serverId)?.listing.title ?? serverId;
}
