import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MCAvatar } from '../../components/MCAvatar';
import { Button, EmptyState, Txt } from '../../components/ui';
import { colors, font, radii, spacing } from '../../theme/theme';
import type { AltWithData } from '../../store/types';
import type { useClient } from '../../net/ConnectionProvider';

interface Props {
  client: ReturnType<typeof useClient>;
  allProfiles: { id: string; name?: string; shortName?: string }[];
  activeProfileKey: string | null;
  currentAlts: AltWithData[];
  selectedUsernames: Set<string>;
  onSelectedUsernamesChange: (updater: (prev: Set<string>) => Set<string>) => void;
  sourceKey: string | null;
  onSourceKeyChange: (key: string | null) => void;
  sourceAlts: AltWithData[];
  onSourceAltsChange: (alts: AltWithData[]) => void;
}

export function ProfileImportTab({
  client,
  allProfiles,
  activeProfileKey,
  currentAlts,
  selectedUsernames,
  onSelectedUsernamesChange,
  sourceKey,
  onSourceKeyChange,
  sourceAlts,
  onSourceAltsChange,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const currentAltSet = useMemo(
    () => new Set(currentAlts.map((a) => a.username.toLowerCase())),
    [currentAlts],
  );

  const availableProfiles = useMemo(
    () => allProfiles.filter((p) => p.id !== activeProfileKey),
    [allProfiles, activeProfileKey],
  );

  const chooseProfile = async (profileKey: string) => {
    if (!client) return;
    setError(null);
    onSourceKeyChange(profileKey);
    setLoading(true);
    onSourceAltsChange([]);
    onSelectedUsernamesChange(() => new Set());

    try {
      const alts = await client.getAltsForProfile(profileKey);
      onSourceAltsChange(alts);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Could not load accounts from this profile.',
      );
      onSourceKeyChange(null);
    } finally {
      setLoading(false);
    }
  };

  const filteredAlts = useMemo(() => {
    if (!searchQuery.trim()) return sourceAlts;
    const q = searchQuery.toLowerCase();
    return sourceAlts.filter((a) => a.username.toLowerCase().includes(q));
  }, [sourceAlts, searchQuery]);

  const toggleAlt = (username: string) => {
    onSelectedUsernamesChange((prev) => {
      const next = new Set(prev);
      if (next.has(username)) next.delete(username);
      else next.add(username);
      return next;
    });
  };

  const toggleSelectAll = () => {
    onSelectedUsernamesChange((prev) => {
      const allSelected = filteredAlts.every((a) => prev.has(a.username));
      const next = new Set(prev);
      if (allSelected) {
        for (const a of filteredAlts) next.delete(a.username);
      } else {
        for (const a of filteredAlts) next.add(a.username);
      }
      return next;
    });
  };

  const selectedProfile = availableProfiles.find((p) => p.id === sourceKey);
  const isAllSelected =
    filteredAlts.length > 0 &&
    filteredAlts.every((a) => selectedUsernames.has(a.username));

  if (!sourceKey) {
    return (
      <View style={styles.container}>
        <View style={styles.infoBanner}>
          <Ionicons
            name="swap-horizontal-outline"
            size={20}
            color={colors.primary}
          />
          <Txt variant="faint" style={{ flex: 1 }}>
            Usernames and passwords transfer across profiles. Server-specific ranks
            and GKits remain on the source profile.
          </Txt>
        </View>

        <FlatList
          data={availableProfiles}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [
                styles.profileCard,
                pressed && styles.cardPressed,
              ]}
              onPress={() => void chooseProfile(item.id)}
            >
              <View style={styles.profileIcon}>
                <Ionicons name="layers-outline" size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Txt variant="heading">{item.name || item.id}</Txt>
                <Txt variant="faint">
                  {item.shortName ? `Server: ${item.shortName}` : 'Tap to select accounts'}
                </Txt>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.textFaint}
              />
            </Pressable>
          )}
          ListEmptyComponent={
            <EmptyState
              title="No other profiles"
              subtitle="Install or create another profile to transfer accounts from."
            />
          }
        />

        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={18} color={colors.danger} />
            <Txt variant="muted" style={styles.errorText}>
              {error}
            </Txt>
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Active profile bar */}
      <View style={styles.selectedProfileBar}>
        <View style={{ flex: 1 }}>
          <Txt variant="label" style={{ color: colors.textMuted }}>
            Source Profile
          </Txt>
          <Txt variant="heading" numberOfLines={1}>
            {selectedProfile?.name || selectedProfile?.id || sourceKey}
          </Txt>
        </View>
        <Pressable
          hitSlop={8}
          onPress={() => {
            onSourceKeyChange(null);
            onSourceAltsChange([]);
            onSelectedUsernamesChange(() => new Set());
          }}
          style={styles.changeProfileBtn}
        >
          <Txt variant="label" style={{ color: colors.primary }}>
            Change
          </Txt>
        </Pressable>
      </View>

      {/* Search and Selection Header */}
      <View style={styles.controlsRow}>
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={16} color={colors.textFaint} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search accounts"
            placeholderTextColor={colors.textFaint}
            autoCapitalize="none"
            style={styles.searchInput}
          />
          {searchQuery ? (
            <Pressable hitSlop={8} onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color={colors.textFaint} />
            </Pressable>
          ) : null}
        </View>

        {filteredAlts.length > 0 ? (
          <Pressable
            hitSlop={8}
            onPress={toggleSelectAll}
            style={styles.selectAllBtn}
          >
            <Txt variant="label" style={{ color: colors.primary, fontSize: font.size.caption }}>
              {isAllSelected ? 'Deselect All' : 'Select All'}
            </Txt>
          </Pressable>
        ) : null}
      </View>

      <FlatList
        data={filteredAlts}
        keyExtractor={(item) => item.username}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        renderItem={({ item }) => {
          const checked = selectedUsernames.has(item.username);
          const alreadyInProfile = currentAltSet.has(item.username.toLowerCase());

          return (
            <Pressable
              onPress={() => toggleAlt(item.username)}
              style={({ pressed }) => [
                styles.altRow,
                checked && styles.altRowSelected,
                pressed && styles.cardPressed,
              ]}
            >
              <MCAvatar username={item.username} size={38} radius={8} />
              <View style={styles.altInfo}>
                <View style={styles.altTitleRow}>
                  <Txt variant="heading" style={styles.usernameText}>
                    {item.username}
                  </Txt>
                  {item.data.premium ? (
                    <Ionicons name="diamond" size={13} color={colors.info} />
                  ) : null}
                </View>
                <Txt variant="faint">
                  {item.data.premium ? 'Premium' : 'Cracked'}
                  {alreadyInProfile ? ' · Updates existing' : ''}
                </Txt>
              </View>
              <Ionicons
                name={checked ? 'checkmark-circle' : 'ellipse-outline'}
                size={22}
                color={checked ? colors.primary : colors.textFaint}
              />
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            title={loading ? 'Loading accounts…' : 'No accounts available'}
            subtitle={
              loading
                ? 'Fetching accounts from profile…'
                : 'This profile contains no accounts to import.'
            }
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.primarySoft,
    borderRadius: radii.md,
  },
  listContent: {
    paddingBottom: spacing.xxl,
  },
  profileCard: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
  },
  cardPressed: {
    backgroundColor: colors.surfaceHover,
  },
  profileIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedProfileBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
  },
  changeProfileBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceAlt,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
    height: 40,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: font.size.sm,
  },
  selectAllBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceAlt,
  },
  altRow: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
  },
  altRowSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  altInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  altTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  usernameText: {
    fontSize: font.size.base,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.dangerSoft,
    borderRadius: radii.md,
  },
  errorText: {
    flex: 1,
    color: colors.danger,
    fontSize: font.size.caption,
  },
});
