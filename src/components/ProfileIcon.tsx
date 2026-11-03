import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii } from '../theme/theme';

export function ProfileIcon({ uri, color = colors.primary, size = 40, radius = radii.md }: {
  uri?: string | null;
  color?: string;
  size?: number;
  radius?: number;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [uri]);

  if (uri && !failed) {
    return <Image source={{ uri }} onError={() => setFailed(true)} style={{ width: size, height: size, borderRadius: radius, backgroundColor: colors.surfaceAlt }} />;
  }

  return <View style={[styles.fallback, { width: size, height: size, borderRadius: radius, backgroundColor: `${color}22` }]}>
    <Ionicons name="server-outline" size={size * 0.52} color={color} />
  </View>;
}

const styles = StyleSheet.create({
  fallback: { alignItems: 'center', justifyContent: 'center' },
});
