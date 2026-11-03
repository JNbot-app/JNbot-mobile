import React, { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useConnection } from '../net/ConnectionProvider';
import { EmbeddedNodeBridge, type StorageStatus } from '../runtime/EmbeddedNodeBridge';
import { colors } from '../theme/theme';
import { IconButton } from './ui';
import { NativeIcon } from './NativeIcon';

const bridge = new EmbeddedNodeBridge();

export function DropboxStorageIndicator({ onPress }: { onPress: () => void }) {
  const { mode, status } = useConnection();
  const [active, setActive] = useState(false);

  useFocusEffect(useCallback(() => {
    setActive(false);
    if (mode !== 'local' || status !== 'connected') return;
    let cancelled = false;
    void bridge.requestStorage<StorageStatus>('status').then((storage) => {
      if (!cancelled) setActive(storage.mode === 'dropbox');
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [mode, status]));

  if (!active) return null;

  return (
    <IconButton accessibilityLabel="Dropbox storage: open storage settings" bg="transparent" onPress={onPress}>
      <NativeIcon sf="cloud" material="cloud-queue" size={21} color={colors.primary} />
    </IconButton>
  );
}
