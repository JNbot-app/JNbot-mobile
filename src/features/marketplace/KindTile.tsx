import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { NativeIcon } from '../../components/NativeIcon';
import type { ShareKind } from '../../generated/client-contract/share';
import { colors } from '../../theme/theme';

const ICONS = {
  plugin: { sf: 'chevron.left.forwardslash.chevron.right', material: 'code' },
  bundle: { sf: 'square.grid.2x2', material: 'apps' },
  profile: { sf: 'server.rack', material: 'dns' },
  chain: { sf: 'link', material: 'link' },
  trigger: { sf: 'bolt.fill', material: 'bolt' },
} as const;

export function KindIcon({ kind, size = 20, color }: { kind: ShareKind; size?: number; color: string }) {
  return <NativeIcon sf={ICONS[kind].sf} material={ICONS[kind].material} size={size} color={color} />;
}

/** Square tile with a profile icon, or the kind icon on the item's accent colour. */
export function KindTile({ kind, color, src, size = 44 }: { kind: ShareKind; color?: string; src?: string; size?: number }) {
  const [broken, setBroken] = useState(false);
  return (
    <View
      style={[
        styles.tile,
        { width: size, height: size, borderRadius: size * 0.225, backgroundColor: color ? `${color}2E` : colors.primarySoft },
      ]}
    >
      {src && !broken ? (
        <Image source={src} style={StyleSheet.absoluteFill} contentFit="cover" onError={() => setBroken(true)} />
      ) : (
        <KindIcon kind={kind} size={size * 0.45} color={color ?? colors.primary} />
      )}
    </View>
  );
}

/** Banner image, or the accent colour with the kind icon when there is none. */
export function KindBanner({ kind, color, src, height }: { kind: ShareKind; color?: string; src?: string; height: number }) {
  const [broken, setBroken] = useState(false);
  return (
    <View style={[styles.banner, { height, backgroundColor: color ? `${color}2E` : colors.primarySoft }]}>
      {src && !broken ? (
        <Image source={src} style={StyleSheet.absoluteFill} contentFit="cover" onError={() => setBroken(true)} />
      ) : (
        <KindIcon kind={kind} size={32} color={color ?? colors.primary} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderCurve: 'continuous' },
  banner: { width: '100%', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
