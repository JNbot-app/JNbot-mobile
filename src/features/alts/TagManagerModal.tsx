import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Button, Card, EmptyState, IconButton, StatusDot, Txt } from '../../components/ui';
import { MCAvatar } from '../../components/MCAvatar';
import { colors, font, radii, spacing } from '../../theme/theme';
import type { AltTag, AltWithData } from '../../store/types';
import type { JNbotClient } from '../../client/JNbotClient';
import {
  DEFAULT_TAG_COLOR,
  TAG_COLOR_PALETTE,
  newTagId,
  sanitizeTags,
  tagsEqual,
} from './tagUtils';

export interface TagManagerModalProps {
  open: boolean;
  initialTagId?: string | null;
  createOnOpen?: boolean;
  alts: AltWithData[];
  tags: AltTag[];
  client: JNbotClient | null;
  onClose: () => void;
}

export function TagManagerModal({
  open,
  initialTagId = null,
  createOnOpen = false,
  alts,
  tags: storedTags,
  client,
  onClose,
}: TagManagerModalProps) {
  const [workingTags, setWorkingTags] = useState<AltTag[]>([]);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const snapshot = storedTags.map((t) => ({ ...t, alts: [...t.alts] }));
    if (createOnOpen) {
      const fresh: AltTag = {
        id: newTagId(),
        name: 'New tag',
        color:
          TAG_COLOR_PALETTE[snapshot.length % TAG_COLOR_PALETTE.length] ??
          DEFAULT_TAG_COLOR,
        alts: [],
      };
      setWorkingTags([...snapshot, fresh]);
      setSelectedTagId(fresh.id);
    } else {
      setWorkingTags(snapshot);
      setSelectedTagId(initialTagId ?? storedTags[0]?.id ?? null);
    }
    setSearchQuery('');
  }, [open, createOnOpen, initialTagId, storedTags]);

  const selectedTag = useMemo(
    () => workingTags.find((t) => t.id === selectedTagId) ?? null,
    [workingTags, selectedTagId],
  );

  const handleCreateTag = useCallback(() => {
    if (process.env.EXPO_OS === 'ios') {
      void Haptics.selectionAsync();
    }
    const fresh: AltTag = {
      id: newTagId(),
      name: 'New tag',
      color:
        TAG_COLOR_PALETTE[workingTags.length % TAG_COLOR_PALETTE.length] ??
        DEFAULT_TAG_COLOR,
      alts: [],
    };
    setWorkingTags((prev) => [...prev, fresh]);
    setSelectedTagId(fresh.id);
  }, [workingTags.length]);

  const updateSelectedTag = useCallback(
    (patch: Partial<AltTag>) => {
      if (!selectedTagId) return;
      setWorkingTags((prev) =>
        prev.map((t) => (t.id === selectedTagId ? { ...t, ...patch } : t)),
      );
    },
    [selectedTagId],
  );

  const handleDeleteTag = useCallback(() => {
    if (!selectedTag) return;
    Alert.alert(
      `Delete tag "${selectedTag.name || 'unnamed'}"?`,
      'The alts will keep existing — only the tag is removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            if (process.env.EXPO_OS === 'ios') {
              void Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              );
            }
            const next = workingTags.filter((t) => t.id !== selectedTag.id);
            setWorkingTags(next);
            setSelectedTagId(next[0]?.id ?? null);
          },
        },
      ],
    );
  }, [selectedTag, workingTags]);

  const toggleAltInSelectedTag = useCallback(
    (username: string) => {
      if (!selectedTag) return;
      if (process.env.EXPO_OS === 'ios') {
        void Haptics.selectionAsync();
      }
      const existing = selectedTag.alts;
      const index = existing.indexOf(username);
      if (index >= 0) {
        updateSelectedTag({
          alts: existing.filter((u) => u !== username),
        });
      } else {
        updateSelectedTag({
          alts: [...existing, username],
        });
      }
    },
    [selectedTag, updateSelectedTag],
  );

  const filteredAlts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return alts;
    return alts.filter((a) => a.username.toLowerCase().includes(q));
  }, [alts, searchQuery]);

  const handleSelectAllFiltered = useCallback(() => {
    if (!selectedTag) return;
    const currentSet = new Set(selectedTag.alts);
    const toAdd = filteredAlts
      .map((a) => a.username)
      .filter((u) => !currentSet.has(u));
    updateSelectedTag({
      alts: [...selectedTag.alts, ...toAdd],
    });
  }, [filteredAlts, selectedTag, updateSelectedTag]);

  const handleDeselectAllFiltered = useCallback(() => {
    if (!selectedTag) return;
    const removeSet = new Set(filteredAlts.map((a) => a.username));
    updateSelectedTag({
      alts: selectedTag.alts.filter((u) => !removeSet.has(u)),
    });
  }, [filteredAlts, selectedTag, updateSelectedTag]);

  const handleDone = useCallback(async () => {
    const sanitized = sanitizeTags(workingTags, storedTags);
    if (!tagsEqual(sanitized, storedTags) && client) {
      setSaving(true);
      try {
        await client.updateSettings([{ path: ['altTags'], value: sanitized }]);
      } catch (err) {
        Alert.alert(
          'Could not save tags',
          err instanceof Error ? err.message : 'Unknown error occurred.',
        );
        setSaving(false);
        return;
      }
      setSaving(false);
    }
    onClose();
  }, [workingTags, storedTags, client, onClose]);

  return (
    <Modal
      visible={open}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleDone}
    >
      <SafeAreaView style={styles.sheet} edges={['top', 'left', 'right', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardAvoid}
        >
          {/* Header */}
          <View style={styles.header}>
            <Pressable hitSlop={10} onPress={onClose} disabled={saving}>
              <Txt variant="body" style={{ color: colors.textMuted }}>
                Cancel
              </Txt>
            </Pressable>
            <Txt variant="heading" style={styles.headerTitle}>
              Manage Tags
            </Txt>
            <Pressable hitSlop={10} onPress={() => void handleDone()} disabled={saving}>
              <Txt variant="heading" style={{ color: colors.primary }}>
                {saving ? 'Saving…' : 'Done'}
              </Txt>
            </Pressable>
          </View>

          {/* Horizontal Tag Pills */}
          <View style={styles.tagBarContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tagBar}
            >
              <Pressable
                onPress={handleCreateTag}
                style={({ pressed }) => [
                  styles.newTagChip,
                  pressed && styles.chipPressed,
                ]}
              >
                <Ionicons name="add" size={14} color={colors.primary} />
                <Txt variant="label" style={styles.newTagLabel}>
                  New tag
                </Txt>
              </Pressable>

              {workingTags.map((tag) => {
                const isActive = tag.id === selectedTagId;
                return (
                  <Pressable
                    key={tag.id}
                    onPress={() => {
                      if (process.env.EXPO_OS === 'ios') {
                        void Haptics.selectionAsync();
                      }
                      setSelectedTagId(tag.id);
                    }}
                    style={[
                      styles.tagChip,
                      isActive && {
                        borderColor: tag.color,
                        backgroundColor: tag.color,
                      },
                    ]}
                  >
                    <StatusDot
                      color={isActive ? '#ffffff' : tag.color}
                      size={6}
                    />
                    <Txt
                      variant="body"
                      numberOfLines={1}
                      style={[
                        styles.tagChipText,
                        isActive && { color: '#ffffff', fontWeight: '600' },
                      ]}
                    >
                      {tag.name || 'unnamed'}
                    </Txt>
                    <Txt
                      variant="faint"
                      style={[
                        styles.tagChipCount,
                        isActive && { color: 'rgba(255, 255, 255, 0.8)' },
                      ]}
                    >
                      {tag.alts.length}
                    </Txt>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Main Body */}
          {workingTags.length === 0 ? (
            <View style={styles.emptyContainer}>
              <EmptyState
                icon={<Ionicons name="pricetags-outline" size={48} color={colors.textFaint} />}
                title="No tags created"
                subtitle="Tags let you organize and filter your Minecraft accounts."
              />
              <Button
                title="Create tag"
                icon={<Ionicons name="add" size={18} color={colors.primaryOn} />}
                onPress={handleCreateTag}
                style={{ marginTop: spacing.md }}
              />
            </View>
          ) : !selectedTag ? (
            <View style={styles.emptyContainer}>
              <EmptyState
                icon={<Ionicons name="pricetag-outline" size={40} color={colors.textFaint} />}
                title="Select a tag"
                subtitle="Choose a tag from the bar above to edit its details."
              />
            </View>
          ) : (
            <FlatList
              data={filteredAlts}
              keyExtractor={(item) => item.username}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              contentContainerStyle={styles.listContent}
              ListHeaderComponent={
                <View style={styles.detailHeader}>
                  {/* Tag Name & Delete Button */}
                  <View style={styles.nameRow}>
                    <TextInput
                      value={selectedTag.name}
                      onChangeText={(name) => updateSelectedTag({ name })}
                      placeholder="Tag name"
                      placeholderTextColor={colors.textFaint}
                      maxLength={48}
                      style={styles.nameInput}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <IconButton
                      accessibilityLabel="Delete tag"
                      bg={colors.dangerSoft}
                      onPress={handleDeleteTag}
                    >
                      <Ionicons name="trash-outline" size={20} color={colors.danger} />
                    </IconButton>
                  </View>

                  {/* Color Palette Swatches */}
                  <View style={styles.colorPaletteSection}>
                    <Txt variant="faint" style={styles.paletteLabel}>
                      Tag Color
                    </Txt>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.colorPalette}
                    >
                      {TAG_COLOR_PALETTE.map((color) => {
                        const isSelected = selectedTag.color === color;
                        return (
                          <Pressable
                            key={color}
                            onPress={() => {
                              if (process.env.EXPO_OS === 'ios') {
                                void Haptics.selectionAsync();
                              }
                              updateSelectedTag({ color });
                            }}
                            style={[
                              styles.colorSwatch,
                              { backgroundColor: color },
                              isSelected && styles.colorSwatchSelected,
                            ]}
                          >
                            {isSelected ? (
                              <Ionicons name="checkmark" size={14} color="#ffffff" />
                            ) : null}
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>

                  {/* Section Title & Accounts Search */}
                  <View style={styles.altsSectionHeader}>
                    <View style={styles.altsTitleRow}>
                      <Txt variant="heading">
                        Accounts in tag ({selectedTag.alts.length}/{alts.length})
                      </Txt>
                    </View>

                    <View style={styles.searchRow}>
                      <Ionicons name="search" size={16} color={colors.textFaint} />
                      <TextInput
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholder="Search accounts…"
                        placeholderTextColor={colors.textFaint}
                        style={styles.searchInput}
                        autoCapitalize="none"
                        autoCorrect={false}
                        clearButtonMode="while-editing"
                      />
                    </View>

                    {filteredAlts.length > 0 ? (
                      <View style={styles.quickActionRow}>
                        <Pressable onPress={handleSelectAllFiltered} hitSlop={8}>
                          <Txt variant="faint" style={{ color: colors.primary }}>
                            Select all
                          </Txt>
                        </Pressable>
                        <Txt variant="faint" style={{ color: colors.textFaint }}>
                          ·
                        </Txt>
                        <Pressable onPress={handleDeselectAllFiltered} hitSlop={8}>
                          <Txt variant="faint" style={{ color: colors.textMuted }}>
                            Deselect all
                          </Txt>
                        </Pressable>
                      </View>
                    ) : null}
                  </View>
                </View>
              }
              renderItem={({ item }) => {
                const inTag = selectedTag.alts.includes(item.username);
                return (
                  <Pressable
                    onPress={() => toggleAltInSelectedTag(item.username)}
                    style={({ pressed }) => [
                      styles.altRow,
                      pressed && styles.altRowPressed,
                    ]}
                  >
                    <MCAvatar username={item.username} size={32} radius={6} />
                    <Txt
                      variant="body"
                      numberOfLines={1}
                      style={[
                        styles.altUsername,
                        inTag && { fontWeight: '600' },
                      ]}
                    >
                      {item.username}
                    </Txt>
                    <Ionicons
                      name={inTag ? 'checkbox' : 'square-outline'}
                      size={22}
                      color={inTag ? selectedTag.color || colors.primary : colors.textFaint}
                    />
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyAlts}>
                  <Txt variant="muted">
                    {searchQuery ? 'No accounts match search' : 'No accounts available'}
                  </Txt>
                </View>
              }
            />
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
  },
  tagBarContainer: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
    backgroundColor: colors.bg,
  },
  tagBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  newTagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 28,
    paddingHorizontal: 10,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryDim,
  },
  newTagLabel: {
    color: colors.primary,
    fontSize: font.size.xs,
  },
  chipPressed: {
    opacity: 0.75,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 28,
    paddingHorizontal: 10,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  tagChipText: {
    fontSize: font.size.xs,
    color: colors.text,
  },
  tagChipCount: {
    fontSize: 12,
    color: colors.textMuted,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  detailHeader: {
    paddingTop: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  nameInput: {
    flex: 1,
    fontSize: font.size.md,
    fontWeight: '600',
    color: colors.text,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  colorPaletteSection: {
    gap: 6,
  },
  paletteLabel: {
    fontSize: font.size.xs,
    color: colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  colorPalette: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  colorSwatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorSwatchSelected: {
    borderWidth: 2,
    borderColor: '#ffffff',
    transform: [{ scale: 1.15 }],
  },
  altsSectionHeader: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  altsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: font.size.sm,
    padding: 0,
  },
  quickActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 2,
  },
  altRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
  },
  altRowPressed: {
    backgroundColor: colors.surfaceHover,
  },
  altUsername: {
    flex: 1,
    fontSize: font.size.base,
    color: colors.text,
  },
  emptyAlts: {
    alignItems: 'center',
    padding: spacing.xl,
  },
});
