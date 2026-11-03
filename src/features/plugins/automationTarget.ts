import type { ProfileScriptInfo } from '../../hooks/useProfileScriptInfos';
import type { MacroInfo } from '../../store/types';

export function resolveAutomationTarget(
  requestedId: string,
  source: string | undefined,
  profileScripts: ProfileScriptInfo[],
  installed: MacroInfo[],
): { kind: 'profile'; script: ProfileScriptInfo } | { kind: 'plugin'; plugin: MacroInfo } | null {
  const script = profileScripts.find(
    (item) => item.id === requestedId || item.pluginId === requestedId,
  );
  if ((source === 'profile' || source === 'option-error') && script) {
    return { kind: 'profile', script };
  }

  const plugin = installed.find(
    (item) => item.pluginId === requestedId || (source === 'option-error' && item.name === requestedId),
  );
  return plugin ? { kind: 'plugin', plugin } : null;
}
