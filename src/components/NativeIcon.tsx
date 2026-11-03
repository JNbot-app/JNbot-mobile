import React from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { SymbolView, type SFSymbol } from 'expo-symbols';

export function NativeIcon({
  sf,
  material,
  size = 22,
  color,
}: {
  sf: SFSymbol;
  material: keyof typeof MaterialIcons.glyphMap;
  size?: number;
  color: string;
}) {
  if (process.env.EXPO_OS === 'ios') {
    return <SymbolView name={sf} size={size} tintColor={color} style={{ width: size, height: size }} />;
  }

  return <MaterialIcons name={material} size={size} color={color} />;
}
