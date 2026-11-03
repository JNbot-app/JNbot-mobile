import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { Button, EmptyState, Txt } from '../../components/ui';
import { colors, font, radii, spacing } from '../../theme/theme';
import type { ImportEntry, ImportFileParseResult } from './importTypes';
import { parseAltsFileContent } from './importParsers';
import { AltImportPreviewRow } from './AltImportPreviewRow';

interface Props {
  activeProfileKey: string | null;
  onlineMode: boolean;
  allProfiles: { id: string; name?: string; shortName?: string }[];
  entries: ImportEntry[];
  sourceProfileId: string | null;
  importRanksGkits: boolean;
  onEntriesChange: (entries: ImportEntry[]) => void;
  onSourceProfileIdChange: (id: string | null) => void;
  onImportRanksGkitsChange: (value: boolean) => void;
  onReset: () => void;
}

export function FileImportTab({
  activeProfileKey,
  onlineMode,
  allProfiles,
  entries,
  sourceProfileId,
  importRanksGkits,
  onEntriesChange,
  onSourceProfileIdChange,
  onImportRanksGkitsChange,
  onReset,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pasteMode, setPasteMode] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const profileMatches =
    sourceProfileId !== null &&
    activeProfileKey !== null &&
    sourceProfileId.toLowerCase() === activeProfileKey.toLowerCase();

  const handleFileResult = (result: ImportFileParseResult) => {
    onSourceProfileIdChange(result.srcProfile);
    onEntriesChange(result.entries);
    setError(null);
  };

  const pickFile = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/plain', '*/*'],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (res.canceled || !res.assets || !res.assets.length) {
        setLoading(false);
        return;
      }

      const asset = res.assets[0];
      const file = new File(asset.uri);
      const content = await file.text();
      const result = parseAltsFileContent(
        content,
        activeProfileKey ?? undefined,
        allProfiles,
        onlineMode,
      );
      handleFileResult(result);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Unable to parse chosen file.',
      );
    } finally {
      setLoading(false);
    }
  };

  const parsePastedContent = () => {
    setError(null);
    if (!pastedText.trim()) {
      setError('Please paste text or JSON containing accounts.');
      return;
    }
    try {
      const result = parseAltsFileContent(
        pastedText,
        activeProfileKey ?? undefined,
        allProfiles,
        onlineMode,
      );
      handleFileResult(result);
      setPasteMode(false);
      setPastedText('');
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Could not parse pasted content.',
      );
    }
  };

  const updatePassword = (username: string, password: string) => {
    onEntriesChange(
      entries.map((e) => (e.username === username ? { ...e, password } : e)),
    );
  };

  const deleteEntry = (username: string) => {
    onEntriesChange(entries.filter((e) => e.username !== username));
  };

  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) return entries;
    const q = searchQuery.toLowerCase();
    return entries.filter((e) => e.username.toLowerCase().includes(q));
  }, [entries, searchQuery]);

  if (entries.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconWrap}>
              <Ionicons name="document-text" size={24} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Txt variant="heading">Import from file</Txt>
              <Txt variant="faint">
                Upload a .txt or .json file containing Minecraft credentials.
              </Txt>
            </View>
          </View>

          <View style={styles.formatInfo}>
            <Txt variant="faint" style={styles.formatTitle}>
              Supported formats:
            </Txt>
            <Txt variant="faint" style={styles.formatCode}>
              • Plain text: username password (or user:pass)
            </Txt>
            <Txt variant="faint" style={styles.formatCode}>
              • JSON: JNbot export with profile ranks & GKits
            </Txt>
          </View>

          {pasteMode ? (
            <View style={styles.pasteContainer}>
              <TextInput
                value={pastedText}
                onChangeText={setPastedText}
                placeholder="Paste username password lines or JSON export here..."
                placeholderTextColor={colors.textFaint}
                multiline
                numberOfLines={6}
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.pasteInput}
              />
              <View style={styles.pasteActions}>
                <Button
                  title="Cancel"
                  variant="secondary"
                  small
                  onPress={() => {
                    setPasteMode(false);
                    setPastedText('');
                    setError(null);
                  }}
                />
                <Button
                  title="Parse Accounts"
                  small
                  onPress={parsePastedContent}
                />
              </View>
            </View>
          ) : (
            <View style={styles.buttonStack}>
              <Button
                title="Choose .txt or .json File"
                icon={<Ionicons name="folder-open-outline" size={18} color={colors.primaryOn} />}
                loading={loading}
                onPress={() => void pickFile()}
              />
              <Button
                title="Paste Text or JSON"
                variant="secondary"
                icon={<Ionicons name="clipboard-outline" size={18} color={colors.text} />}
                onPress={() => {
                  setError(null);
                  setPasteMode(true);
                }}
              />
            </View>
          )}

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color={colors.danger} />
              <Txt variant="muted" style={styles.errorText}>
                {error}
              </Txt>
            </View>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Banner */}
      {sourceProfileId ? (
        <View
          style={[
            styles.banner,
            profileMatches ? styles.bannerSuccess : styles.bannerWarning,
          ]}
        >
          <Ionicons
            name={
              profileMatches ? 'checkmark-circle-outline' : 'alert-circle-outline'
            }
            size={20}
            color={profileMatches ? colors.success : colors.warning}
          />
          <View style={{ flex: 1 }}>
            <Txt variant="label" style={{ color: colors.text }}>
              {profileMatches
                ? `Source matches active profile (${sourceProfileId})`
                : `Source profile (${sourceProfileId}) differs from active profile`}
            </Txt>
            <Txt variant="faint">
              {profileMatches
                ? 'Ranks and GKits data will be imported.'
                : 'Only usernames and passwords will be imported.'}
            </Txt>
          </View>
        </View>
      ) : (
        <View style={[styles.banner, styles.bannerInfo]}>
          <Ionicons
            name="information-circle-outline"
            size={20}
            color={colors.primary}
          />
          <View style={{ flex: 1 }}>
            <Txt variant="label" style={{ color: colors.text }}>
              Plain text or generic JSON
            </Txt>
            <Txt variant="faint">
              Usernames and passwords will be imported.
            </Txt>
          </View>
        </View>
      )}

      {profileMatches ? (
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Txt variant="heading" style={{ fontSize: font.size.sm }}>
              Import ranks & GKits
            </Txt>
            <Txt variant="faint">Keep server ranks and kits if present</Txt>
          </View>
          <Switch
            value={importRanksGkits}
            onValueChange={onImportRanksGkitsChange}
            trackColor={{ false: colors.surfaceAlt, true: colors.primary }}
          />
        </View>
      ) : null}

      {/* Header with Search and Clear */}
      <View style={styles.previewHeader}>
        <Txt variant="label">
          Loaded Accounts ({entries.length})
        </Txt>
        <Pressable hitSlop={8} onPress={onReset}>
          <Txt variant="label" style={{ color: colors.danger }}>
            Clear
          </Txt>
        </Pressable>
      </View>

      {entries.length > 4 ? (
        <View style={styles.searchRow}>
          <Ionicons name="search" size={16} color={colors.textFaint} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search preview accounts"
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
      ) : null}

      <FlatList
        data={filteredEntries}
        keyExtractor={(item) => item.username}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        renderItem={({ item }) => (
          <AltImportPreviewRow
            entry={item}
            onUpdatePassword={updatePassword}
            onDelete={deleteEntry}
            canImportRanksGkits={profileMatches && importRanksGkits}
            onlineMode={onlineMode}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            title="No matching accounts"
            subtitle="Try a different search query."
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
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formatInfo: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: 4,
  },
  formatTitle: {
    color: colors.textMuted,
    fontWeight: '600',
  },
  formatCode: {
    color: colors.textFaint,
    fontFamily: process.env.EXPO_OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: font.size.xs,
  },
  buttonStack: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  pasteContainer: {
    gap: spacing.sm,
  },
  pasteInput: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.md,
    padding: spacing.md,
    color: colors.text,
    fontSize: font.size.caption,
    minHeight: 120,
    textAlignVertical: 'top',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  pasteActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  bannerSuccess: {
    backgroundColor: colors.successSoft,
    borderColor: colors.success,
  },
  bannerWarning: {
    backgroundColor: colors.warningSoft,
    borderColor: colors.warning,
  },
  bannerInfo: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
  },
  searchRow: {
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
  listContent: {
    paddingBottom: spacing.xxl,
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
