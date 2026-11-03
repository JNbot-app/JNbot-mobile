import { resolveAutomationTarget } from './automationTarget';
import type { MacroInfo } from '../../store/types';
import type { ProfileScriptInfo } from '../../hooks/useProfileScriptInfos';

const plugin = { pluginId: 'plugin-1', name: 'My plugin' } as MacroInfo;
const script = { id: 'profile-1', pluginId: 'plugin-1', name: 'My script' } as ProfileScriptInfo;

describe('resolveAutomationTarget', () => {
  it('opens the profile script for an option error, even when an installed plugin also matches', () => {
    expect(resolveAutomationTarget('plugin-1', 'option-error', [script], [plugin])).toEqual({
      kind: 'profile',
      script,
    });
  });

  it('opens an installed plugin when no profile script matches', () => {
    expect(resolveAutomationTarget('plugin-1', 'option-error', [], [plugin])).toEqual({
      kind: 'plugin',
      plugin,
    });
  });
});
