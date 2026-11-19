import React, { useMemo } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Txt } from "../ui";
import { SettingsGroup } from "./SettingsGroup";
import { useConnection } from "../../net/ConnectionProvider";
import { colors, getAvailableThemes, radii, spacing, useTheme, type Themes } from "../../theme/theme";

export function AppearanceSettings() {
  const { client, status } = useConnection();
  const { theme, setTheme } = useTheme();
  const themes = useMemo(() => getAvailableThemes(), []);

  const select = (id: Themes) => {
    setTheme(id);
    if (Platform.OS === "ios") void Haptics.selectionAsync().catch(() => undefined);
    if (client && status === "connected") {
      void client.updateAppSettings([{ key: "theme", value: id }]).catch(() => undefined);
    }
  };

  return (
    <SettingsGroup title="Theme">
      {themes.map((item) => {
        const selected = theme === item.id;
        return (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={`${item.name} theme`}
            onPress={() => select(item.id)}
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
          >
            <View style={[styles.swatch, { backgroundColor: item.bgColor, borderColor: item.surfaceColor }]}>
              <View style={[styles.swatchSurface, { backgroundColor: item.surfaceColor }]}>
                <View style={[styles.swatchDot, { backgroundColor: item.primaryColor }]} />
              </View>
            </View>
            <View style={styles.grow}>
              <Txt variant="body">{item.name}</Txt>
              <Txt variant="faint" numberOfLines={1}>{item.description}</Txt>
            </View>
            {selected ? <Ionicons name="checkmark" size={22} color={colors.primary} /> : null}
          </Pressable>
        );
      })}
    </SettingsGroup>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  grow: { flex: 1, minWidth: 0 },
  swatch: { width: 34, height: 34, borderRadius: radii.sm, borderWidth: 1, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  swatchSurface: { width: 22, height: 22, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  swatchDot: { width: 9, height: 9, borderRadius: 5 },
});
