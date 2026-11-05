import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  ListRenderItem,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Screen } from '../../../src/components/Screen';
import { AddButton, Button, EmptyState, IconButton, StatusDot, Txt } from '../../../src/components/ui';
import { MCAvatar } from '../../../src/components/MCAvatar';
import { SearchField } from '../../../src/components/SearchField';
import { NativeIcon } from '../../../src/components/NativeIcon';
import { selectCanUseAccounts, useStore } from '../../../src/store/store';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useClient } from '../../../src/net/ConnectionProvider';
import { colors, font, radii, spacing } from '../../../src/theme/theme';
import type { AltTag, AltWithData } from '../../../src/store/types';
import { countAltGkits, countAltRanks } from '../../../src/features/alts';
import { AltImportModal } from '../../../src/features/alts/AltImportModal';
import { TagManagerModal } from '../../../src/features/alts/TagManagerModal';

export default function Alts() {
  const router = useRouter();
  const params = useLocalSearchParams<{ import?: string }>();
  const client = useClient();
  const canUseAccounts = useStore(selectCanUseAccounts);
  const alts = useStore((s) => s.alts);
  const canManage = useStore((s) => s.capabilities.includes('alts.manage'));
  const altTags = useStore((s) => s.settings.altTags ?? []);
  const activeBots = useStore((s) => s.activeBots);
  const [query, setQuery] = useState('');
  const [tagId, setTagId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [tagManager, setTagManager] = useState<{
    open: boolean;
    initialId: string | null;
    createNew: boolean;
  }>({
    open: false,
    initialId: null,
    createNew: false,
  });

  useEffect(() => {
    if (params.import !== '1') return;
    setImportOpen(true);
    router.setParams({ import: undefined });
  }, [params.import, router]);

  const onlineUsernames = useMemo(
    () => new Set(activeBots.flatMap((bot) => bot.username ? [bot.username.toLowerCase()] : [])),
    [activeBots],
  );

  const list = useMemo(() => {
    let l = alts;
    if (tagId) {
      const tag = altTags.find((t) => t.id === tagId);
      if (tag) {
        const set = new Set(tag.alts);
        l = l.filter((a) => set.has(a.username));
      }
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      l = l.filter((a) => a.username?.toLowerCase().includes(q));
    }
    return l;
  }, [alts, tagId, query, altTags]);

  const openOverview = useCallback((username: string) => {
    router.push({ pathname: '/(app)/alt/[username]', params: { username } });
  }, [router]);

  const renderItem = useCallback<ListRenderItem<AltWithData>>(({ item, index }) => (
    <AltRow
      alt={item}
      online={onlineUsernames.has(item.username.toLowerCase())}
      ranks={countAltRanks(item.data)}
      gkits={countAltGkits(item.data)}
      canManage={canManage}
      first={index === 0}
      last={index === list.length - 1}
      onSelect={openOverview}
    />
  ), [canManage, list.length, onlineUsernames, openOverview]);

  const listState = useMemo(
    () => ({ onlineUsernames, canManage }),
    [onlineUsernames, canManage],
  );

  if (!canUseAccounts) {
    return (
      <Screen title="Accounts" subtitle="Your accounts">
        <EmptyState
          icon={<Ionicons name="lock-closed-outline" size={32} color={colors.textFaint} />}
          title="Accounts Disabled"
          subtitle="Your access link does not have permission to view or manage accounts."
        />
      </Screen>
    );
  }

  return (
    <Screen
      title="Accounts"
      subtitle={`${alts.length} Minecraft account${alts.length === 1 ? '' : 's'}`}
      right={canManage ? (
        <>
          <IconButton accessibilityLabel="Import accounts" bg="transparent" onPress={() => setImportOpen(true)}>
            <NativeIcon sf="square.and.arrow.down" material="download" size={21} color={colors.text} />
          </IconButton>
          <AddButton accessibilityLabel="Add account" onPress={() => router.push('/(app)/alt/editor')} />
        </>
      ) : undefined}
    >
      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        data={list}
        keyExtractor={(a) => a.username}
        extraData={listState}
        initialNumToRender={16}
        maxToRenderPerBatch={20}
        updateCellsBatchingPeriod={40}
        windowSize={9}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={<AccountListHeader
          query={query}
          onChangeQuery={setQuery}
          tags={altTags}
          tagId={tagId}
          totalAltCount={alts.length}
          canManage={canManage}
          onTagPress={(id) => setTagId((current) => current === id ? null : id)}
          onTagLongPress={(id) => {
            if (!canManage) return;
            if (process.env.EXPO_OS === 'ios') {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
            setTagManager({ open: true, initialId: id, createNew: false });
          }}
          onManageTags={() => setTagManager({ open: true, initialId: tagId, createNew: false })}
        />}
        renderItem={renderItem}
        ListEmptyComponent={
          <EmptyState
            icon={<Ionicons name="person-circle-outline" size={42} color={colors.textFaint} />}
            title={query || tagId ? 'No matching alts' : 'No alts on this profile'}
            subtitle={
              query || tagId
                ? 'Try a different search or tag.'
                : 'Alts configured for the active server appear here.'
            }
          />
        }
      />
      <AltImportModal
        visible={importOpen}
        currentAlts={alts}
        client={client}
        onClose={() => setImportOpen(false)}
      />
      <TagManagerModal
        open={tagManager.open}
        initialTagId={tagManager.initialId}
        createOnOpen={tagManager.createNew}
        alts={alts}
        tags={altTags}
        client={client}
        onClose={() => setTagManager({ open: false, initialId: null, createNew: false })}
      />
    </Screen>
  );
}

const AltRow = memo(function AltRow({
  alt,
  online,
  ranks,
  gkits,
  canManage,
  first,
  last,
  onSelect,
}: {
  alt: AltWithData;
  online: boolean;
  ranks: number;
  gkits: number;
  canManage: boolean;
  first: boolean;
  last: boolean;
  onSelect: (username: string) => void;
}) {
  const detail =
    [
      ranks > 0 && `${ranks} rank${ranks === 1 ? '' : 's'}`,
      gkits > 0 && `${gkits} gkit${gkits === 1 ? '' : 's'}`,
    ]
      .filter(Boolean)
      .join(' · ');

  return (
    <Pressable
      accessibilityRole={canManage ? 'button' : undefined}
      accessibilityLabel={canManage ? `View account ${alt.username}` : alt.username}
      disabled={!canManage}
      onPress={canManage ? () => onSelect(alt.username) : undefined}
      style={({ pressed }) => [
        styles.altRow,
        first && styles.altRowFirst,
        last && styles.altRowLast,
        pressed && canManage && styles.altRowPressed,
      ]}
    >
      <View>
        <MCAvatar username={alt.username} size={44} radius={10} />
        {online ? <View style={styles.onlineDot}><StatusDot color={colors.online} size={9} pulse /></View> : null}
      </View>
      <View style={styles.altInfo}>
        <View style={styles.altTitleRow}>
          <Txt variant="heading" numberOfLines={1} style={styles.altName}>{alt.username}</Txt>
          {alt.data.premium ? <Ionicons name="diamond" size={13} color={colors.info} /> : null}
          {online ? <Txt variant="faint" style={styles.onlineLabel}>Online</Txt> : null}
        </View>
        {detail ? <Txt variant="faint" numberOfLines={1}>{detail}</Txt> : null}
      </View>
      {canManage ? <NativeIcon sf="chevron.right" material="chevron-right" size={18} color={colors.textFaint} /> : null}
    </Pressable>
  );
});

function AccountListHeader({
  query,
  onChangeQuery,
  tags,
  tagId,
  totalAltCount,
  canManage,
  onTagPress,
  onTagLongPress,
  onManageTags,
}: {
  query: string;
  onChangeQuery: (value: string) => void;
  tags: AltTag[];
  tagId: string | null;
  totalAltCount: number;
  canManage: boolean;
  onTagPress: (id: string | null) => void;
  onTagLongPress?: (id: string) => void;
  onManageTags: () => void;
}) {
  return (
    <View style={styles.listHeader}>
      <SearchField value={query} onChangeText={onChangeQuery} placeholder="Search accounts" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tagRow}
      >
        <Chip
          label={`All · ${totalAltCount}`}
          active={!tagId}
          onPress={() => onTagPress(null)}
        />
        {tags.map((tag) => (
          <Chip
            key={tag.id}
            label={`${tag.name} · ${tag.alts.length}`}
            color={tag.color}
            active={tagId === tag.id}
            onPress={() => onTagPress(tag.id)}
            onLongPress={onTagLongPress ? () => onTagLongPress(tag.id) : undefined}
          />
        ))}
        {canManage ? (
          <Pressable
            onPress={onManageTags}
            accessibilityRole="button"
            accessibilityLabel="Manage tags"
            style={({ pressed }) => [
              styles.tagActionChip,
              pressed && styles.tagActionChipPressed,
            ]}
          >
            <Ionicons name="pricetag-outline" size={13} color={colors.textMuted} />
            <Txt variant="label" style={styles.tagActionText}>
              Manage
            </Txt>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Chip({
  label,
  active,
  onPress,
  onLongPress,
  color,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  color?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.chip,
        active && {
          backgroundColor: color ?? colors.primary,
          borderColor: color ?? colors.primary,
        },
        pressed && !active && {
          backgroundColor: colors.surfaceHover,
        },
      ]}
    >
      {color && !active ? <StatusDot color={color} size={6} /> : null}
      <Txt
        variant="muted"
        numberOfLines={1}
        ellipsizeMode="tail"
        style={[
          styles.chipText,
          {
            color: active ? colors.primaryOn : colors.textMuted,
            fontWeight: active ? '600' : '400',
          },
        ]}
      >
        {label}
      </Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  listHeader: { gap: spacing.sm, paddingBottom: spacing.lg },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
  },
  chipText: {
    fontSize: font.size.xs,
    lineHeight: 16,
    includeFontPadding: false,
  },
  tagActionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
  },
  tagActionText: {
    color: colors.textMuted,
    fontSize: font.size.xs,
    fontWeight: '500',
  },
  tagActionChipPressed: {
    opacity: 0.7,
  },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 112 },
  altRow: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
  },
  altRowFirst: { borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg },
  altRowLast: { borderBottomLeftRadius: radii.lg, borderBottomRightRadius: radii.lg, borderBottomWidth: 0 },
  altRowPressed: { backgroundColor: colors.surfaceHover },
  altInfo: { flex: 1, minWidth: 0, gap: 3 },
  altTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  altName: { flexShrink: 1 },
  onlineLabel: { color: colors.online, fontWeight: '600' },
  onlineDot: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    padding: 2,
  },
});
