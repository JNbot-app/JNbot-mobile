import React, { useCallback, useEffect } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radii, spacing, useTheme } from "../theme/theme";

export function BottomSheet({
  visible,
  onClose,
  children,
  accessibilityLabel = "Menu",
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  accessibilityLabel?: string;
}) {
  useTheme();
  const { height } = useWindowDimensions();
  const translateY = useSharedValue(height);
  const dragStart = useSharedValue(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!visible) return;
    translateY.value = reducedMotion
      ? 0
      : withSpring(0, { damping: 24, stiffness: 240, mass: 0.9 });
  }, [reducedMotion, translateY, visible]);

  const dismiss = useCallback(() => {
    if (reducedMotion) {
      onClose();
      return;
    }
    translateY.value = withTiming(height, { duration: 190 }, (finished) => {
      if (finished) runOnJS(onClose)();
    });
  }, [height, onClose, reducedMotion, translateY]);

  const pan = Gesture.Pan()
    .onBegin(() => {
      dragStart.value = translateY.value;
    })
    .onUpdate((event) => {
      translateY.value = Math.max(0, dragStart.value + event.translationY);
    })
    .onEnd((event) => {
      if (event.translationY > 90 || event.velocityY > 850) {
        translateY.value = withTiming(height, { duration: 190 }, (finished) => {
          if (finished) runOnJS(onClose)();
        });
      } else {
        translateY.value = withSpring(0, { damping: 24, stiffness: 240 });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: Math.max(0, Math.min(1, 1 - translateY.value / (height * 0.55))),
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={dismiss}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.root}
      >
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
          <Pressable
            accessibilityLabel="Close menu"
            style={StyleSheet.absoluteFill}
            onPress={dismiss}
          />
        </Animated.View>
        <GestureDetector gesture={pan}>
          <Animated.View
            accessibilityViewIsModal
            accessibilityLabel={accessibilityLabel}
            style={[styles.sheet, sheetStyle]}
          >
            <SafeAreaView edges={["bottom", "left", "right"]}>
              <View style={styles.handleArea}>
                <View style={styles.handle} />
              </View>
              {children}
            </SafeAreaView>
          </Animated.View>
        </GestureDetector>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  backdrop: { backgroundColor: colors.overlay },
  sheet: {
    maxHeight: "82%",
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderWidth: 0,
    backgroundColor: colors.bgElevated,
    overflow: "hidden",
    borderCurve: 'continuous',
  },
  handleArea: {
    minHeight: 28,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: spacing.xs,
  },
  handle: {
    width: 38,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.textFaint,
  },
});
