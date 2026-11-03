import React from 'react';
import { useSafeAreaInsets, type Edge } from 'react-native-safe-area-context';
import { StyleSheet, View, type ViewProps, type ViewStyle } from 'react-native';

const allEdges: readonly Edge[] = ['top', 'bottom', 'left', 'right'];

function padding(value: ViewStyle['padding']) {
  return typeof value === 'number' ? value : 0;
}

export function ScreenSafeArea({
  edges = allEdges,
  style,
  ...props
}: ViewProps & { edges?: readonly Edge[] }) {
  const insets = useSafeAreaInsets();
  const base = StyleSheet.flatten(style);
  // Apply known insets in the first layout instead of waiting for native mount.
  return (
    <View
      {...props}
      style={[style, {
        paddingTop: padding(base?.paddingTop ?? base?.paddingVertical ?? base?.padding) + (edges.includes('top') ? insets.top : 0),
        paddingBottom: padding(base?.paddingBottom ?? base?.paddingVertical ?? base?.padding) + (edges.includes('bottom') ? insets.bottom : 0),
        paddingLeft: padding(base?.paddingLeft ?? base?.paddingHorizontal ?? base?.padding) + (edges.includes('left') ? insets.left : 0),
        paddingRight: padding(base?.paddingRight ?? base?.paddingHorizontal ?? base?.padding) + (edges.includes('right') ? insets.right : 0),
      }]}
    />
  );
}
