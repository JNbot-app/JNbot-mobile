import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import {
  defaultPluginAction,
  previewNeedsCheck,
  type MarketEntry,
  type ShareInstallInput,
  type SharePluginAction,
  type SharePreview,
} from '../../generated/client-contract/share';
import { useConnection } from '../../net/ConnectionProvider';
import { useStore } from '../../store/store';

export const pluginKey = (plugin: SharePreview['plugins'][number]) => `${plugin.ownerId}:${plugin.pluginId}`;

/**
 * Installs shares without navigating; only an installed profile becomes the active one.
 * `openInstalled` opens an already installed item on its page.
 */
export function useInstallShare() {
  const router = useRouter();
  const { shareAction, selectProfile } = useConnection();
  const profileKey = useStore((state) => state.activeProfileKey);

  const activateInstalled = useCallback(
    async (kind: SharePreview['kind'], localRef: string) => {
      if (kind === 'profile') await selectProfile(localRef);
    },
    [selectProfile],
  );

  const openInstalled = useCallback(
    async (kind: SharePreview['kind'], localRef: string) => {
      if (kind === 'profile') {
        await selectProfile(localRef);
        router.replace('/(app)/dashboard');
        return;
      }
      router.dismissAll();
      if (kind === 'chain') router.push({ pathname: '/(app)/chains/[chainId]', params: { chainId: localRef } });
      else router.navigate({ pathname: '/(app)/automation', params: { section: kind === 'trigger' ? 'triggers' : 'plugins' } });
    },
    [router, selectProfile],
  );

  const install = useCallback(
    async (preview: SharePreview, actions: Record<string, SharePluginAction> = {}, trustPublisher = false) => {
      const { localRef } = await shareAction<{ localRef: string }>('SHARE_INSTALL', {
        id: preview.id,
        decisions: preview.plugins.map((plugin) => ({
          ownerId: plugin.ownerId,
          pluginId: plugin.pluginId,
          revision: plugin.revision,
          action: actions[pluginKey(plugin)] ?? defaultPluginAction(plugin),
          acceptUnverified: true,
        })),
        trustPublisher,
        ...(preview.kind === 'chain' || preview.kind === 'trigger' ? { profileKey: profileKey ?? undefined } : {}),
      } satisfies ShareInstallInput);
      await activateInstalled(preview.kind, localRef);
    },
    [activateInstalled, profileKey, shareAction],
  );

  /** One-tap install from the catalog. Returns false when the share needs a closer look first. */
  const quickInstall = useCallback(
    async (entry: MarketEntry) => {
      const preview = await shareAction<SharePreview>('SHARE_PREVIEW', { link: entry.id, profileKey: profileKey ?? undefined });
      if (previewNeedsCheck(preview)) return false;
      await install(preview);
      return true;
    },
    [install, profileKey, shareAction],
  );

  return { install, quickInstall, openInstalled };
}
