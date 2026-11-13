import React, { useEffect, useState } from 'react';
import { Keyboard, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { NativeIcon } from '../NativeIcon';
import { colors, radii, spacing } from '../../theme/theme';
import { codeTextStyle } from './codeTheme';

/** Characters a phone keyboard hides behind extra taps, in rough order of use in plugin code. */
const KEYS = ['{', '}', '(', ')', '[', ']', ';', '.', '=', "'", '"', '`', ':', ',', '=>', '!', '&', '|', '<', '>', '+', '-', '*', '/', '?', '$'];

const SHOW = process.env.EXPO_OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
const HIDE = process.env.EXPO_OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

/** Whether an on-screen keyboard is up; false with a hardware keyboard. */
function useKeyboardShown() {
  const [shown, setShown] = useState(Keyboard.isVisible());
  useEffect(() => {
    const subs = [Keyboard.addListener(SHOW, () => setShown(true)), Keyboard.addListener(HIDE, () => setShown(false))];
    return () => subs.forEach((sub) => sub.remove());
  }, []);
  return shown;
}

const tap = () => {
  if (process.env.EXPO_OS === 'ios') Haptics.selectionAsync().catch(() => {});
};

function Key({ label, onPress, disabled, children }: { label: string; onPress: () => void; disabled?: boolean; children?: React.ReactNode }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [styles.key, pressed && styles.pressed, disabled && styles.disabled]}
    >
      {children ?? <Text style={styles.keyText}>{label}</Text>}
    </Pressable>
  );
}

/** Row above the keyboard while editing code: indent, symbols, undo and hide keyboard. */
export function CodeKeyBar({
  onInsert,
  onUndo,
  canUndo,
  onDone,
}: {
  onInsert: (text: string) => void;
  onUndo: () => void;
  canUndo: boolean;
  onDone: () => void;
}) {
  const { bottom } = useSafeAreaInsets();
  // Above a software keyboard the bar sits on it; otherwise it must clear the home indicator / nav bar.
  const keyboardShown = useKeyboardShown();
  return (
    <View style={[styles.bar, { paddingBottom: keyboardShown ? spacing.xs : Math.max(spacing.xs, bottom) }]}>
      <Key label="Indent" onPress={() => onInsert('\t')}>
        <NativeIcon sf="arrow.right.to.line" material="keyboard-tab" size={18} color={colors.text} />
      </Key>
      <ScrollView
        horizontal
        keyboardShouldPersistTaps="always"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.keys}
        style={styles.scroller}
      >
        {KEYS.map((key) => <Key key={key} label={key} onPress={() => onInsert(key)} />)}
      </ScrollView>
      <Key label="Undo" disabled={!canUndo} onPress={onUndo}>
        <NativeIcon sf="arrow.uturn.backward" material="undo" size={18} color={colors.text} />
      </Key>
      <Key label="Hide keyboard" onPress={onDone}>
        <NativeIcon sf="keyboard.chevron.compact.down" material="keyboard-hide" size={20} color={colors.text} />
      </Key>
    </View>
  );
}

const KEY_SIZE = process.env.EXPO_OS === 'android' ? 48 : 44;

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    backgroundColor: colors.bgElevated,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  scroller: { flex: 1 },
  keys: { gap: spacing.xs },
  key: {
    minWidth: 40,
    height: KEY_SIZE,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
    borderCurve: 'continuous',
    backgroundColor: colors.surfaceAlt,
  },
  keyText: { ...codeTextStyle, fontSize: 17, lineHeight: 22 },
  pressed: { backgroundColor: colors.surfaceHover },
  disabled: { opacity: 0.4 },
});
