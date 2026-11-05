import React, { useMemo } from "react";
import { StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from "react-native-reanimated";
import { spacing } from "../../theme/theme";

const GAP = spacing.sm;
const SPRING = { damping: 24, stiffness: 260, mass: 0.8 };

type Drag = {
  from: SharedValue<number>;
  to: SharedValue<number>;
  y: SharedValue<number>;
  heights: SharedValue<number[]>;
};

function vibrate() {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}

function ChainStepSlot({ index, count, drag, enabled, onMove, children }: {
  index: number;
  count: number;
  drag: Drag;
  enabled: boolean;
  onMove: (from: number, to: number) => void;
  children: React.ReactNode;
}) {
  const { from, to, y, heights } = drag;

  const pan = useMemo(() => Gesture.Pan()
    .enabled(enabled && count > 1)
    .activateAfterLongPress(280)
    .minDistance(0)
    .onStart(() => {
      from.value = index;
      to.value = index;
      y.value = 0;
      runOnJS(vibrate)();
    })
    .onUpdate((event) => {
      y.value = event.translationY;
      // Dragged card's centre decides which slot it hovers over.
      const sizes = heights.value;
      let top = 0;
      for (let i = 0; i < index; i++) top += sizes[i] + GAP;
      const centre = top + sizes[index] / 2 + event.translationY;
      let target = 0;
      let edge = sizes[0] ?? 0;
      while (target < count - 1 && centre > edge + GAP / 2) {
        target++;
        edge += GAP + sizes[target];
      }
      to.value = target;
    })
    .onEnd(() => {
      const target = to.value;
      from.value = -1;
      y.value = withSpring(0, SPRING);
      if (target !== index) runOnJS(onMove)(index, target);
    })
    .onFinalize(() => {
      from.value = -1;
    }), [count, enabled, from, heights, index, onMove, to, y]);

  const style = useAnimatedStyle(() => {
    const dragged = from.value === index;
    let shift = 0;
    if (from.value >= 0 && !dragged) {
      const pitch = heights.value[from.value] + GAP;
      if (from.value < index && index <= to.value) shift = -pitch;
      else if (to.value <= index && index < from.value) shift = pitch;
    }
    return {
      zIndex: dragged ? 1 : 0,
      opacity: dragged ? 0.92 : 1,
      transform: [
        { translateY: dragged ? y.value : withSpring(shift, SPRING) },
        { scale: withSpring(dragged ? 1.02 : 1, SPRING) },
      ],
    };
  });

  return <GestureDetector gesture={pan}>
    <Animated.View
      style={style}
      onLayout={(event) => {
        const next = [...heights.value];
        next[index] = event.nativeEvent.layout.height;
        heights.value = next;
      }}
    >
      {children}
    </Animated.View>
  </GestureDetector>;
}

/** Vertical list whose children can be long-pressed and dragged to reorder. */
export function ChainStepList({ count, enabled, onMove, children }: {
  count: number;
  enabled: boolean;
  onMove: (from: number, to: number) => void;
  children: React.ReactNode;
}) {
  const drag: Drag = {
    from: useSharedValue(-1),
    to: useSharedValue(-1),
    y: useSharedValue(0),
    heights: useSharedValue<number[]>([]),
  };
  return <Animated.View style={styles.list}>
    {React.Children.map(children, (child, index) => (
      <ChainStepSlot index={index} count={count} drag={drag} enabled={enabled} onMove={onMove}>{child}</ChainStepSlot>
    ))}
  </Animated.View>;
}

const styles = StyleSheet.create({
  list: { gap: GAP },
});
