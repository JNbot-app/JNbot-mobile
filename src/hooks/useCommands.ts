import { useMemo } from "react";
import { useClient } from "../net/ConnectionProvider";
import { selectProfileReady, useStore } from "../store/store";
import type { ActiveBot, MacroInfo } from "../store/types";
import type { SerializableOption } from "../runtime/types";
import type { BotAction } from "../generated/client-contract/mobileClientContract";

export enum ScriptControl {
  PAUSE = 1 << 0,
  RESUME = 1 << 1,
  RESTART = 1 << 2,
  SKIP = 1 << 3,
  PREVIOUS = 1 << 4,
}

export function useCommands() {
  const client = useClient();
  const isProfileReady = useStore(selectProfileReady);
  return useMemo(() => {
    if (!client || !isProfileReady) return null;
    return {
      stopScript: (instanceId: number) => client.stopScript(instanceId),
      restartScript: (instanceId: number) => client.restartScript(instanceId),
      restartAll: () => client.restartScript(),
      sendControl: (instanceId: number, control: ScriptControl) =>
        client.sendControl(instanceId, control),
      runPlugin: (plugin: MacroInfo) =>
        client.startScript({
          script: "macro",
          arguments: { macroInfo: plugin, devMode: false },
        }),
      updatePluginOption: (
        pluginId: string,
        option: Pick<SerializableOption, "id">,
        value: unknown,
      ) =>
        client.updateSettings({
          path: ["scripts", pluginId, option.id],
          value,
        }),
      botAction: (bot: ActiveBot, action: BotAction, data?: unknown[]) =>
        client.botAction(bot, action, data),
      requestBotAction: <T>(
        bot: ActiveBot,
        action: BotAction,
        data?: unknown[],
      ) => client.botAction<T>(bot, action, data, true),
    };
  }, [client, isProfileReady]);
}
