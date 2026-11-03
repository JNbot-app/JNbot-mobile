import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, radii } from '../theme/theme';
import { StatusDot, Txt } from './ui';
import { useConnection } from '../net/ConnectionProvider';

const META: Record<string, { label: string; color: string }> = {
  connected: { label: 'Online', color: colors.online },
  signaling: { label: 'Connecting', color: colors.warning },
  negotiating: { label: 'Connecting', color: colors.warning },
  synchronizing: { label: 'Syncing', color: colors.warning },
  connecting: { label: 'Connecting', color: colors.warning },
  reconnecting: { label: 'Reconnecting', color: colors.warning },
  error: { label: 'Error', color: colors.danger },
  disconnected: { label: 'Offline', color: colors.offline },
  idle: { label: 'Offline', color: colors.offline },
};

export function ConnectionPill() {
  const { status } = useConnection();
  const meta = META[status] ?? META.idle;
  return (
    <View style={styles.pill}>
      <StatusDot color={meta.color} pulse={status === 'connected'} />
      <Txt variant="muted" style={{ color: meta.color, fontWeight: '600' }}>
        {meta.label}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
});
