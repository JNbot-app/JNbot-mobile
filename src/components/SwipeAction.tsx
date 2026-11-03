import React from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import type { SFSymbol } from 'expo-symbols';
import type { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { NativeIcon } from './NativeIcon';
import { Txt } from './ui';
import { colors, font, spacing, palette } from '../theme/theme';

/** Reveals one destructive action when the row is swiped left, like native list rows. */
export function SwipeAction({
  label,
  sf,
  material,
  onPress,
  enabled = true,
  contentStyle,
  containerStyle,
  children,
}: {
  label: string;
  sf: SFSymbol;
  material: keyof typeof MaterialIcons.glyphMap;
  onPress: () => void;
  enabled?: boolean;
  /** Style of the sliding content, which needs an opaque background. */
  contentStyle?: StyleProp<ViewStyle>;
  /** Clips the revealed action, e.g. to a card's rounded corners. */
  containerStyle?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  if (!enabled) return <>{children}</>;
  return (
    <ReanimatedSwipeable
      friction={2}
      rightThreshold={40}
      overshootRight={false}
      containerStyle={containerStyle}
      childrenContainerStyle={contentStyle}
      renderRightActions={(_progress, _translation, swipeable) => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          onPress={() => {
            if (process.env.EXPO_OS === 'ios') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            swipeable.close();
            onPress();
          }}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}
        >
          <NativeIcon sf={sf} material={material} size={20} color={palette.white} />
          <Txt variant="none" style={styles.label}>{label}</Txt>
        </Pressable>
      )}
    >
      {children}
    </ReanimatedSwipeable>
  );
}

const styles = StyleSheet.create({
  action: { width: 88, alignItems: 'center', justifyContent: 'center', gap: spacing.xs, backgroundColor: colors.danger },
  pressed: { opacity: 0.8 },
  label: { color: palette.white, fontSize: font.size.xs, fontWeight: '600' },
});
