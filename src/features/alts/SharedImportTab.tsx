import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MCAvatar } from '../../components/MCAvatar';
import { Button, EmptyState, Txt } from '../../components/ui';
import { colors, font, radii, spacing } from '../../theme/theme';
import type { Alt, AltWithData } from '../../store/types';
import type { ImportEntry } from './importTypes';
import { isValidPassword } from './importParsers';
import { accountAuthenticationError } from '../serverAuthentication';

interface Props {
  sharedAlts: Alt[];
  currentAlts: AltWithData[];
  entries: ImportEntry[];
  selectedUsernames: string[];
  onSelectionChange: (usernames: string[]) => void;
  onlineMode: boolean;
  onEntriesChange: (entries: ImportEntry[]) => void;
}

export function SharedImportTab({
  sharedAlts,
  currentAlts,
  entries,
  selectedUsernames,
  onSelectionChange,
  onlineMode,
  onEntriesChange,
}: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [batchModalVisible, setBatchModalVisible] = useState(false);
  const [batchPassword, setBatchPassword] = useState('');
  const [showBatchPassword, setShowBatchPassword] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(
    new Set(),
  );

  const importableShared = useMemo(() => {
    const inProfile = new Set(
      currentAlts.map((a) => a.username.toLowerCase()),
    );
    return sharedAlts.filter((a) =>
      !inProfile.has(a.username.toLowerCase()) &&
      (!onlineMode || accountAuthenticationError({ premium: true }, true) === null),
    );
  }, [sharedAlts, currentAlts, onlineMode]);

  // If entries is empty and we have importableShared, seed entries
  React.useEffect(() => {
    if (entries.length === 0 && importableShared.length > 0) {
      onEntriesChange(
        importableShared.map((a) => ({
          username: a.username,
          premium: onlineMode,
          UID: a.UID ?? null,
          email: a.email,
          password: '',
          ranks: {},
          gkits: {},
        })),
      );
    }
  }, [importableShared]);

  const updatePassword = (username: string, password: string) => {
    onEntriesChange(
      entries.map((e) => (e.username === username ? { ...e, password } : e)),
    );
  };

  const toggleEntry = (username: string, enabled: boolean) => {
    onSelectionChange(enabled
      ? [...selectedUsernames, username]
      : selectedUsernames.filter((entry) => entry !== username));
  };

  const togglePasswordVisibility = (username: string) => {
    setVisiblePasswords((prev) => {
      const next = new Set(prev);
      if (next.has(username)) next.delete(username);
      else next.add(username);
      return next;
    });
  };

  const applyBatchPassword = () => {
    if (!batchPassword.trim()) return;
    onEntriesChange(
      entries.map((e) => ({
        ...e,
        password: selectedUsernames.includes(e.username) ? batchPassword.trim() : e.password,
      })),
    );
    setBatchPassword('');
    setBatchModalVisible(false);
  };

  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) return entries;
    const q = searchQuery.trim().toLowerCase();
    return entries.filter((e) => e.username.toLowerCase().includes(q));
  }, [entries, searchQuery]);

  if (importableShared.length === 0 && entries.length === 0) {
    return (
      <View style={styles.container}>
        <EmptyState
          icon={
            <Ionicons
              name="checkmark-circle-outline"
              size={48}
              color={colors.success}
            />
          }
          title="All accounts added"
          subtitle="Every account from your global account pool is already part of this profile."
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.infoBanner}>
        <Ionicons
          name="information-circle-outline"
          size={20}
          color={colors.primary}
        />
        <Txt variant="faint" style={{ flex: 1 }}>
          Select the accounts to import, then enter any server passwords you need. Passwords are optional.
        </Txt>
      </View>

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

        {!onlineMode && selectedUsernames.length > 0 ? <Pressable
          hitSlop={8}
          onPress={() => setBatchModalVisible(true)}
          style={styles.batchBtn}
        >
          <Ionicons name="key-outline" size={14} color={colors.primary} />
          <Txt variant="label" style={{ color: colors.primary, fontSize: font.size.caption }}>
            Set selected
          </Txt>
        </Pressable> : null}
      </View>

      <Txt variant="faint">{selectedUsernames.length} of {entries.length} selected</Txt>

      <FlatList
        data={filteredEntries}
        keyExtractor={(item) => item.username}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        renderItem={({ item }) => {
          const isVisible = visiblePasswords.has(item.username);
          const selected = selectedUsernames.includes(item.username);

          return (
            <View style={[styles.row, selected && styles.rowFilled]}>
              <MCAvatar username={item.username} size={38} radius={8} />

              <View style={styles.content}>
                <View style={styles.titleRow}>
                  <Txt variant="heading" style={styles.usernameText}>
                    {item.username}
                  </Txt>
                  {item.premium ? (
                    <Ionicons name="diamond" size={13} color={colors.info} />
                  ) : null}
                </View>

                {!onlineMode && selected ? <View style={styles.passwordContainer}>
                  <TextInput
                    value={item.password}
                    onChangeText={(val) => updatePassword(item.username, val)}
                    placeholder="Optional server password"
                    placeholderTextColor={colors.textFaint}
                    secureTextEntry={!isVisible}
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={styles.passwordInput}
                  />
                  <Pressable
                    hitSlop={8}
                    onPress={() => togglePasswordVisibility(item.username)}
                    style={styles.eyeBtn}
                  >
                    <Ionicons
                      name={isVisible ? 'eye-off-outline' : 'eye-outline'}
                      size={16}
                      color={colors.textMuted}
                    />
                  </Pressable>
                </View> : null}
              </View>

              <Switch
                accessibilityLabel={`Import ${item.username}`}
                value={selected}
                onValueChange={(enabled) => toggleEntry(item.username, enabled)}
                trackColor={{ false: colors.border, true: colors.primary }}
              />
            </View>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            title="No matching accounts"
            subtitle="Try a different search query."
          />
        }
      />

      {/* Batch password modal */}
      <Modal
        visible={batchModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setBatchModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Txt variant="heading">Set password for selected accounts</Txt>
            <Txt variant="faint">
              This password will be applied to the {selectedUsernames.length} selected accounts.
            </Txt>

            <View style={styles.passwordContainer}>
              <TextInput
                value={batchPassword}
                onChangeText={setBatchPassword}
                placeholder="Server password"
                placeholderTextColor={colors.textFaint}
                secureTextEntry={!showBatchPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
                style={styles.passwordInput}
              />
              <Pressable
                hitSlop={8}
                onPress={() => setShowBatchPassword((prev) => !prev)}
                style={styles.eyeBtn}
              >
                <Ionicons
                  name={showBatchPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={16}
                  color={colors.textMuted}
                />
              </Pressable>
            </View>

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="secondary"
                small
                onPress={() => {
                  setBatchPassword('');
                  setBatchModalVisible(false);
                }}
              />
              <Button
                title="Apply to selected"
                small
                disabled={!isValidPassword(batchPassword)}
                onPress={applyBatchPassword}
              />
            </View>
          </View>
        </View>
      </Modal>
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
  batchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceAlt,
  },
  listContent: {
    paddingBottom: spacing.xxl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
  },
  rowFilled: {
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  content: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  usernameText: {
    fontSize: font.size.base,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    marginTop: 2,
  },
  passwordInput: {
    flex: 1,
    color: colors.text,
    fontSize: font.size.caption,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  eyeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.bg,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});
