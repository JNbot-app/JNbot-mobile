import { useCallback, useEffect, useState } from 'react';
import type { JNbotClient } from '../client/JNbotClient';
import { useClient } from '../net/ConnectionProvider';

export type PluginSource = Awaited<ReturnType<JNbotClient['getPluginCode']>>;

const message = (reason: unknown, fallback: string) => (reason instanceof Error ? reason.message : fallback);

/**
 * Loads a plugin's source and saves edits back with the revision it was loaded at,
 * so a change made elsewhere (the desktop, another phone) is never overwritten.
 * `onLoad` receives the code of each (re)load, not of saves.
 */
export function usePluginSource(pluginId: string, onLoad: (code: string) => void) {
  const connectedClient = useClient();
  // Keep the draft tied to the runtime it was loaded from across connection changes.
  const [client, setClient] = useState(connectedClient);
  const [source, setSource] = useState<PluginSource | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    const target = connectedClient;
    setClient(target);
    setSource(null);
    setError(null);
    if (!target) {
      setError('Connect to a runtime to open the code.');
      return;
    }
    target.getPluginCode(pluginId).then(
      (result) => {
        if (!active) return;
        setSource(result);
        onLoad(result.code);
      },
      (reason: unknown) => { if (active) setError(message(reason, 'Could not load the plugin code.')); },
    );
    return () => { active = false; };
    // Reload only on retry or a new plugin; a reconnect keeps the open draft.
  }, [pluginId, attempt]);

  const save = useCallback(async (code: string): Promise<boolean> => {
    if (!source || saving) return false;
    if (!client || client !== connectedClient) {
      setError('Reconnect before saving. Your edits are still here.');
      return false;
    }
    setSaving(true);
    setError(null);
    try {
      await client.savePluginCode(pluginId, code, source.revision);
      setSource(await client.getPluginCode(pluginId));
      return true;
    } catch (reason) {
      setError(message(reason, 'Could not save. Your edits are still here.'));
      return false;
    } finally {
      setSaving(false);
    }
  }, [client, connectedClient, pluginId, saving, source]);

  return { source, error, saving, save, reload: () => setAttempt((value) => value + 1) };
}
