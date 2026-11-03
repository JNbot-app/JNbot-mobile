import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import {
  previewNeedsCheck,
  type MarketEntry,
  type ShareInstallInput,
  type SharePreview,
} from '../../generated/client-contract/share';
import type { ConflictAction } from '../../components/ConflictChoices';
import { useConnection } from '../../net/ConnectionProvider';
import { useStore } from '../../store/store';

export const pluginKey = (plugin: SharePreview['plugins'][number]) => `${plugin.ownerId}:${plugin.pluginId}`;

/**
 * Installs shares and then opens what they added: a profile becomes the active one,
 * chains open their page, plugins and triggers their list.
 */
export function useInstallShare() {
  const router = useRouter();
  const { shareAction, selectProfile } = useConnection();
  const profileKey = useStore((state) => state.activeProfileKey);

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
    async (preview: SharePreview, actions: Record<string, ConflictAction> = {}, trustPublisher = false) => {
      const { localRef } = await shareAction<{ localRef: string }>('SHARE_INSTALL', {
        id: preview.id,
        decisions: preview.plugins.map((plugin) => ({
          ownerId: plugin.ownerId,
          pluginId: plugin.pluginId,
          revision: plugin.revision,
          action: actions[pluginKey(plugin)] ?? 'replace',
          acceptUnverified: true,
        })),
        trustPublisher,
        ...(preview.kind === 'chain' || preview.kind === 'trigger' ? { profileKey: profileKey ?? undefined } : {}),
      } satisfies ShareInstallInput);
      await openInstalled(preview.kind, localRef);
    },
    [openInstalled, profileKey, shareAction],
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
