import React from 'react';
import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';
import { colors, Themes } from '../theme/theme';

const FADE_ASSET = require('../../assets/background-fade.png');

export function ScreenBackground({ theme }: { theme: Themes }) {
  if (theme === Themes.NIGHT) return null;

  return (
    <Image
      source={FADE_ASSET}
      accessible={false}
      pointerEvents="none"
      contentFit="fill"
      tintColor={colors.primary}
      style={[styles.fade, { opacity: theme === Themes.LIGHT ? 0.05 : 0.15 }]}
    />
  );
}

const styles = StyleSheet.create({
  fade: { position: 'absolute', top: 0, left: 0, width: '100%', height: 360 },
});
