import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { SearchField } from '../../src/components/SearchField';
import { NativeIcon } from '../../src/components/NativeIcon';
import { EmptyState, Txt } from '../../src/components/ui';
import { MarketFeatured } from '../../src/features/marketplace/MarketFeatured';
import { useInstallShare } from '../../src/features/marketplace/useInstallShare';
import { MarketRow, ROW_INSET } from '../../src/features/marketplace/MarketRow';
import { MarketShelf, PER_COLUMN, ShelfHeader } from '../../src/features/marketplace/MarketShelf';
import { useMarket, useShareActions, useShares } from '../../src/features/shares';
import {
  SHARE_KINDS,
  SHARE_KIND_INFO,
  isShareKind,
  shareInstallKey,
  shareInstallState,
  shareMatchesServer,
  type MarketEntry,
  type ShareKind,
} from '../../src/generated/client-contract/share';
import { colors, font, radii, spacing } from '../../src/theme/theme';
import { selectCanUsePlugins, useStore } from '../../src/store/store';
import { useFeedback } from '../../src/components/AppFeedback';

type MarketType = ShareKind | 'all';
const FEATURED_COUNT = 5;

const matches = (entry: MarketEntry, query: string) =>
  !query ||
  [entry.listing.title, entry.listing.description, entry.publisher.name, ...entry.listing.items.map((item) => item.name)].some(
    (text) => text.toLowerCase().includes(query),
  );

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Txt variant="label" style={[styles.chipLabel, active && styles.chipLabelActive]}>{label}</Txt>
    </Pressable>
  );
}

/** Every kind on one page in shelves; a type chip shows the full list of one kind. */
const Separator = () => <View style={styles.separator} />;

export default function MarketplaceScreen() {
  const { showMessage } = useFeedback();
  const router = useRouter();
  const params = useLocalSearchParams<{ kind?: string }>();
  const canUsePlugins = useStore(selectCanUsePlugins);
  const serverId = useStore((state) => state.activeProfileKey);
  const { entries, loading, error } = useMarket();
  const installed = useShares((state) => state.installed);
  const appVersion = useShares((state) => state.appVersion);
  const { loadMarket } = useShareActions();
  const [type, setType] = useState<MarketType>(isShareKind(params.kind) ? params.kind : 'all');
  const [allProfiles, setAllProfiles] = useState(false);
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const { quickInstall } = useInstallShare();

  useEffect(() => {
    if (canUsePlugins) void loadMarket();
  }, [canUsePlugins, loadMarket]);

  const byKind = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const scoped = (entries ?? []).filter(
      (entry) =>
        (allProfiles || entry.kind === 'profile' || shareMatchesServer(entry.listing.servers, serverId)) && matches(entry, needle),
    );
    return Object.fromEntries(
      SHARE_KINDS.map((kind) => [kind, scoped.filter((entry) => entry.kind === kind).sort((a, b) => b.updatedAt - a.updatedAt)]),
    ) as Record<ShareKind, MarketEntry[]>;
  }, [entries, allProfiles, serverId, query]);

  const featured = useMemo(
    () => (type === 'all' && !query ? SHARE_KINDS.flatMap((kind) => (kind === 'plugin' || kind === 'bundle' ? byKind[kind] : [])).filter((entry) => entry.bannerUrl).sort((a, b) => b.updatedAt - a.updatedAt).slice(0, FEATURED_COUNT) : []),
    [type, query, byKind],
  );
  if (!canUsePlugins) {
    return (
      <Screen title="Marketplace" back>
        <EmptyState
          icon={<NativeIcon sf="lock.fill" material="lock" size={48} color={colors.textFaint} />}
          title="Marketplace disabled"
          subtitle="Your remote access link does not have permission to browse or install marketplace items."
        />
      </Screen>
    );
  }

  const open = (entry: MarketEntry) => router.push({ pathname: '/(app)/share/[id]', params: { id: entry.id } });
  // Anything that needs a closer look (unknown publisher, conflicts) opens its page instead.
  const get = async (entry: MarketEntry) => {
    setBusyId(entry.id);
    try {
      if (!(await quickInstall(entry))) open(entry);
      else showMessage(`${entry.listing.title} installed`, 'success');
    } catch (cause) {
      showMessage(`Could not install: ${cause instanceof Error ? cause.message : String(cause)}`, 'error');
    }
    setBusyId(null);
  };
  const row = (entry: MarketEntry) => (
    <MarketRow
      key={entry.id}
      entry={entry}
      installState={shareInstallState(
        installed[shareInstallKey(entry.id, entry.kind, serverId)],
        entry.revision,
        entry.listing.minAppVersion,
        appVersion,
        entry.publisher.own,
      )}
      busy={busyId === entry.id}
      onPress={() => open(entry)}
      onGet={() => void get(entry)}
    />
  );
  const rows: Array<ShareKind | MarketEntry> =
    type === 'all' ? SHARE_KINDS.filter((kind) => byKind[kind].length) : byKind[type];

  return (
    <Screen title="Marketplace" back>
      <FlatList<ShareKind | MarketEntry>
        data={rows}
        keyExtractor={(row) => (typeof row === 'string' ? row : row.id)}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={<RefreshControl refreshing={loading && !!entries} onRefresh={() => void loadMarket(true)} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View style={{ gap: spacing.md, marginBottom: spacing.lg }}>
            <SearchField accessibilityLabel="Search marketplace" value={query} onChangeText={setQuery} placeholder="Plugins, profiles, chains…" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.bleed}>
              <Chip label="All" active={type === 'all'} onPress={() => setType('all')} />
              {SHARE_KINDS.map((kind) => (
                <Chip key={kind} label={SHARE_KIND_INFO[kind].plural} active={type === kind} onPress={() => setType(kind)} />
              ))}
              {type !== 'profile' ? <Chip label={allProfiles ? 'Every profile' : 'This profile'} active={allProfiles} onPress={() => setAllProfiles(!allProfiles)} /> : null}
            </ScrollView>
            {featured.length ? <MarketFeatured entries={featured} onPress={open} /> : null}
            {type !== 'all' ? <ShelfHeader kind={type} /> : null}
          </View>
        }
        renderItem={({ item }) =>
          typeof item === 'string' ? (
            <View style={styles.shelf}>
              <ShelfHeader kind={item} onSeeAll={byKind[item].length > PER_COLUMN ? () => setType(item) : undefined} />
              <MarketShelf entries={byKind[item]} renderRow={row} />
            </View>
          ) : (
            row(item)
          )
        }
        ItemSeparatorComponent={type === 'all' ? undefined : Separator}
        ListEmptyComponent={
          loading && !entries ? (
            <View style={styles.loading}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Txt variant="muted">Loading marketplace…</Txt>
            </View>
          ) : (
            <EmptyState
              icon={<NativeIcon sf={error ? 'wifi.exclamationmark' : 'magnifyingglass'} material={error ? 'wifi-off' : 'search-off'} size={40} color={colors.textFaint} />}
              title={error ? 'Marketplace unavailable' : query ? 'Nothing found' : 'Nothing here yet'}
              subtitle={error ?? (query ? 'Try a different search.' : allProfiles || type === 'profile' ? 'Pull to refresh.' : 'Try "Every profile".')}
            />
          )
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, flexGrow: 1 },
  chips: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg },
  chip: { minHeight: 36, justifyContent: 'center', paddingHorizontal: 14, borderRadius: radii.pill, borderCurve: 'continuous', backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderSubtle },
  chipActive: { backgroundColor: colors.primarySoft, borderColor: colors.primaryDim },
  chipLabel: { fontSize: font.size.caption, color: colors.textMuted },
  chipLabelActive: { color: colors.primary },
  bleed: { marginHorizontal: -spacing.lg },
  shelf: { marginBottom: spacing.lg },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: ROW_INSET, backgroundColor: colors.border },
  loading: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxxl },
});
