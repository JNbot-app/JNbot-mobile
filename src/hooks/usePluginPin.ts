import { useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import { useClient } from '../net/ConnectionProvider';
import { actions, useStore } from '../store/store';
import { useFeedback } from '../components/AppFeedback';
import type { JNbotClient } from '../client/JNbotClient';

export async function togglePluginPin(
  client: Pick<JNbotClient, 'profileAction' | 'updateSettings'> | null | undefined,
  pluginId: string,
  showMessage?: (text: string, type?: 'success' | 'error' | 'warning' | 'info') => void,
): Promise<boolean> {
  if (!pluginId) return false;

  const currentPluginData = useStore.getState().settings.pluginData ?? {};
  const currentlyPinned = Boolean(currentPluginData[pluginId]?.pinned);
  const nextPinned = !currentlyPinned;

  const nextPluginData = {
    ...currentPluginData,
    [pluginId]: {
      ...currentPluginData[pluginId],
      pinned: nextPinned,
    },
  };

  if (process.env.EXPO_OS === 'ios') {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }

  actions.applySettingsPatches({
    path: ['pluginData', pluginId],
    value: { pinned: nextPinned },
  });

  if (client) {
    try {
      await client.profileAction('UPDATE_PLUGIN_DATA', nextPluginData);
    } catch {
      void client.updateSettings({
        path: ['pluginData', pluginId],
        value: { pinned: nextPinned },
      }).catch(() => {});
    }
  }

  showMessage?.(
    nextPinned ? 'Pinned to dashboard' : 'Unpinned from dashboard',
    'success',
  );

  return nextPinned;
}

export function usePluginPin(pluginId?: string) {
  const client = useClient();
  const { showMessage } = useFeedback();
  const pluginData = useStore((state) => state.settings.pluginData);
  const isPinned = Boolean(pluginId && pluginData?.[pluginId]?.pinned);

  const togglePin = useCallback(
    (targetPluginId?: string) => {
      const id = targetPluginId || pluginId;
      if (!id) return;
      return togglePluginPin(client, id, showMessage);
    },
    [client, pluginId, showMessage],
  );

  return { isPinned, togglePin };
}
