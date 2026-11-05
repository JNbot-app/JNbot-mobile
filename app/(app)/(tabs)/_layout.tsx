import React, { useEffect } from "react";
import { useRouter, useSegments } from "expo-router";
import { Icon, Label, NativeTabs, VectorIcon } from "expo-router/unstable-native-tabs";
import { MaterialIcons } from "@expo/vector-icons";
import type { SFSymbol } from "expo-symbols";
import { colors, useTheme } from "../../../src/theme/theme";
import {
  selectCanUseAccounts,
  selectCanUseActiveBots,
  selectCanUseScripts,
  useStore,
} from "../../../src/store/store";

type TabName = "dashboard" | "bots" | "automation" | "alts";

const tab = (
  name: TabName,
  title: string,
  sf: SFSymbol,
  material: keyof typeof MaterialIcons.glyphMap,
  hidden = false,
) => (
  <NativeTabs.Trigger key={name} name={name} hidden={hidden}>
    <Label>{title}</Label>
    <Icon sf={sf} androidSrc={<VectorIcon family={MaterialIcons} name={material} />} />
  </NativeTabs.Trigger>
);

export default function TabLayout() {
  const { theme } = useTheme();
  const router = useRouter();
  const current = useSegments().at(-1);
  const allowed: Record<TabName, boolean> = {
    dashboard: true,
    bots: useStore(selectCanUseActiveBots),
    automation: useStore(selectCanUseScripts),
    alts: useStore(selectCanUseAccounts),
  };
  const currentBlocked = current !== undefined && current in allowed && !allowed[current as TabName];

  // Native tabs can't render a hidden focused tab, so leave it visible until we've moved away.
  useEffect(() => {
    if (currentBlocked) router.replace("/dashboard");
  }, [currentBlocked, router]);

  const hidden = (name: TabName) => !allowed[name] && current !== name;

  return (
    <NativeTabs
      key={theme}
      backBehavior="history"
      tintColor={colors.primary}
      iconColor={{ default: colors.textFaint, selected: colors.primary }}
      labelStyle={{ default: { color: colors.textFaint }, selected: { color: colors.primary } }}
      backgroundColor={process.env.EXPO_OS === "android" ? colors.bgElevated : undefined}
      indicatorColor={colors.primarySoft}
      labelVisibilityMode="labeled"
    >
      {tab("dashboard", "Overview", "square.grid.2x2", "grid-view")}
      {tab("bots", "Bots", "cpu", "smart-toy", hidden("bots"))}
      {tab("automation", "Automation", "point.3.connected.trianglepath.dotted", "account-tree", hidden("automation"))}
      {tab("alts", "Accounts", "person.2", "people-outline", hidden("alts"))}
    </NativeTabs>
  );
}
