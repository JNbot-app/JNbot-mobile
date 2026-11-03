import { useEffect, useState } from "react";
import { useClient } from "../../net/ConnectionProvider";
import {
  selectCanUsePlugins,
  selectCanUseScripts,
  selectProfileReady,
  useStore,
} from "../../store/store";
import type { MacroInfo } from "../../store/types";
import { chainPluginId } from "../../generated/client-contract/chains";

export type ScheduleScript = { info: MacroInfo; profileScriptId?: string };

export function useScheduleScripts() {
  const client = useClient();
  const ready = useStore(selectProfileReady);
  const profileKey = useStore((state) => state.activeProfileKey);
  const profile = useStore((state) =>
    profileKey ? state.JNdata?.data?.[profileKey] : undefined,
  );
  const installed = useStore((state) => state.macros.list);
  const savedScripts = useStore((state) => state.settings.scripts);
  const canUseScripts = useStore(selectCanUseScripts);
  const canUsePlugins = useStore(selectCanUsePlugins);
  const [scripts, setScripts] = useState<ScheduleScript[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setScripts([]);
    if (!client || !ready)
      return () => {
        cancelled = true;
      };
    const entries = profile?.scripts ?? [];
    void Promise.all(
      entries.map(async (entry): Promise<ScheduleScript | undefined> => {
        if (profile?.disallowedPlugins?.includes(entry.pluginId))
          return undefined;
        try {
          const result = await client.profileAction<{ info?: MacroInfo }>(
            "RESOLVE_PROFILE_SCRIPT_INFO",
            { id: entry.id },
          );
          if (result.info)
            return { info: result.info, profileScriptId: entry.id };
        } catch {
          /* Unavailable scripts are omitted from the picker. */
        }
        return undefined;
      }),
    ).then((resolved) => {
      if (cancelled) return;
      const byId = new Map<string, ScheduleScript>();
      const candidates: (ScheduleScript | undefined)[] = [
        ...resolved,
        ...installed.map((info) => ({ info })),
      ];
      for (const script of candidates) {
        if (
          !script ||
          profile?.disallowedPlugins?.includes(script.info.pluginId)
        )
          continue;
        if (
          script.info.scriptType !== "script" &&
          script.info.scriptType !== "action"
        )
          continue;
        if (script.profileScriptId ? !canUseScripts : !canUsePlugins) continue;
        if (!byId.has(script.info.pluginId))
          byId.set(script.info.pluginId, script);
      }
      setScripts([...byId.values()]);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [client, ready, profile, installed, canUseScripts, canUsePlugins]);

  // Chains run like plugins under a `chain:<id>` pluginId.
  const chains = Object.values(savedScripts?.chains ?? {}).map(
    (chain): ScheduleScript => ({
      info: {
        pluginId: chainPluginId(chain.id),
        name: savedScripts?.[chain.id]?.name ?? chain.name ?? "Chain",
        scriptType: "script",
      } as MacroInfo,
    }),
  );
  return { scripts: [...scripts, ...chains], loading };
}
