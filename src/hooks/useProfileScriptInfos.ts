import { useEffect, useMemo, useState } from "react";
import { useClient } from "../net/ConnectionProvider";
import { selectProfileReady, useStore } from "../store/store";
import type { MacroInfo } from "../store/types";

export type ProfileScriptEntry = {
  id: string;
  pluginId: string;
  source?: { kind?: string };
  hidden?: boolean;
  order?: number;
  [key: string]: unknown;
};

export type ProfileScriptInfo = ProfileScriptEntry & {
  name: string;
  description: string;
  unavailableReason?: string;
  banner?: string;
  theme?: MacroInfo['theme'];
  info?: MacroInfo;
};

function sortProfileScripts<T extends ProfileScriptEntry>(list: T[]): T[] {
  return [...list].sort((a, b) => {
    const oa = a.order ?? 0;
    const ob = b.order ?? 0;
    if (oa !== ob) return oa - ob;
    return a.id.localeCompare(b.id);
  });
}

/** Resolve profile-script display metadata supplied by the desktop host. */
export function useProfileScriptInfos(): ProfileScriptInfo[] {
  const client = useClient();
  const activeProfileKey = useStore((state) => state.activeProfileKey);
  const profileReady = useStore(selectProfileReady);
  const jndata = useStore((state) => state.JNdata);
  const installed = useStore((state) => state.macros.list);
  const [resolved, setResolved] = useState<
    Record<string, Pick<ProfileScriptInfo, "name" | "description" | "pluginId" | "unavailableReason" | "banner" | "theme" | "info">>
  >({});

  const scripts = useMemo<ProfileScriptEntry[]>(
    () => {
      if (!activeProfileKey) return [];
      const raw = (jndata?.data?.[activeProfileKey]?.scripts ?? []) as ProfileScriptEntry[];
      return sortProfileScripts(raw.filter((script) => !script.hidden));
    },
    [activeProfileKey, jndata],
  );

  useEffect(() => {
    let cancelled = false;
    setResolved({});

    if (!client || !profileReady || scripts.length === 0)
      return () => {
        cancelled = true;
      };

    void Promise.all(
      scripts.map(async (script) => {
        try {
          const result = await client.profileAction<{
            info?: MacroInfo;
            error?: string;
          }>("RESOLVE_PROFILE_SCRIPT_INFO", { id: script.id });
          if (result.info?.name)
            return [
              script.id,
              {
                name: result.info.name,
                description: result.info.description ?? "",
                pluginId: result.info.pluginId || script.pluginId,
                banner: result.info.banner,
                theme: result.info.theme,
                info: result.info,
              },
            ] as const;
          return [script.id, {
            name: "Unavailable script",
            description: "Metadata could not be loaded.",
            pluginId: script.pluginId,
            unavailableReason: result.error ?? "This script is currently unavailable.",
          }] as const;
        } catch (cause) {
          return [script.id, {
            name: "Unavailable script",
            description: "Metadata could not be loaded.",
            pluginId: script.pluginId,
            unavailableReason: cause instanceof Error ? cause.message : "This script is currently unavailable.",
          }] as const;
        }
      }),
    ).then((entries) => {
      if (cancelled) return;
      setResolved(
        Object.fromEntries(
          entries,
        ),
      );
    });

    return () => {
      cancelled = true;
    };
  }, [client, profileReady, scripts]);

  return scripts.map((script) => {
    const matchedInstalled = installed.find((item) => item.pluginId === script.pluginId);
    const res = resolved[script.id];
    return {
      ...script,
      pluginId: res?.pluginId ?? script.pluginId,
      name: res?.name ?? matchedInstalled?.name ?? "Loading script…",
      description: res?.description ?? matchedInstalled?.description ?? "",
      unavailableReason: res?.unavailableReason,
      banner: res?.banner ?? matchedInstalled?.banner,
      theme: res?.theme ?? matchedInstalled?.theme,
      info: res?.info ?? matchedInstalled,
    };
  });
}
