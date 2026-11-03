import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SectionHeader, Txt } from '../ui';
import { NativeIcon } from '../NativeIcon';
import { DashboardScriptCard } from './DashboardScriptCard';
import { useProfileScriptInfos, type ProfileScriptInfo } from '../../hooks/useProfileScriptInfos';
import { useStore } from '../../store/store';
import { colors, font, spacing } from '../../theme/theme';

export type DashboardScriptItem = ProfileScriptInfo & {
  isPlugin?: boolean;
};

export const DashboardScripts: React.FC = React.memo(() => {
  const router = useRouter();
  const profileScripts = useProfileScriptInfos();
  const pluginData = useStore((state) => state.settings.pluginData);
  const installed = useStore((state) => state.macros.list);

  const allScripts = useMemo(() => {
    const list: DashboardScriptItem[] = profileScripts.map((s) => ({
      ...s,
      isPlugin: false,
    }));
    const existingIds = new Set(profileScripts.map((s) => s.pluginId));

    const pinnedIds = Object.entries(pluginData ?? {})
      .filter(([_, data]) => data?.pinned)
      .map(([id]) => id);

    for (const pluginId of pinnedIds) {
      if (existingIds.has(pluginId)) continue;
      const plugin = installed.find((p) => p.pluginId === pluginId);
      if (plugin) {
        list.push({
          id: plugin.pluginId,
          pluginId: plugin.pluginId,
          name: plugin.name,
          description: plugin.description || '',
          banner: plugin.banner,
          theme: plugin.theme,
          info: plugin,
          isPlugin: true,
        });
        existingIds.add(pluginId);
      }
    }

    return list;
  }, [profileScripts, pluginData, installed]);

  if (allScripts.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerWrap}>
        <SectionHeader
          title="Scripts"
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        nestedScrollEnabled
      >
        {allScripts.map((script) => (
          <DashboardScriptCard key={script.id} script={script} />
        ))}
      </ScrollView>
    </View>
  );
});

DashboardScripts.displayName = 'DashboardScripts';

const styles = StyleSheet.create({
  container: {
    marginHorizontal: -spacing.lg,
  },
  headerWrap: {
    paddingHorizontal: spacing.lg,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    paddingBottom: spacing.xs,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllText: {
    color: colors.primary,
    fontSize: font.size.sm,
    fontWeight: '600',
  },
});
