import React from 'react';
import {
  Image,
  ImageStyle,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { colors, palette } from '../theme/theme';

export interface JNbotLogoProps {
  /** Size in pixels (width and height). Defaults to 48. */
  size?: number;
  /**
   * - 'badge': Rendered with the full rounded app icon artwork.
   * - 'plain': Transparent foreground logo glyph only.
   */
  variant?: 'badge' | 'plain';
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  accessibilityLabel?: string;
}

const BADGE_ASSET = require('../../assets/jnbot-badge.png');
const LOGO_ASSET = require('../../assets/jnbot-logo.png');

export function JNbotLogo({
  size = 48,
  variant = 'badge',
  style,
  imageStyle,
  accessibilityLabel = 'JNbot Logo',
}: JNbotLogoProps) {
  const borderRadius = Math.round(size * 0.225);

  if (variant === 'plain') {
    return (
      <View
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="image"
        style={[styles.plainContainer, { width: size, height: size }, style]}
      >
        <Image
          source={LOGO_ASSET}
          style={[
            { width: size, height: size, resizeMode: 'contain' },
            imageStyle,
          ]}
        />
      </View>
    );
  }

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
      style={[
        styles.badgeContainer,
        {
          width: size,
          height: size,
          borderRadius,
        },
        style,
      ]}
    >
      <Image
        source={BADGE_ASSET}
        style={[
          styles.badgeImage,
          {
            width: size,
            height: size,
            borderRadius,
            resizeMode: 'cover',
          },
          imageStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  plainContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    borderCurve: 'continuous',
    overflow: 'hidden',
    backgroundColor: colors.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  badgeImage: {
    backgroundColor: colors.bgElevated,
  },
});
