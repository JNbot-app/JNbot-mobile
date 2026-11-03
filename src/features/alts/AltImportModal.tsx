import React, { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button, IconButton, Txt } from '../../components/ui';
import { colors, font, radii, spacing } from '../../theme/theme';
import { useStore } from '../../store/store';
import { useFeedback } from '../../components/AppFeedback';
import type { useClient } from '../../net/ConnectionProvider';
import type { AltWithData } from '../../store/types';
import type { ImportEntry, ImportTabMode } from './importTypes';
import { accountAuthenticationError, isOnlineMode } from '../serverAuthentication';
import { FileImportTab } from './FileImportTab';
import { ProfileImportTab } from './ProfileImportTab';
import { SharedImportTab } from './SharedImportTab';

interface Props {
  visible: boolean;
  currentAlts: AltWithData[];
  client: ReturnType<typeof useClient>;
  onClose: () => void;
}

export function AltImportModal({
  visible,
  currentAlts,
  client,
  onClose,
}: Props) {
  const { showMessage } = useFeedback();
  const profiles = useStore((s) => s.profiles);
  const activeProfileKey = useStore((s) => s.activeProfileKey);
  const sharedAlts = useStore((s) => s.sharedAlts);
  const jndata = useStore((s) => s.JNdata);
  const onlineMode = isOnlineMode(jndata?.data?.[activeProfileKey ?? '']);

  const [mode, setMode] = useState<ImportTabMode>('file');
  const [submitting, setSubmitting] = useState(false);

  // File state
  const [fileEntries, setFileEntries] = useState<ImportEntry[]>([]);
  const [sourceProfileId, setSourceProfileId] = useState<string | null>(null);
  const [importRanksGkits, setImportRanksGkits] = useState(true);

  // Profile state
  const [selectedUsernames, setSelectedUsernames] = useState<Set<string>>(
    new Set(),
  );
  const [profileSourceKey, setProfileSourceKey] = useState<string | null>(null);
  const [profileSourceAlts, setProfileSourceAlts] = useState<AltWithData[]>([]);

  // Shared state
  const [sharedEntries, setSharedEntries] = useState<ImportEntry[]>([]);
  const [sharedSelectedUsernames, setSharedSelectedUsernames] = useState<string[]>([]);

  const resetAll = () => {
    setFileEntries([]);
    setSourceProfileId(null);
    setImportRanksGkits(true);
    setSelectedUsernames(new Set());
    setProfileSourceKey(null);
    setProfileSourceAlts([]);
    setSharedEntries([]);
    setSharedSelectedUsernames([]);
    setMode('file');
  };

  const handleClose = () => {
    resetAll();
    onClose();
  };

  const unconfiguredSharedCount = useMemo(() => {
    const inProfile = new Set(
      currentAlts.map((a) => a.username.toLowerCase()),
    );
    return sharedAlts.filter((a) => !inProfile.has(a.username.toLowerCase()))
      .length;
  }, [sharedAlts, currentAlts]);

  const profileMatches =
    sourceProfileId !== null &&
    activeProfileKey !== null &&
    sourceProfileId.toLowerCase() === activeProfileKey.toLowerCase();

  const pendingCount = useMemo(() => {
    if (mode === 'file') {
      return fileEntries.filter((e) => accountAuthenticationError(e, onlineMode) === null).length;
    }
    if (mode === 'profile') {
      return selectedUsernames.size;
    }
    if (mode === 'shared') {
      return sharedEntries.filter((e) => sharedSelectedUsernames.includes(e.username) && accountAuthenticationError(e, onlineMode) === null).length;
    }
    return 0;
  }, [mode, fileEntries, selectedUsernames, sharedEntries, sharedSelectedUsernames, onlineMode]);

  const handleSubmit = async () => {
    if (!client || pendingCount === 0 || submitting) return;
    setSubmitting(true);

    try {
      if (mode === 'file') {
        const valid = fileEntries.filter((e) => accountAuthenticationError(e, onlineMode) === null);
        const result = await client.importAltEntries(
          valid,
          profileMatches && importRanksGkits,
        );
        const parts = [`${result.added} added`, `${result.updated} updated`];
        handleClose();
        showMessage(`Import complete: ${parts.join(' · ')}`, 'success');
      } else if (mode === 'profile') {
        if (!profileSourceKey) return;
        const result = await client.importAltsFromProfile(profileSourceKey, [
          ...selectedUsernames,
        ]);
        const parts = [`${result.added} added`, `${result.updated} updated`];
        if (result.skipped.length)
          parts.push(`${result.skipped.length} skipped`);
        handleClose();
        showMessage(`Import complete: ${parts.join(' · ')}`, 'success');
      } else if (mode === 'shared') {
        const valid = sharedEntries.filter((e) => sharedSelectedUsernames.includes(e.username) && accountAuthenticationError(e, onlineMode) === null);
        const result = await client.importAltEntries(valid, false);
        const parts = [`${result.added} added`, `${result.updated} updated`];
        handleClose();
        showMessage(`Import complete: ${parts.join(' · ')}`, 'success');
      }
    } catch (cause) {
      Alert.alert(
        'Import failed',
        cause instanceof Error ? cause.message : 'Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const activeProfileMeta = profiles.find((p) => p.id === activeProfileKey);
  const activeProfileName =
    activeProfileMeta?.shortName ||
    activeProfileMeta?.name ||
    activeProfileKey ||
    'Active Profile';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          {/* Header */}
          <View style={styles.header}>
            <IconButton
              accessibilityLabel="Close import"
              bg="transparent"
              size={36}
              onPress={handleClose}
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </IconButton>

            <View style={styles.headerTitleWrap}>
              <Txt variant="heading">Import accounts</Txt>
              <Txt variant="faint" numberOfLines={1}>
                Target profile: {activeProfileName}
              </Txt>
            </View>
          </View>

          {/* Segmented Control Tabs */}
          <View style={styles.tabsWrap}>
            <View accessibilityRole="tablist" style={styles.tabs}>
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: mode === 'file' }}
                onPress={() => setMode('file')}
                style={[styles.tab, mode === 'file' && styles.tabActive]}
              >
                <Ionicons
                  name="document-text-outline"
                  size={15}
                  color={mode === 'file' ? colors.text : colors.textMuted}
                />
                <Txt
                  variant="label"
                  style={[
                    styles.tabLabel,
                    mode === 'file' && styles.tabLabelActive,
                  ]}
                >
                  From file
                </Txt>
              </Pressable>

              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: mode === 'profile' }}
                onPress={() => setMode('profile')}
                style={[styles.tab, mode === 'profile' && styles.tabActive]}
              >
                <Ionicons
                  name="swap-horizontal-outline"
                  size={15}
                  color={mode === 'profile' ? colors.text : colors.textMuted}
                />
                <Txt
                  variant="label"
                  style={[
                    styles.tabLabel,
                    mode === 'profile' && styles.tabLabelActive,
                  ]}
                >
                  From profile
                </Txt>
              </Pressable>

              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: mode === 'shared' }}
                onPress={() => setMode('shared')}
                style={[styles.tab, mode === 'shared' && styles.tabActive]}
              >
                <Ionicons
                  name="people-outline"
                  size={15}
                  color={mode === 'shared' ? colors.text : colors.textMuted}
                />
                <Txt
                  variant="label"
                  style={[
                    styles.tabLabel,
                    mode === 'shared' && styles.tabLabelActive,
                  ]}
                >
                  Existing
                </Txt>
                {unconfiguredSharedCount > 0 ? (
                  <View style={styles.tabBadge}>
                    <Txt variant="faint" style={styles.tabBadgeText}>
                      {unconfiguredSharedCount}
                    </Txt>
                  </View>
                ) : null}
              </Pressable>
            </View>
          </View>

          {/* Tab Content */}
          <View style={styles.contentWrap}>
            {mode === 'file' ? (
              <FileImportTab
                activeProfileKey={activeProfileKey}
                onlineMode={onlineMode}
                allProfiles={profiles}
                entries={fileEntries}
                sourceProfileId={sourceProfileId}
                importRanksGkits={importRanksGkits}
                onEntriesChange={setFileEntries}
                onSourceProfileIdChange={setSourceProfileId}
                onImportRanksGkitsChange={setImportRanksGkits}
                onReset={() => {
                  setFileEntries([]);
                  setSourceProfileId(null);
                }}
              />
            ) : mode === 'profile' ? (
              <ProfileImportTab
                client={client}
                allProfiles={profiles}
                activeProfileKey={activeProfileKey}
                currentAlts={currentAlts}
                selectedUsernames={selectedUsernames}
                onSelectedUsernamesChange={setSelectedUsernames}
                sourceKey={profileSourceKey}
                onSourceKeyChange={setProfileSourceKey}
                sourceAlts={profileSourceAlts}
                onSourceAltsChange={setProfileSourceAlts}
              />
            ) : (
              <SharedImportTab
                sharedAlts={sharedAlts}
                currentAlts={currentAlts}
                onlineMode={onlineMode}
                entries={sharedEntries}
                selectedUsernames={sharedSelectedUsernames}
                onSelectionChange={setSharedSelectedUsernames}
                onEntriesChange={setSharedEntries}
              />
            )}
          </View>

          {/* Sticky Bottom Actions */}
          {pendingCount > 0 ? (
            <View style={styles.bottomBar}>
              <Button
                title={`Add ${pendingCount} Account${pendingCount !== 1 ? 's' : ''}`}
                loading={submitting}
                disabled={pendingCount === 0 || submitting}
                full
                onPress={() => void handleSubmit()}
              />
            </View>
          ) : null}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerTitleWrap: {
    flex: 1,
    gap: 2,
  },
  tabsWrap: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    marginBottom: spacing.xs,
  },
  tabs: {
    flexDirection: 'row',
    gap: 3,
    padding: 3,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceAlt,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: radii.sm,
  },
  tabActive: {
    backgroundColor: colors.surfaceHover,
  },
  tabLabel: {
    fontSize: font.size.caption,
    color: colors.textMuted,
  },
  tabLabelActive: {
    color: colors.text,
    fontWeight: '600',
  },
  tabBadge: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: radii.pill,
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },
  contentWrap: {
    flex: 1,
  },
  bottomBar: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSubtle,
    backgroundColor: colors.bg,
  },
});
