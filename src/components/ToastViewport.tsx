import React, { useCallback, useEffect } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { actions, type ToastMessage, useStore } from "../store/store";
import { Txt } from "./ui";
import { colors, font, radii, spacing, palette } from "../theme/theme";

export function ToastViewport() {
  const toast = useStore((state) => state.toasts[0]);
  const queueLength = useStore((state) => state.toasts.length);
  const insets = useSafeAreaInsets();

  if (!toast) return null;

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.viewport,
        { top: insets.top + (Platform.OS === "android" ? 10 : 8) },
      ]}
    >
      <ToastItem
        key={toast.id}
        toast={toast}
        autoDismissMs={queueLength > 1 ? 2000 : 3400}
      />
    </View>
  );
}

function ToastItem({
  toast,
  autoDismissMs,
}: {
  toast: ToastMessage;
  autoDismissMs: number;
}) {
  const reducedMotion = useReducedMotion();
  const translateY = useSharedValue(reducedMotion ? 0 : -50);
  const opacity = useSharedValue(reducedMotion ? 1 : 0);
  const scale = useSharedValue(reducedMotion ? 1 : 0.92);
  // Gesture callbacks run as worklets. Keep their mutable guard in a shared
  // value instead of a React ref, which would be frozen when captured.
  const dismissing = useSharedValue(false);

  const dismiss = useCallback(() => {
    if (dismissing.value) return;
    dismissing.value = true;

    if (reducedMotion) {
      actions.dismissToast(toast.id);
      return;
    }

    opacity.value = withTiming(0, { duration: 160 });
    scale.value = withTiming(0.92, { duration: 180 });
    translateY.value = withTiming(-50, { duration: 180 }, (finished) => {
      if (finished) {
        runOnJS(actions.dismissToast)(toast.id);
      }
    });
  }, [dismissing, reducedMotion, toast.id]);

  useEffect(() => {
    // Haptic feedback
    if (toast.type === "success") {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    } else if (toast.type === "error") {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
    } else if (toast.type === "warning") {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
    } else {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    }

    // Entrance animation
    if (!reducedMotion) {
      translateY.value = withSpring(0, { damping: 18, stiffness: 220, mass: 0.8 });
      opacity.value = withTiming(1, { duration: 180 });
      scale.value = withSpring(1, { damping: 18, stiffness: 220, mass: 0.8 });
    }

    const timer = setTimeout(() => {
      dismiss();
    }, autoDismissMs);

    return () => clearTimeout(timer);
  }, [autoDismissMs, dismiss, reducedMotion, toast.type]);

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (dismissing.value) return;
      if (event.translationY < 0) {
        translateY.value = event.translationY;
        opacity.value = Math.max(0.15, 1 + event.translationY / 60);
      } else {
        translateY.value = Math.min(10, event.translationY * 0.25);
      }
    })
    .onEnd((event) => {
      if (dismissing.value) return;
      if (event.translationY < -15 || event.velocityY < -300) {
        runOnJS(dismiss)();
      } else {
        translateY.value = withSpring(0, { damping: 18, stiffness: 220 });
        opacity.value = withTiming(1, { duration: 150 });
      }
    });

  const tapGesture = Gesture.Tap().onEnd(() => {
    runOnJS(dismiss)();
  });

  const gesture = Gesture.Race(panGesture, tapGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
    opacity: opacity.value,
  }));

  const meta = getToastSeverityMeta(toast.type);

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        accessibilityLabel={toast.title}
        style={[styles.pill, animatedStyle]}
      >
        <Ionicons name={meta.icon} size={20} color={meta.color} />
        <Txt variant="body" numberOfLines={2} style={styles.title}>
          {toast.title}
        </Txt>
      </Animated.View>
    </GestureDetector>
  );
}

export function getToastSeverityMeta(type: string) {
  if (type === "success") {
    return {
      color: colors.success,
      icon: "checkmark-circle" as const,
    };
  }
  if (type === "error") {
    return {
      color: colors.danger,
      icon: "alert-circle" as const,
    };
  }
  if (type === "warning") {
    return {
      color: colors.warning,
      icon: "warning" as const,
    };
  }
  return {
    color: colors.info,
    icon: "information-circle" as const,
  };
}

const styles = StyleSheet.create({
  viewport: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    alignItems: "center",
    zIndex: 99999,
    elevation: 999,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.bgElevated,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 3,
    borderWidth: 1,
    borderColor: colors.border,
    maxWidth: 420,
    // iOS shadow
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    // Android elevation
    elevation: 12,
  },
  title: {
    fontSize: font.size.sm,
    lineHeight: 19,
    fontWeight: "600",
    color: colors.text,
    flexShrink: 1,
  },
});
