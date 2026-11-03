import React, { useEffect, useState } from 'react';
import { Image, View, Text, StyleSheet } from 'react-native';
import { colors, radii, palette } from '../theme/theme';

/**
 * Minecraft head avatar. Renders the player's face from mc-heads.net, falling
 * back to a colored monogram tile if the image fails (offline / no network).
 */
export function MCAvatar({
  username,
  size = 40,
  radius = radii.sm,
}: {
  username: string;
  size?: number;
  radius?: number;
}) {
  const [failed, setFailed] = useState(false);
  const [sourceIndex, setSourceIndex] = useState(0);
  const px = Math.round(size * 2);

  useEffect(() => {
    setFailed(false);
    setSourceIndex(0);
  }, [username]);

  if (failed || !username) {
    const initial = (username || '?').charAt(0).toUpperCase();
    const hue = hashHue(username);
    return (
      <View
        style={[
          styles.fallback,
          { width: size, height: size, borderRadius: radius, backgroundColor: `hsl(${hue},45%,28%)` },
        ]}
      >
        <Text style={{ color: palette.white, fontWeight: '700', fontSize: size * 0.42 }}>
          {initial}
        </Text>
      </View>
    );
  }

  const sources = [
    `https://crafthead.net/avatar/${encodeURIComponent(username)}?size=${px}&default=MHF_Steve`,
    `https://mc-heads.net/avatar/${encodeURIComponent(username)}/${px}`,
  ];

  return (
    <Image
      source={{ uri: sources[sourceIndex] }}
      onError={() => {
        if (sourceIndex < sources.length - 1) setSourceIndex((index) => index + 1);
        else setFailed(true);
      }}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor: colors.surfaceAlt,
      }}
    />
  );
}

function hashHue(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
}

const styles = StyleSheet.create({
  fallback: { alignItems: 'center', justifyContent: 'center' },
});
