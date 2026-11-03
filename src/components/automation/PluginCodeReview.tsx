import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useClient, useConnection } from '../../net/ConnectionProvider';
import type { JNbotClient } from '../../client/JNbotClient';
import type { MacroInfo } from '../../store/types';
import { CODE_EDIT_LIMIT } from '../../features/plugins/code/highlight';
import { colors, spacing } from '../../theme/theme';
import { Button, Txt } from '../ui';
import { NativeIcon } from '../NativeIcon';
import { PluginCodeLines, codeTextStyle } from './PluginCodeLines';

type Source = Awaited<ReturnType<JNbotClient['getPluginCode']>>;

export function PluginCodeReviewButton({
  plugin,
  open: controlledOpen,
  onOpenChange,
  compact = false,
}: {
  plugin: MacroInfo;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const isOpen = controlledOpen ?? open;
  const setIsOpen = (next: boolean) => {
    setOpen(next);
    onOpenChange?.(next);
  };
  return (
    <>
      <Button
        title="Review code"
        variant="secondary"
        full={!compact}
        small={compact}
        style={compact ? styles.compactAction : undefined}
        onPress={() => setIsOpen(true)}
      />
      {isOpen && <PluginCodeReview plugin={plugin} onClose={() => setIsOpen(false)} />}
    </>
  );
}

function PluginCodeReview({ plugin, onClose }: { plugin: MacroInfo; onClose: () => void }) {
  const connectedClient = useClient();
  // Keep the draft tied to the runtime it was loaded from across connection changes.
  const [client] = useState(connectedClient);
  const { mode } = useConnection();
  const insets = useSafeAreaInsets();
  const [source, setSource] = useState<Source | null>(null);
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const dirty = source !== null && draft !== source.code;

  useEffect(() => {
    let active = true;
    setSource(null);
    setError(null);
    if (!client) {
      setError('Connect to a runtime to review code.');
      return;
    }
    void client.getPluginCode(plugin.pluginId).then((result) => {
      if (!active) return;
      setSource(result);
      setDraft(result.code);
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : 'Could not load plugin code.');
    });
    return () => { active = false; };
  }, [client, plugin.pluginId, attempt]);

  const discard = (next: () => void) => {
    if (saving) return;
    if (!dirty) return next();
    Alert.alert('Discard changes?', 'Your code edits have not been saved.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: next },
    ]);
  };
  const save = async () => {
    if (!source || saving || !dirty) return;
    if (!client || connectedClient !== client) {
      setError('Reconnect before saving. Your edits are still here.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await client.savePluginCode(plugin.pluginId, draft, source.revision);
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save. Your edits are still here.');
    } finally {
      setSaving(false);
    }
  };
  const large = source !== null && source.code.length > CODE_EDIT_LIMIT;
  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={() => discard(onClose)}>
      <SafeAreaView style={styles.screen} edges={['left', 'right', 'bottom']}>
        <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.toolbar, { paddingTop: Math.max(spacing.sm, insets.top) }]}>
            <Button title={editing ? 'Cancel' : 'Close'} variant="ghost" disabled={saving} onPress={() => discard(onClose)} />
            <View style={styles.heading}>
              <View style={styles.titleLine}>
                <Txt numberOfLines={1} style={styles.title}>{plugin.name}</Txt>

              </View>
              <Txt variant="muted">{editing ? (dirty ? 'Unsaved changes' : 'Edit code') : 'Review code'}</Txt>
            </View>
            {source && !editing && mode === 'local' && !large && (
              <Button title="Edit" variant="ghost" onPress={() => setEditing(true)} />
            )}
            {editing && <Button title="Save" disabled={!dirty} loading={saving} onPress={() => void save()} />}
          </View>
          {error && (
            <View style={styles.notice}>
              <Txt style={styles.error} accessibilityRole="alert">{error}</Txt>
              {!source && <Button title="Retry" variant="secondary" onPress={() => setAttempt((value) => value + 1)} />}
            </View>
          )}
          {!source && !error && <ActivityIndicator accessibilityLabel="Loading code" color={colors.primary} style={styles.loading} />}
          {source && (
            <>
              {mode !== 'local' && <Txt variant="muted" style={styles.notice}>Read-only. Edit this plugin on the desktop.</Txt>}
              {large && <Txt variant="muted" style={styles.notice}>Large file: plain-text review only to keep the phone responsive.</Txt>}
              {editing ? (
                <>
                  <TextInput
                    accessibilityLabel="Plugin source code"
                    value={draft}
                    onChangeText={setDraft}
                    editable={!saving}
                    multiline
                    maxLength={CODE_EDIT_LIMIT}
                    autoFocus
                    autoCapitalize="none"
                    autoCorrect={false}
                    spellCheck={false}
                    smartInsertDelete={false}
                    keyboardType={Platform.OS === 'ios' ? 'ascii-capable' : 'default'}
                    textAlignVertical="top"
                    selectionColor={colors.primary}
                    style={styles.editor}
                  />
                </>
              ) : <PluginCodeLines code={source.code} language={source.language} />}
            </>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  toolbar: { flexDirection: 'row', alignItems: 'center', padding: spacing.sm, gap: spacing.sm },
  heading: { flex: 1, minWidth: 0 },
  titleLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minWidth: 0 },
  title: { flex: 1, minWidth: 0 },
  notice: { padding: spacing.lg, gap: spacing.sm },
  error: { color: colors.danger },
  loading: { flex: 1 },
  editor: { ...codeTextStyle, flex: 1, padding: spacing.lg, backgroundColor: colors.bgElevated },
  compactAction: { flex: 1 },
});
