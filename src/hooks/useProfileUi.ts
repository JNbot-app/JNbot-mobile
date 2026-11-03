import { useEffect, useState } from "react";
import { useClient } from "../net/ConnectionProvider";
import { selectCanUseScripts, useStore } from "../store/store";
import type { ProfileUiJson } from "../generated/client-contract/profileUiSchema";

/**
 * Runs the active profile's Profile UI plugin for `username`. `json` stays
 * null when the profile has none or it fails, so callers render their
 * built-in layout instead (like desktop's fallback profile).
 */
export function useProfileUi(username: string | undefined) {
  const client = useClient();
  const canUseScripts = useStore(selectCanUseScripts);
  const hasAction = useStore((s) =>
    Boolean(s.activeProfileKey && s.JNdata?.data?.[s.activeProfileKey]?.profileUiAction),
  );
  const enabled = Boolean(client && username && hasAction && canUseScripts);
  const [state, setState] = useState<{ json: ProfileUiJson | null; loading: boolean }>({
    json: null,
    loading: enabled,
  });

  useEffect(() => {
    if (!enabled) {
      setState({ json: null, loading: false });
      return;
    }
    let current = true;
    setState({ json: null, loading: true });
    client!
      .runProfileUi(username!)
      .then((response) => response.ok ? response.json : null)
      .catch(() => null)
      .then((json) => {
        if (current) setState({ json, loading: false });
      });
    return () => {
      current = false;
    };
  }, [client, enabled, username]);

  return state;
}
